# Guía: Cómo construir un chatbot de WhatsApp con Flask + Evolution API + PostgreSQL

> Tutorial replicable paso a paso para crear un bot de WhatsApp con flujos guiados, persistencia de sesiones, idempotencia, y exposición pública vía Cloudflare Tunnel.
>
> Está basado en el patrón usado en producción por `bot-cobros-caoba` y ha sido abstraído para que cualquier proyecto pueda partir de aquí.

---

## 1. Introducción

### Qué resuelve este patrón

- **Bot conversacional con flujos guiados** sobre WhatsApp (menús, pasos, validaciones).
- **Persistencia de la sesión** (estado por contacto) en una base relacional.
- **Idempotencia** ante reintentos del proveedor de WhatsApp.
- **Recepción de imágenes** y otros medios con descarga controlada.
- **Despliegue reproducible** con `docker compose up` y exposición a internet vía Cloudflare Tunnel — sin abrir puertos.
- **Extensiones opcionales**: OCR de imágenes con OpenAI, FAQ con matching semántico, escalación a operador humano, generación de PDFs.

### Qué NO resuelve

- Bots multi-canal (Telegram + WhatsApp + Web). Aquí solo WhatsApp.
- Federación o multi-tenant (un bot = una instancia de Evolution).
- Lógica de inventario, pagos online, o autenticación de usuarios finales.

### Stack mínimo

| Componente | Versión sugerida | Rol |
|---|---|---|
| Python | 3.12+ | Lenguaje |
| Flask | 3.x | HTTP server |
| gunicorn | 23.x | WSGI en producción |
| psycopg | 3.2+ (`psycopg-pool`) | Cliente PostgreSQL |
| PostgreSQL | 14+ | Persistencia |
| Evolution API | última estable | Bridge a WhatsApp |
| Cloudflare Tunnel | `cloudflared` | Exposición pública sin abrir puertos |
| OpenAI API | opcional | OCR / FAQ semántico |
| Docker + Compose | recientes | Orquestación local y producción |

---

## 2. Prerrequisitos

Antes de empezar:

1. **Una instancia de Evolution API** corriendo (autohospedada). Si no la tenés, instalá `evolution-api/evolution-api` y conectá un número de WhatsApp Business.
2. **Servidor con Docker** (≥ 1 vCPU, 2 GB RAM, 10 GB disco).
3. **Dominio gestionado por Cloudflare** y un *Tunnel* creado (con `cloudflared tunnel create`). Necesitarás el `credentials.json` y un `config.yml`.
4. **API key de OpenAI** (solo si vas a usar OCR o FAQ).
5. **Acceso a un PostgreSQL 14+** (puede correr en el mismo Compose).

---

## 3. Arquitectura en 1 minuto

```
WhatsApp ─► Evolution API ─► Cloudflare Tunnel ─► Flask /bot
                                                      │
                                                      ▼
                                           _normalize_payload()
                                                      │
                                                      ▼
                                       BotService.handle_payload()
                                                      │
                              ┌───────────────────────┼───────────────────────┐
                              ▼                       ▼                       ▼
                  claim_inbound_message      load_or_create_session     dispatch by state
                       (idempotencia)          (state machine)          (handler por estado)
                              │                       │                       │
                              └───────────────────────┴───────────────────────┘
                                                      │
                                                      ▼
                                          EvolutionClient.send_*()
                                                      │
                                                      ▼
                                                  WhatsApp
```

**Por qué cada pieza**:

- **Evolution API** abstrae el protocolo de WhatsApp. Habla HTTP/JSON. Ideal porque te libera del WhatsApp Business API oficial (caro, lento de aprobar).
- **Cloudflare Tunnel** expone tu servidor sin firewall ni IP pública. Más simple y seguro que abrir puertos o usar ngrok.
- **Flask + gunicorn** es suficiente: el bot es I/O bound (ratos esperando WhatsApp y la BD), no CPU bound.
- **PostgreSQL** es obligatorio: necesitamos transacciones para idempotencia y `ON CONFLICT` para deduplicación.

---

## 4. Estructura de directorios recomendada

```
mi-bot/
├── app.py                  # entry point dev
├── wsgi.py                 # entry point gunicorn
├── bot_base/
│   ├── __init__.py         # exporta create_app
│   ├── config.py           # Settings dataclass (lee env vars)
│   ├── app_factory.py      # create_app() + _normalize_payload
│   ├── service.py          # BotService (state machine)
│   ├── store.py            # SessionStore (Postgres)
│   ├── evolution.py        # EvolutionClient (cliente HTTP)
│   └── faq.py              # opcional
├── sql/migrations/postgres/
│   ├── 000_schemas.sql
│   └── 010_bot_runtime.sql
├── scripts/
│   ├── migrate_postgres.py           # aplica migraciones SQL en orden
│   └── register_bot_when_ready.py    # registra el webhook en Evolution
├── cloudflared/
│   ├── config.yml
│   └── credentials.json    # NO commitear
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── .env.example
└── .gitignore
```

---

## 5. Paso 1 — Configuración (`bot_base/config.py`)

Centralizá toda la lectura de variables de entorno en un `dataclass(frozen=True)`. Esto te da: tipado, valores por defecto, e inmutabilidad en runtime.

