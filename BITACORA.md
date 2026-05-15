# Bitácora — caoba_landing_page


## 2026-05-15 | 11:37

**Resumen:** Sesión de planificación para reorganizar `~/Documents`, agrupando los proyectos de Grupo Pujol (incluido `caoba_landing_page`) bajo una carpeta común `work/grupo_pujol/`.

**Cambios:**
- Definida la ruta destino del proyecto: `~/Documents/work/caoba_landing_page/` → `~/Documents/work/grupo_pujol/caoba_landing_page/`.
- Identificadas referencias a paths antiguos en `BITACORA.md` de repos hermanos que requieren commit+push previo al `mv`.
- Confirmado que `.claude/settings.local.json` está gitignored y no ensucia el repo al editarse.

**Archivos clave:** `BITACORA.md`

---

## 2026-05-08 | 13:16

**Resumen:** Se mejoró el bot de WhatsApp para usar triggers por coincidencia parcial (`contains`) y mensajes con lenguaje más natural.

**Cambios:**
- Cambio de trigger exacto a `contains` para mayor flexibilidad en detección de palabras clave
- Reescritura de respuestas del bot con tono conversacional y menos robótico
- Se pre-llenó el campo 'info' en todos los enlaces de WhatsApp de la landing
- Creación de issue en GitHub documentando mejoras pendientes al bot

**Archivos clave:** `caoba-bot/index.js`

---

## 2026-05-08 | 12:12

**Resumen:** Revisión del estado del proyecto tras implementar pre-fill automático de "info" en todos los botones de WhatsApp de la landing page.

**Cambios:**
- Pre-fill del mensaje "info" en CTAs principales, popup del mapa, FAQs y sección de financiamiento
- Bot de WhatsApp (caoba-bot Worker) integrado para responder automáticamente al recibir "info"

**Archivos clave:** `index.html`

---

## 2026-05-07 | 10:43

**Resumen:** Se implementó y puso en producción un bot de WhatsApp para captura de leads de Caoba Quintas usando Cloudflare Workers y EvolutionAPI.

**Cambios:**
- Creado Worker `caoba-bot` con flujo conversacional de 3 pasos: nombre → cédula → disponibilidad
- Al completar el flujo, el lead se guarda en D1 vía `/api/admin` con `fuente=wa_bot`
- Se implementó notificación automática al asesor (`+506 8516-4626`) con los datos del cliente
- Se agregó lógica de re-engagement: números que ya completaron el flujo reciben mensaje de espera por 30 días
- Se identificó y resolvió issue de sesiones internas de EvolutionBot que bloqueaban el trigger

**Archivos clave:** `caoba-bot/index.js`

---

## 2026-05-07 | 09:54

**Resumen:** Se diagnosticó un error de autenticación con la API de Cloudflare causado por un token revocado o expirado, bloqueando la ejecución de migraciones D1 y el deploy del Worker.

**Archivos clave:** `credenciales_caoba.md`

---

## 2026-05-06 | 11:58

**Resumen:** Sesión de diagnóstico para integrar un bot de WhatsApp con Evolution API, identificando los datos de acceso necesarios para conectar la instancia.

**Archivos clave:** `worker/bot.js`, `wrangler.bot.toml`

---

## 2026-05-05 | 17:01

**Resumen:** Sesión de consulta técnica para configurar la ruta del webhook de WhatsApp en el Worker de Cloudflare (`caoba-bot`).

**Cambios:**
- Identificada la ubicación correcta en el dashboard de Cloudflare para añadir rutas a un Worker: Workers & Pages → `caoba-bot` → Settings → Domains & Routes
- Definido el endpoint de salud `/webhook/wa/health` como punto de verificación del despliegue

---

## 2026-05-04 | 23:22

**Resumen:** Se implementó un Worker de WhatsApp bot (`caoba-bot`) con flujo conversacional de 3 pasos y soporte para los proveedores Evolution API y Meta, conectado a la base de datos D1 existente.

**Cambios:**
- Creado `worker/bot.js` con lógica de re-engagement a 30 días y adaptador dual Evolution/Meta
- Creado `wrangler.bot.toml` como configuración independiente del Worker de bot
- Aplicada migración `migrations/0002_wa_sessions.sql` que añade tabla `wa_sessions` a D1
- Desplegado `caoba-bot` en `caoba-bot.berrocal-dbp.workers.dev` (health check OK)