```python
# bot_base/config.py
import os
from dataclasses import dataclass
from typing import Optional


def _env(name: str, default: Optional[str] = None) -> Optional[str]:
    val = os.environ.get(name)
    return val if val is not None and val != "" else default


def _env_int(name: str, default: int) -> int:
    raw = _env(name)
    return int(raw) if raw is not None else default


@dataclass(frozen=True)
class Settings:
    # Evolution
    evolution_base_url: str
    evolution_instance: str
    evolution_apikey: str

    # PostgreSQL
    postgres_dsn: str

    # Bot
    public_url: str                 # ej: https://mi-bot.midominio.com
    trigger_keyword: str            # ej: "hola"
    expire_minutes: int             # 20
    webhook_secret: Optional[str]   # opcional

    # Media
    incoming_media_dir: str
    max_media_bytes: int
    allowed_media_hosts: tuple[str, ...]

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            evolution_base_url=_env("EVOLUTION_BASE_URL", "").rstrip("/"),
            evolution_instance=_env("EVOLUTION_INSTANCE", ""),
            evolution_apikey=_env("EVOLUTION_APIKEY", ""),
            postgres_dsn=_env("POSTGRES_DSN", ""),
            public_url=_env("BOT_PUBLIC_URL", "").rstrip("/"),
            trigger_keyword=_env("BOT_TRIGGER_KEYWORD", "hola"),
            expire_minutes=_env_int("BOT_EXPIRE_MINUTES", 20),
            webhook_secret=_env("BOT_WEBHOOK_SECRET"),
            incoming_media_dir=_env("BOT_INCOMING_MEDIA_DIR", "data/incoming_media"),
            max_media_bytes=_env_int("BOT_MAX_MEDIA_BYTES", 8 * 1024 * 1024),
            allowed_media_hosts=tuple(
                h.strip() for h in _env(
                    "BOT_ALLOWED_MEDIA_HOSTS",
                    "mmg.whatsapp.net,lookaside.whatsapp.com,lookaside.fbsbx.com",
                ).split(",") if h.strip()
            ),
        )
```

### Variables de entorno mínimas

| Variable | Obligatoria | Ejemplo / default | Descripción |
|---|---|---|---|
| `EVOLUTION_BASE_URL` | Sí | `https://evo.midominio.com` | URL pública de tu Evolution |
| `EVOLUTION_INSTANCE` | Sí | `mi-bot-prod` | Nombre de la instancia en Evolution |
| `EVOLUTION_APIKEY` | Sí | `xxxx` | API key de la instancia |
| `POSTGRES_DSN` | Sí | `postgresql://user:pwd@host:5432/db` | Cadena de conexión |
| `BOT_PUBLIC_URL` | Sí | `https://mi-bot.midominio.com` | URL pública del bot (sirve para que Evolution registre el webhook) |
| `BOT_TRIGGER_KEYWORD` | No | `hola` | Mensaje que arranca una sesión |
| `BOT_EXPIRE_MINUTES` | No | `20` | Sesión expira tras inactividad |
| `BOT_WEBHOOK_SECRET` | No | `abc123` | Si se define, validás un campo `_webhook_secret` en cada request |
| `BOT_OPENAI_API_KEY` | No | `sk-...` | Solo si usás OCR/FAQ |

### Patrón "tres schemas en una BD"

Si tu bot maneja datos de negocio (clientes, productos, etc.) además del estado del bot, conviene separar en tres schemas dentro de la misma BD:

- `bot_runtime` — estado del bot (`conversation_sessions`, `inbound_messages`).
- `mi_dominio` — tablas del negocio.
- `admin_auth` — usuarios del panel de administración.

Es opcional. Si tu bot es muy simple, un solo schema (`public`) está bien.

---

## 6. Paso 2 — Esquema de PostgreSQL

### `sql/migrations/postgres/000_schemas.sql`

```sql
CREATE SCHEMA IF NOT EXISTS bot_runtime;
```

### `sql/migrations/postgres/010_bot_runtime.sql`

```sql
-- Estado de cada conversación (1 fila por contacto)
CREATE TABLE IF NOT EXISTS bot_runtime.conversation_sessions (
    remote_jid    TEXT PRIMARY KEY,
    state         TEXT NOT NULL,
    context_json  JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Cada mensaje entrante deduplicado
CREATE TABLE IF NOT EXISTS bot_runtime.inbound_messages (
    id                BIGSERIAL PRIMARY KEY,
    remote_jid        TEXT NOT NULL,
    message_id        TEXT,
    message_type      TEXT,
    text_content      TEXT,
    media_url         TEXT,
    state_at_claim    TEXT,
    processing_status TEXT NOT NULL DEFAULT 'received',
    is_idempotent     BOOLEAN NOT NULL DEFAULT TRUE,
    payload_json      JSONB,
    received_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Idempotencia fuerte: nunca dos veces el mismo (jid, message_id)
CREATE UNIQUE INDEX IF NOT EXISTS ux_inbound_messages_jid_msgid
    ON bot_runtime.inbound_messages (remote_jid, message_id)
    WHERE message_id IS NOT NULL;

-- Acelera el fallback "messageless dedupe" (ver paso 3)
CREATE INDEX IF NOT EXISTS ix_inbound_messages_jid_received
    ON bot_runtime.inbound_messages (remote_jid, received_at DESC);
```

### `scripts/migrate_postgres.py`

Aplica todos los `*.sql` en orden alfabético, dentro de una transacción por archivo:

```python
#!/usr/bin/env python3
import argparse, os, sys
from pathlib import Path
import psycopg

MIGRATIONS_DIR = Path(__file__).parent.parent / "sql" / "migrations" / "postgres"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dsn", default=os.environ.get("POSTGRES_DSN"))
    parser.add_argument("--allow-missing-dsn", action="store_true")
    args = parser.parse_args()

    if not args.dsn:
        if args.allow_missing_dsn:
            print("POSTGRES_DSN no definido — saltando migraciones")
            return 0
        print("ERROR: POSTGRES_DSN requerido", file=sys.stderr)
        return 1

    files = sorted(MIGRATIONS_DIR.glob("*.sql"))
    with psycopg.connect(args.dsn, autocommit=False) as conn:
        for path in files:
            sql = path.read_text(encoding="utf-8")
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
            print(f"  ok  {path.name}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

> **Nota**: para algo más robusto en producción usá [`yoyo-migrations`](https://ollycope.com/software/yoyo/) o `alembic`. Este script simple es suficiente para arrancar.

---

## 7. Paso 3 — `SessionStore` (`bot_base/store.py`)

El núcleo de la idempotencia. Dos métodos importantes:

```python
# bot_base/store.py
import json
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Optional

import psycopg
from psycopg_pool import ConnectionPool


# Estados del bot — definir los que necesite tu flujo
class State:
    AWAITING_SELECTION   = "AWAITING_SELECTION"
    AWAITING_NAME        = "AWAITING_NAME"
    AWAITING_CONFIRM     = "AWAITING_CONFIRM"
    DONE                 = "DONE"


MESSAGELESS_DEDUPE_WINDOW_SECONDS = 15


@dataclass
class Session:
    remote_jid: str
    state: str
    context: dict
    updated_at: datetime


@dataclass
class ClaimResult:
    is_duplicate: bool
    inbound_id: Optional[int]


class SessionStore:
    def __init__(self, dsn: str, expire_minutes: int = 20):
        self._pool = ConnectionPool(dsn, min_size=1, max_size=8, kwargs={"autocommit": False})
        self._expire = timedelta(minutes=expire_minutes)

    # ---------- idempotencia ----------
    def claim_inbound_message(
        self,
        remote_jid: str,
        message_id: Optional[str],
        message_type: str,
        text_content: Optional[str],
        state_at_claim: Optional[str],
        payload: dict,
    ) -> ClaimResult:
        """Reclama un mensaje. Si es duplicado, no lo procesamos."""
        with self._pool.connection() as conn, conn.cursor() as cur:
            if message_id:
                # Estrategia 1 — UNIQUE constraint
                cur.execute(
                    """
                    INSERT INTO bot_runtime.inbound_messages
                        (remote_jid, message_id, message_type, text_content,
                         state_at_claim, payload_json)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (remote_jid, message_id) DO NOTHING
                    RETURNING id
                    """,
                    (remote_jid, message_id, message_type, text_content,
                     state_at_claim, json.dumps(payload)),
                )
                row = cur.fetchone()
                conn.commit()
                if row is None:
                    return ClaimResult(is_duplicate=True, inbound_id=None)
                return ClaimResult(is_duplicate=False, inbound_id=row[0])

            # Estrategia 2 — fallback de ventana 15 s
            cutoff = datetime.now(tz=timezone.utc) - timedelta(seconds=MESSAGELESS_DEDUPE_WINDOW_SECONDS)
            cur.execute(
                """
                SELECT id FROM bot_runtime.inbound_messages
                WHERE remote_jid = %s
                  AND message_type = %s
                  AND COALESCE(text_content, '') = COALESCE(%s, '')
                  AND state_at_claim IS NOT DISTINCT FROM %s
                  AND received_at >= %s
                LIMIT 1
                """,
                (remote_jid, message_type, text_content, state_at_claim, cutoff),
            )
            existing = cur.fetchone()
            if existing:
                conn.commit()
                return ClaimResult(is_duplicate=True, inbound_id=None)

            cur.execute(
                """
                INSERT INTO bot_runtime.inbound_messages
                    (remote_jid, message_id, message_type, text_content,
                     state_at_claim, payload_json, is_idempotent)
                VALUES (%s, NULL, %s, %s, %s, %s, FALSE)
                RETURNING id
                """,
                (remote_jid, message_type, text_content, state_at_claim, json.dumps(payload)),
            )
            new_id = cur.fetchone()[0]
            conn.commit()
            return ClaimResult(is_duplicate=False, inbound_id=new_id)

    # ---------- sesión ----------
    def read_session(self, remote_jid: str) -> Optional[Session]:
        with self._pool.connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT state, context_json, updated_at
                FROM bot_runtime.conversation_sessions
                WHERE remote_jid = %s
                """,
                (remote_jid,),
            )
            row = cur.fetchone()
            if not row:
                return None
            state, ctx, updated = row
            if updated <= datetime.now(tz=timezone.utc) - self._expire:
                cur.execute(
                    "DELETE FROM bot_runtime.conversation_sessions WHERE remote_jid = %s",
                    (remote_jid,),
                )
                conn.commit()
                return None
            return Session(remote_jid=remote_jid, state=state, context=ctx or {}, updated_at=updated)

    def write_session(self, session: Session) -> None:
        with self._pool.connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO bot_runtime.conversation_sessions (remote_jid, state, context_json, updated_at)
                VALUES (%s, %s, %s, now())
                ON CONFLICT (remote_jid)
                DO UPDATE SET state = EXCLUDED.state,
                              context_json = EXCLUDED.context_json,
                              updated_at = now()
                """,
                (session.remote_jid, session.state, json.dumps(session.context)),
            )
            conn.commit()

    def close_session(self, remote_jid: str) -> None:
        with self._pool.connection() as conn, conn.cursor() as cur:
            cur.execute(
                "DELETE FROM bot_runtime.conversation_sessions WHERE remote_jid = %s",
                (remote_jid,),
            )
            conn.commit()