**Archivos clave:** `worker/bot.js`, `wrangler.bot.toml`, `migrations/0002_wa_sessions.sql`

---

## 2026-04-30 | 18:35

**Resumen:** Se implementó el mapa interactivo por lote con polígonos clicables y se actualizaron las tarjetas con fotos reales de drone como fondo.

**Cambios:**
- Tarjetas de los 11 lotes ahora usan fotos reales de drone con overlay semitransparente en color de marca
- Mapa interactivo con polígonos verdes (disponibles) y grises (vendidos)
- Popup por lote con nombre, tamaño, zona, precio y botón directo a WhatsApp
- Matching automático de polígonos GeoJSON a lotes por algoritmo de área + posición

**Archivos clave:** `index.html`, `worker/index.js`

---

No recibí argumentos. Necesito dos datos antes de continuar:

1. **Proyectos a incluir** — ¿cuáles trabajaste esta semana? (ej: `caoba_landing_page`, algún otro)
2. **Horas totales** — ¿cuántas horas en total trabajaste esta semana?

## 2026-04-28 | 15:16

**Resumen:** Se redactaron dos PRDs para el proyecto — uno de correcciones de contenido de la landing page y otro para un bot de WhatsApp de captación automatizada de leads — y se publicaron como issues en GitHub.

**Cambios:**
- Creado Issue #2: PRD de correcciones de contenido y mejoras visuales de la landing page
- Creado Issue #3: PRD de bot de WhatsApp para captación automatizada de leads con Evolution API

**Archivos clave:** `https://github.com/Dmr343/caoba-quintas-landing/issues/2`, `https://github.com/Dmr343/caoba-quintas-landing/issues/3`

---

## 2026-04-28 | 14:08

**Resumen:** Se resolvió el problema del logo que no aparecía al abrir el HTML como archivo autónomo, embebiendo la imagen como base64 directamente en el código.

**Cambios:**
- Logo embebido en base64 para eliminar dependencia de la carpeta `images/`
- Panel de tweaks (`tweaks-panel.jsx`) inlineado en el HTML para evitar errores de ruta
- `index.html` sincronizado con `index-dev.html` como fuente única de verdad

**Archivos clave:** `index-dev.html`, `index.html`

---

## 2026-04-28 | 12:47

**Resumen:** Revisión del estado del proyecto y preparación del checklist de go-live para despliegue en producción con Cloudflare Pages, Workers y D1.

**Archivos clave:** `wrangler.toml`, `migrations/0001_leads.sql`

---

## 2026-04-27 | 22:01

**Resumen:** Se revisó el estado del proyecto para determinar los pasos pendientes antes del go-live del sitio web de Caoba Quintas.

**Archivos clave:** `images/`, `wrangler.toml`, `migrations/0001_leads.sql`

---

## 2026-04-27 | 18:08

**Resumen:** Se incorporaron al repositorio los activos gráficos de marca del proyecto: manual de marca y logos oficiales en múltiples variantes.

**Cambios:**
- Agregado `Manual_de_Marca_v5.html` con las guías de identidad visual de Caoba Quintas
- Agregados 4 logos en `images/`: versión principal, crema, sobre verde y formato JPEG

**Archivos clave:** `Manual_de_Marca_v5.html`, `images/logo.jpeg`, `images/logo_v2_crema.png`, `images/logo_v2_principal.png`, `images/logo_v2_sobre_verde.png`

---

## 2026-04-27 | 16:26

**Resumen:** Consulta sobre qué archivos subir para generar un manual de marca completo de Caoba Quintas usando IA.

**Archivos clave:** `caobaquintas_prompt.md`, `index-dev.html`

---

## 2026-04-24 | 18:09

**Resumen:** Se consultó y planificó la arquitectura de infraestructura para publicar la landing page de Caoba Quintas con dominio propio y captura de leads persistente.

**Archivos clave:** `index.html`

---

## 2026-04-23 | 20:00

**Resumen:** Sesión de levantamiento de requerimientos para la landing page de Caoba Quintas, identificando brechas de información necesarias antes de iniciar el desarrollo.

---