```

**Por qué dos estrategias de deduplicación**: Evolution a veces no incluye `message_id` (por ejemplo, mensajes entrantes de bot mode). En ese caso recurrimos a una ventana corta (15 s) sobre `(jid, type, text, state)`. No es perfecta — un humano podría enviar exactamente el mismo texto dos veces en 15 s y se descarta el segundo — pero en la práctica funciona bien y es preferible al riesgo de doble procesamiento.

---

## 8. Paso 4 — Cliente de Evolution (`bot_base/evolution.py`)

```python
# bot_base/evolution.py
import time
from typing import Any, Optional
import requests


class EvolutionClient:
    def __init__(self, base_url: str, instance: str, apikey: str, timeout: float = 15.0):
        self._base = base_url.rstrip("/")
        self._instance = instance
        self._timeout = timeout
        self._session = requests.Session()
        self._session.headers.update({
            "apikey": apikey,
            "Content-Type": "application/json",
        })

    # --------- envío ---------
    def send_text(self, remote_jid: str, text: str) -> dict:
        url = f"{self._base}/message/sendText/{self._instance}"
        body = {"number": remote_jid, "text": text}
        return self._post(url, body)

    def send_media(self, remote_jid: str, file_path: str, caption: str = "") -> dict:
        import base64, mimetypes
        url = f"{self._base}/message/sendMedia/{self._instance}"
        with open(file_path, "rb") as fh:
            content = base64.b64encode(fh.read()).decode("ascii")
        mime, _ = mimetypes.guess_type(file_path)
        body = {
            "number": remote_jid,
            "mediatype": "document",
            "mimetype": mime or "application/octet-stream",
            "caption": caption,
            "media": content,
            "fileName": file_path.rsplit("/", 1)[-1],
        }
        return self._post(url, body)

    # --------- descarga de imágenes recibidas ---------
    def download_media_base64(self, message_id: str) -> Optional[str]:
        url = f"{self._base}/chat/getBase64FromMediaMessage/{self._instance}"
        body = {"message": {"key": {"id": message_id}}, "convertToMp4": False}
        response = self._post(url, body)
        return response.get("base64")

    # --------- cierre de sesión en Evolution ---------
    def change_status(self, remote_jid: str, status: str) -> dict:
        """status='delete' termina y limpia. NO usar 'closed'."""
        url = f"{self._base}/evolutionBot/changeStatus/{self._instance}"
        return self._post(url, {"remoteJid": remote_jid, "status": status})

    def close_session(self, remote_jid: str) -> None:
        self.change_status(remote_jid, "delete")

    # --------- helper ---------
    def _post(self, url: str, body: dict) -> dict:
        last_err: Optional[Exception] = None
        for attempt in range(3):
            try:
                resp = self._session.post(url, json=body, timeout=self._timeout)
                resp.raise_for_status()
                return resp.json() if resp.content else {}
            except requests.RequestException as exc:
                last_err = exc
                time.sleep(0.5 * (2 ** attempt))
        raise RuntimeError(f"Evolution API failed after retries: {last_err}")
```

> **Detalle crítico**: para terminar una sesión usá `change_status(status="delete")`, **no** `"closed"`. Evolution interpreta `"closed"` como "marcada cerrada pero aún registrada", lo que deja la sesión bloqueada en su lado. `"delete"` la limpia por completo.

---

## 9. Paso 5 — `BotService` y máquina de estados (`bot_base/service.py`)

```python
# bot_base/service.py
import logging
from typing import Optional

from .config import Settings
from .store import SessionStore, Session, State
from .evolution import EvolutionClient

log = logging.getLogger(__name__)


class BotService:
    def __init__(
        self,
        settings: Settings,
        session_store: SessionStore,
        evolution_client: EvolutionClient,
    ):
        self._settings = settings
        self._store = session_store
        self._evo = evolution_client

    # ----- entrada -----
    def handle_payload(self, payload: dict) -> dict:
        # 1. Validación de origen
        if not self._validate_origin(payload):
            return {"status": "rejected", "reason": "origin"}

        remote_jid = payload.get("remoteJid")
        message_id = payload.get("messageId")
        text       = (payload.get("text") or "").strip()
        msg_type   = payload.get("messageType", "text")

        if not remote_jid:
            return {"status": "rejected", "reason": "missing remoteJid"}

        # 2. Idempotencia
        existing = self._store.read_session(remote_jid)
        state_at_claim = existing.state if existing else None
        claim = self._store.claim_inbound_message(
            remote_jid, message_id, msg_type, text, state_at_claim, payload,
        )
        if claim.is_duplicate:
            log.info("duplicate inbound for %s — ignored", remote_jid)
            return {"status": "duplicate"}

        # 3. Inicio por trigger
        if existing is None:
            if text.lower() != self._settings.trigger_keyword.lower():
                return {"status": "ignored_no_trigger"}
            existing = Session(
                remote_jid=remote_jid,
                state=State.AWAITING_SELECTION,
                context={},
                updated_at=None,  # write_session pone now()
            )
            self._store.write_session(existing)
            self._evo.send_text(remote_jid, self._render_menu())
            return {"status": "started"}

        # 4. Despacho por estado
        handler = self._dispatch.get(existing.state)
        if not handler:
            log.warning("estado desconocido %s — reseteando", existing.state)
            self._store.close_session(remote_jid)
            return {"status": "reset"}
        return handler(self, existing, text, payload)

    # ----- validación de origen -----
    def _validate_origin(self, payload: dict) -> bool:
        if payload.get("instanceName") != self._settings.evolution_instance:
            return False
        if payload.get("apiKey") != self._settings.evolution_apikey:
            return False
        if payload.get("serverUrl", "").rstrip("/") != self._settings.evolution_base_url:
            return False
        if self._settings.webhook_secret:
            if payload.get("_webhook_secret") != self._settings.webhook_secret:
                return False
        return True

    # ----- handlers -----
    def _h_selection(self, sess: Session, text: str, payload: dict) -> dict:
        if text == "1":
            sess.state = State.AWAITING_NAME
            self._store.write_session(sess)
            self._evo.send_text(sess.remote_jid, "¿Cómo te llamás?")
            return {"status": "ok"}
        if text == "2":
            sess.state = State.DONE
            self._store.close_session(sess.remote_jid)
            self._evo.send_text(sess.remote_jid, "¡Hasta luego!")
            self._evo.close_session(sess.remote_jid)
            return {"status": "ok"}
        self._evo.send_text(sess.remote_jid, "Opción inválida.\n" + self._render_menu())
        return {"status": "ok"}

    def _h_name(self, sess: Session, text: str, payload: dict) -> dict:
        if not text:
            self._evo.send_text(sess.remote_jid, "Escribe tu nombre por favor.")
            return {"status": "ok"}
        sess.context["name"] = text
        sess.state = State.AWAITING_CONFIRM
        self._store.write_session(sess)
        self._evo.send_text(sess.remote_jid, f"Hola {text}, ¿confirmás? (si/no)")
        return {"status": "ok"}

    def _h_confirm(self, sess: Session, text: str, payload: dict) -> dict:
        if text.lower() in {"si", "sí", "s"}:
            self._evo.send_text(sess.remote_jid, "¡Listo! Cerrando sesión.")
        else:
            self._evo.send_text(sess.remote_jid, "Sin problema, cerrando sesión.")
        self._store.close_session(sess.remote_jid)
        self._evo.close_session(sess.remote_jid)
        return {"status": "ok"}

    # tabla estado → handler
    _dispatch = {
        State.AWAITING_SELECTION: _h_selection,
        State.AWAITING_NAME:      _h_name,
        State.AWAITING_CONFIRM:   _h_confirm,
    }

    def _render_menu(self) -> str:
        return "Hola 👋\n1. Registrarme\n2. Salir"
```

**Tabla "estado → handler"** (lo central de la máquina de estados):

| Estado entrante | Handler | Siguiente estado típico |
|---|---|---|
| (ninguno) | trigger | `AWAITING_SELECTION` |
| `AWAITING_SELECTION` | `_h_selection` | `AWAITING_NAME` o cierre |
| `AWAITING_NAME` | `_h_name` | `AWAITING_CONFIRM` |
| `AWAITING_CONFIRM` | `_h_confirm` | cierre |

---

## 10. Paso 6 — Flask factory (`bot_base/app_factory.py`)

```python
# bot_base/app_factory.py
import json
import logging
from typing import Any
from flask import Flask, jsonify, request

from .config import Settings
from .evolution import EvolutionClient
from .service import BotService
from .store import SessionStore

log = logging.getLogger(__name__)


def _normalize_payload(raw: Any) -> dict:
    """Tolera los 3+ formatos que envía Evolution.

    1. Plano (bot mode):       {remoteJid, message, ...}
    2. Webhook v2:             {data: {key: {remoteJid}, message, ...}}
    3. inputs/files (agentes): {inputs: {remoteJid}, files: [...]}
    """
    if not isinstance(raw, dict):
        return {}

    # caso 2: webhook v2
    if "data" in raw and isinstance(raw["data"], dict):
        data = raw["data"]
        key = data.get("key", {}) if isinstance(data.get("key"), dict) else {}
        msg = data.get("message", {}) if isinstance(data.get("message"), dict) else {}
        return {
            "remoteJid":    key.get("remoteJid") or data.get("remoteJid"),
            "messageId":    key.get("id"),
            "fromMe":       key.get("fromMe", False),
            "text":         msg.get("conversation") or msg.get("extendedTextMessage", {}).get("text", ""),
            "messageType":  data.get("messageType", "text"),
            "instanceName": raw.get("instance") or raw.get("instanceName"),
            "apiKey":       raw.get("apikey") or raw.get("apiKey"),
            "serverUrl":    raw.get("server_url") or raw.get("serverUrl"),
            "_webhook_secret": raw.get("_webhook_secret"),
            "_raw": raw,
        }

    # caso 3: inputs/files
    if "inputs" in raw and isinstance(raw["inputs"], dict):
        inputs = raw["inputs"]
        return {
            "remoteJid":    inputs.get("remoteJid") or inputs.get("from"),
            "messageId":    inputs.get("messageId"),
            "fromMe":       False,
            "text":         inputs.get("text", ""),
            "messageType":  inputs.get("messageType", "text"),
            "instanceName": raw.get("instanceName"),
            "apiKey":       raw.get("apiKey"),
            "serverUrl":    raw.get("serverUrl"),
            "_webhook_secret": raw.get("_webhook_secret"),
            "_raw": raw,
        }

    # caso 1: plano
    return {
        "remoteJid":    raw.get("remoteJid") or raw.get("number"),
        "messageId":    raw.get("messageId"),
        "fromMe":       raw.get("fromMe", False),
        "text":         raw.get("text") or raw.get("message", ""),
        "messageType":  raw.get("messageType", "text"),
        "instanceName": raw.get("instanceName"),
        "apiKey":       raw.get("apiKey"),
        "serverUrl":    raw.get("serverUrl"),
        "_webhook_secret": raw.get("_webhook_secret"),
        "_raw": raw,
    }


def create_app() -> Flask:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

    settings = Settings.from_env()
    store    = SessionStore(settings.postgres_dsn, settings.expire_minutes)
    evo      = EvolutionClient(
        settings.evolution_base_url, settings.evolution_instance, settings.evolution_apikey,
    )
    service = BotService(settings, store, evo)

    app = Flask(__name__)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok", "instance": settings.evolution_instance})

    @app.post("/bot")
    def bot():
        try:
            raw = request.get_json(force=True, silent=True) or {}
        except Exception:
            return jsonify({"status": "rejected", "reason": "invalid_json"}), 400
        payload = _normalize_payload(raw)
        result = service.handle_payload(payload)
        status_code = 403 if result.get("reason") == "origin" else 200
        return jsonify(result), status_code

    return app
```

### `wsgi.py` y `app.py`

```python
# wsgi.py — usado por gunicorn
from bot_base.app_factory import create_app
app = create_app()
```

```python
# app.py — modo desarrollo
from bot_base.app_factory import create_app

if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5001, debug=True)
```

---

## 11. Paso 7 — Docker, Cloudflare y registro automático

### `Dockerfile`

```dockerfile
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN mkdir -p data/incoming_media

EXPOSE 5001
# CMD se inyecta desde docker-compose
```

### `requirements.txt`

```
Flask==3.1.0
gunicorn==23.0.0
psycopg[binary]==3.2.10
psycopg-pool==3.2.4
python-dotenv==1.0.1
requests==2.32.3
```

### `docker-compose.yml`

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-bot}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-bot_dev}
      POSTGRES_DB: ${POSTGRES_DB:-bot}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-bot}"]
      interval: 10s
      timeout: 5s
      retries: 5

  bot:
    build: .
    env_file: .env
    command: >
      sh -c "python scripts/migrate_postgres.py --allow-missing-dsn &&
             exec gunicorn --bind 0.0.0.0:5001 --workers 2 wsgi:app"
    depends_on:
      postgres: { condition: service_healthy }
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:5001/health || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 5
    volumes:
      - ./data:/app/data

  cloudflared:
    image: cloudflare/cloudflared:latest
    command: tunnel --config /etc/cloudflared/config.yml run
    volumes:
      - ./cloudflared/config.yml:/etc/cloudflared/config.yml:ro
      - ./cloudflared/credentials.json:/etc/cloudflared/credentials.json:ro
    depends_on:
      bot: { condition: service_healthy }
    restart: unless-stopped

  register-bot:
    build: .
    env_file: .env
    command: python scripts/register_bot_when_ready.py
    depends_on:
      bot:         { condition: service_healthy }
      cloudflared: { condition: service_started }
    restart: "no"

volumes:
  pgdata:
```

### `cloudflared/config.yml`

```yaml
tunnel: <TU-TUNNEL-ID>
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: mi-bot.midominio.com
    service: http://bot:5001
  - service: http_status:404
```

### `scripts/register_bot_when_ready.py`

Espera que el endpoint público responda y luego registra el webhook en Evolution:

```python
#!/usr/bin/env python3
import os, sys, time, json
import requests

PUBLIC_URL = os.environ["BOT_PUBLIC_URL"].rstrip("/")
BASE       = os.environ["EVOLUTION_BASE_URL"].rstrip("/")
INSTANCE   = os.environ["EVOLUTION_INSTANCE"]
APIKEY     = os.environ["EVOLUTION_APIKEY"]
WAIT_SECS  = int(os.environ.get("BOT_REGISTER_WAIT_SECONDS", "300"))

session = requests.Session()
session.headers.update({"apikey": APIKEY, "Content-Type": "application/json"})


def wait_health() -> bool:
    deadline = time.time() + WAIT_SECS
    while time.time() < deadline:
        try:
            r = requests.get(f"{PUBLIC_URL}/health", timeout=5)
            if r.ok and r.json().get("status") == "ok":
                return True
        except Exception:
            pass
        time.sleep(5)
    return False


def upsert_webhook() -> None:
    # Primero intentamos buscar bots ya registrados
    find_url = f"{BASE}/evolutionBot/find/{INSTANCE}"
    existing = session.get(find_url, timeout=10).json() or []
    body = {
        "enabled": True,
        "url": f"{PUBLIC_URL}/bot",
        "triggerType": "all",
        "expire": int(os.environ.get("BOT_EXPIRE_MINUTES", "20")),
        "keepOpen": False,
        "stopBotFromMe": True,
    }
    if isinstance(existing, list) and existing:
        bot_id = existing[0].get("id")
        url = f"{BASE}/evolutionBot/update/{bot_id}/{INSTANCE}"
        r = session.put(url, json=body, timeout=10)
    else:
        url = f"{BASE}/evolutionBot/create/{INSTANCE}"
        r = session.post(url, json=body, timeout=10)
    r.raise_for_status()
    print("Webhook registrado:", json.dumps(r.json(), indent=2)[:400])


if __name__ == "__main__":
    if not wait_health():
        print(f"Timeout esperando {PUBLIC_URL}/health", file=sys.stderr)
        sys.exit(1)
    upsert_webhook()
```

### `.env.example`

```env
EVOLUTION_BASE_URL=https://evo.midominio.com
EVOLUTION_INSTANCE=mi-bot-prod
EVOLUTION_APIKEY=cambiar
POSTGRES_DSN=postgresql://bot:bot_dev@postgres:5432/bot
POSTGRES_USER=bot
POSTGRES_PASSWORD=bot_dev
POSTGRES_DB=bot

BOT_PUBLIC_URL=https://mi-bot.midominio.com
BOT_TRIGGER_KEYWORD=hola
BOT_EXPIRE_MINUTES=20
BOT_WEBHOOK_SECRET=

# Opcional
BOT_OPENAI_API_KEY=
```

---

## 12. Paso 8 — Extensiones opcionales

Implementálas solo si las necesitás. Cada una agrega ~100–200 líneas.

### 12.1 OCR de imágenes con OpenAI

Patrón base:

1. Cuando llega un mensaje de tipo `image` en un estado donde lo esperás, descargá el base64 con `evolution_client.download_media_base64(message_id)`.
2. Guardalo en disco respetando `BOT_MAX_MEDIA_BYTES` (8 MB) y `BOT_ALLOWED_MEDIA_HOSTS` si la URL viene de WhatsApp CDN.
3. Llamá al endpoint `/v1/responses` de OpenAI con un **JSON schema estricto** y modelo `gpt-4o`:

```python
import requests, base64, json

def extract_with_strict_schema(image_path: str, api_key: str) -> dict:
    with open(image_path, "rb") as fh:
        b64 = base64.b64encode(fh.read()).decode("ascii")

    body = {
        "model": "gpt-4o",
        "input": [{
            "role": "user",
            "content": [
                {"type": "input_text", "text": "Extraé los datos del comprobante."},
                {"type": "input_image", "image_url": f"data:image/jpeg;base64,{b64}"},
            ],
        }],
        "text": {
            "format": {
                "type": "json_schema",
                "name": "receipt",
                "strict": True,
                "schema": {
                    "type": "object",
                    "additionalProperties": False,
                    "required": ["reference", "amount", "currency", "date"],
                    "properties": {
                        "reference": {"type": "string"},
                        "amount":    {"type": "number"},
                        "currency":  {"type": "string", "enum": ["CRC", "USD"]},
                        "date":      {"type": "string"},
                    },
                },
            }
        },
    }
    r = requests.post(
        "https://api.openai.com/v1/responses",
        headers={"Authorization": f"Bearer {api_key}"},
        json=body, timeout=30,
    )
    r.raise_for_status()
    payload = r.json()
    return json.loads(payload["output"][0]["content"][0]["text"])
```

Strict JSON schema garantiza que el modelo no devuelva texto libre — siempre obtenés JSON parseable.

### 12.2 FAQ semántico con `gpt-4o-mini`

1. Mantené tu base de FAQs en un `faq.md` (lista numerada de preguntas/respuestas).
2. Llamá `gpt-4o-mini` pasándole la lista de preguntas y la consulta del usuario, con schema:

```json
{
  "type": "object",
  "required": ["should_answer", "matched_index", "confidence"],
  "properties": {
    "should_answer": { "type": "boolean" },
    "matched_index": { "type": "integer" },
    "confidence":    { "type": "number" }
  }
}
```

3. Si `should_answer && confidence >= 0.85`: respondé con la respuesta indexada y preguntale al usuario si resolvió. Si no: escalá.

### 12.3 Escalación a operador humano

- Configurá `BOT_OPERATOR_PHONES=506XXXXXXXX,506YYYYYYYY` en `.env`.
- Cuando el FAQ no matchea o el usuario rechaza la respuesta automática, llamá `evolution_client.send_text(operador_jid, mensaje_resumen)` con un resumen del caso.
- Marcá la consulta en una tabla `agent_inquiries` con un campo `faq_status` (`auto_escalated`, `escalated_after_faq`, `resolved`).

### 12.4 Generación de PDF con `reportlab`

Útil para enviar comprobantes formales:

```python
from reportlab.lib.pagesizes import LETTER
from reportlab.pdfgen import canvas

def make_receipt_pdf(path: str, data: dict) -> None:
    c = canvas.Canvas(path, pagesize=LETTER)
    c.setFont("Helvetica-Bold", 18)
    c.drawString(72, 720, f"Comprobante #{data['number']}")
    c.setFont("Helvetica", 12)
    c.drawString(72, 690, f"Cliente: {data['customer']}")
    c.drawString(72, 670, f"Monto:   {data['amount']:,.2f} {data['currency']}")
    c.drawString(72, 650, f"Fecha:   {data['date']}")
    c.showPage()
    c.save()
```

Después enviá con `evolution_client.send_media(jid, path, caption)`.

---

## 13. Checklist de despliegue

1. Cloná la plantilla con la estructura del paso 4.
2. Creá un Tunnel en Cloudflare: `cloudflared tunnel create mi-bot`. Copiá el `credentials.json` a `cloudflared/`.
3. Apuntá el hostname (ej. `mi-bot.midominio.com`) al tunnel: `cloudflared tunnel route dns mi-bot mi-bot.midominio.com`.
4. Copiá `.env.example` a `.env` y llená todos los campos.
5. Asegurate que tu instancia Evolution esté arriba y conectada al WhatsApp.
6. `docker compose up -d`.
7. Verificá los logs:
   - `docker compose logs postgres` → debería decir "ready to accept connections".
   - `docker compose logs bot` → debería ver "Listening at: http://0.0.0.0:5001".
   - `docker compose logs cloudflared` → "Registered tunnel connection".
   - `docker compose logs register-bot` → "Webhook registrado: ...".
8. Hacé `curl https://mi-bot.midominio.com/health` desde tu máquina. Debería responder `{"status":"ok"}`.
9. Desde un WhatsApp distinto al del bot, mandá la palabra `BOT_TRIGGER_KEYWORD` (`hola`). El bot debería responder con el menú.

### Troubleshooting

| Síntoma | Causa probable | Acción |
|---|---|---|
| Evolution no envía nada al webhook | El webhook no quedó registrado | `curl -H "apikey: $APIKEY" https://evo/.../evolutionBot/find/$INSTANCE` y revisá si la URL es la correcta |
| Mensajes duplicados / doble respuesta | Webhook se está reintentando demasiado rápido | Revisá `bot_runtime.inbound_messages.processing_status`. Si ves muchos `received` sin avanzar, hay un error en el handler |
| La sesión queda "pegada" en Evolution | Usaste `change_status(status="closed")` | Cambiá a `change_status(status="delete")` |
| `/bot` responde 403 | Falla la validación de origen | Revisá `instanceName`, `apiKey`, `serverUrl` y el `BOT_WEBHOOK_SECRET` si lo configuraste |
| Cloudflared no levanta | `credentials.json` mal montado | `docker compose exec cloudflared ls /etc/cloudflared/` |
| `psycopg.OperationalError` al arrancar | DSN incorrecto o `postgres` aún no listo | Confirmá `depends_on: { condition: service_healthy }` en compose |

---

## 14. Referencias al código real

Si querés ver cómo se implementa cada pieza en producción, consultá los archivos del repo `bot-cobros-caoba`:

| Tema | Archivo |
|---|---|
| Normalización de payload (3+ formatos) | `bot_base/app_factory.py` (función `_normalize_payload`) |
| `Settings` dataclass con `from_env` | `bot_base/config.py` |
| Idempotencia (`claim_inbound_message`, ventana de 15 s) | `bot_base/store.py` |
| `BotService` (constructor + `handle_payload`) | `bot_base/service.py` |
| `EvolutionClient` (cliente HTTP, `change_status`) | `bot_base/evolution.py` |
| Migraciones SQL en orden | `sql/migrations/postgres/` |
| Registro automático del webhook | `scripts/register_bot_when_ready.py` |
| Migrador simple | `scripts/migrate_postgres.py` |
| Orquestación completa | `docker-compose.yml` |
| OCR de imágenes con strict schema | `bot_base/payment_receipts.py` |
| FAQ semántico con `gpt-4o-mini` | `bot_base/faq.py` |
| Captura de media con límites | `bot_base/media_capture.py` |
| Recibo PDF con `reportlab` | `bot_base/receipt_documents.py` |

---

## Apéndice — Decisiones de diseño y por qué

- **PostgreSQL obligatorio (no SQLite)**: necesitamos `ON CONFLICT` con índices únicos parciales y `JSONB`. SQLite no es suficiente bajo carga concurrente.
- **`dataclass(frozen=True)` para `Settings`**: previene mutaciones accidentales en runtime y hace explícito qué se lee del entorno.
- **State machine plana** (no FSM con librerías): es más simple de leer y debuggear. Para >20 estados conviene migrar a `transitions` o similar.
- **Evolution con `change_status="delete"`**: limpia la sesión del lado de Evolution. Probado en producción; `closed` deja artefactos.
- **Cloudflare Tunnel sobre ngrok / port-forwarding**: gratis, persistente, sin cambios de URL, y resiliente. Único costo: dominio.
- **`register-bot` como servicio one-shot**: idempotente y declarativo. Si reiniciás el stack, vuelve a registrar el webhook con la URL correcta.
- **`gunicorn --workers 2`**: con I/O bound, 2 workers es suficiente para cientos de mensajes/min. Subí solo si ves saturación real.

---

*Última revisión: 2026-05-07*
