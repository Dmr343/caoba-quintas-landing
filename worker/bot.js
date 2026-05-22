/* ── Mensajes del bot ────────────────────────────────────────── */
const MSG_WELCOME = `¡Hola! 🌿 Soy el asistente de *Caoba Quintas*.
Para coordinar tu visita necesito algunos datos rápidos.
¿Cuál es tu nombre completo?`;

const MSG_ASK_CEDULA = nombre =>
  `Gracias, ${nombre}. ¿Cuál es tu número de cédula?`;

const MSG_ASK_DISP = `Perfecto. ¿Cuándo estarías disponible para que te llamemos?
(Ej: lunes en la tarde, martes a cualquier hora)`;

const MSG_DONE = `¡Excelente! Tu información fue recibida. ✅
Un asesor de *Caoba Quintas* te contactará pronto. ¡Gracias!`;

const MSG_ALREADY = `Tu información ya está registrada con nosotros. 😊
Un asesor se pondrá en contacto contigo pronto.`;

const MSG_FALLBACK = `No entendí tu mensaje. Si deseas información sobre Caoba Quintas, escribe *info* para comenzar.`;

const MSG_RETRY_NOMBRE = `No alcancé a leer tu nombre. ¿Me lo compartes, por favor?`;
const MSG_RETRY_CEDULA = `Necesito un número de cédula válido para continuar. ¿Me lo compartes?`;
const MSG_RETRY_DISP = `¿Cuándo estarías disponible para que te llamemos? (Ej: lunes en la tarde)`;

/* ── Router principal ────────────────────────────────────────── */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/webhook/wa/health') {
      return json({ ok: true });
    }

    // Meta Cloud API: verificación de webhook (GET con hub.challenge)
    if (url.pathname === '/webhook/wa' && request.method === 'GET') {
      return handleMetaVerify(url, env);
    }

    if (url.pathname === '/webhook/wa' && request.method === 'POST') {
      return handleIncoming(request, env);
    }

    return new Response('Not found', { status: 404 });
  },
};

/* ── Verificación de webhook Meta ────────────────────────────── */
function handleMetaVerify(url, env) {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  // Token dedicado de verificación (NO reutilizar WA_API_TOKEN, que es la
  // credencial de la API). Si no está configurado, rechazar (fail-closed).
  const expected = env.WA_VERIFY_TOKEN;
  if (mode === 'subscribe' && expected && token === expected) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

/* ── Autenticación del webhook entrante (POST) ───────────────── */
// Devuelve true si la petición es legítima. Meta: firma HMAC X-Hub-Signature-256
// sobre el cuerpo crudo con WA_APP_SECRET. Otros proveedores: secreto compartido
// en header `x-webhook-secret` (o query `?secret=`) contra WA_WEBHOOK_SECRET.
async function verifyWebhook(request, rawBody, url, env) {
  const provider = env.WA_PROVIDER || '';

  if (provider === 'meta') {
    const secret = env.WA_APP_SECRET;
    if (!secret) {
      console.warn('WA_APP_SECRET no configurado: webhook Meta sin verificar.');
      return true; // no bloquear el go-live; configurar el secreto cuanto antes
    }
    const header = request.headers.get('x-hub-signature-256') || '';
    const expected = 'sha256=' + (await hmacSha256Hex(secret, rawBody));
    return timingSafeEqual(header, expected);
  }

  const secret = env.WA_WEBHOOK_SECRET;
  if (!secret) {
    console.warn('WA_WEBHOOK_SECRET no configurado: webhook sin verificar.');
    return true;
  }
  const provided = request.headers.get('x-webhook-secret') || url.searchParams.get('secret') || '';
  return timingSafeEqual(provided, secret);
}

async function hmacSha256Hex(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

// Comparación en tiempo constante para evitar fugas por timing.
function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* ── Procesador de mensajes entrantes ────────────────────────── */
async function handleIncoming(request, env) {
  const url = new URL(request.url);
  // Leer el cuerpo crudo (necesario para verificar la firma HMAC de Meta).
  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  if (!(await verifyWebhook(request, rawBody, url, env))) {
    return new Response('Forbidden', { status: 403 });
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const msg = parseIncoming(payload, env.WA_PROVIDER);
  if (!msg) return new Response('OK', { status: 200 });

  const { phone, text, messageId } = msg;
  const trigger = (env.WA_TRIGGER || 'info').toLowerCase();

  // Idempotencia: reclamar el messageId antes de procesar para evitar
  // doble procesamiento de reintentos concurrentes del proveedor.
  if (messageId) {
    try {
      const result = await env.DB.prepare(
        'INSERT OR IGNORE INTO wa_inbound (message_id, phone) VALUES (?, ?)'
      ).bind(messageId, phone).run();
      if (result.meta.changes === 0) return new Response('OK', { status: 200 });
    } catch (err) {
      console.error('Dedup error:', err);
    }
    // Limpieza oportunista: el dedup solo necesita cubrir los reintentos del
    // proveedor (minutos), así que purgamos filas viejas para que la tabla no
    // crezca sin límite. Probabilístico para no añadir costo en cada mensaje.
    if (Math.random() < 0.02) {
      try {
        await env.DB.prepare(
          "DELETE FROM wa_inbound WHERE received_at < datetime('now', '-7 days')"
        ).run();
      } catch (err) {
        console.error('Dedup cleanup error:', err);
      }
    }
  }

  // processMessage es PURO: calcula la respuesta y deja el avance de estado
  // pendiente en `commit`, que solo se ejecuta tras un envío exitoso. Así, si
  // el envío falla y el proveedor reintenta, el flujo no avanza dos veces.
  let plan;
  try {
    plan = await processMessage(phone, text, trigger, env);
  } catch (err) {
    console.error('Bot error (process):', err);
    await releaseDedup(env.DB, messageId);
    return new Response('Error', { status: 500 });
  }

  const { reply, commit } = plan;

  if (reply) {
    try {
      // Enviar respuesta vía API (patrón confirmado en cobros bot)
      await sendTextDirect(phone, reply, env);
    } catch (err) {
      console.error('Bot error (send):', err);
      // Liberar la marca para permitir el reintento del proveedor.
      await releaseDedup(env.DB, messageId);
      return new Response('Error', { status: 500 });
    }
  }

  // Envío al usuario confirmado: ahora sí persistimos el avance de estado.
  if (commit) {
    try {
      await commit();
    } catch (err) {
      console.error('Bot error (commit):', err);
    }
  }

  // También devolver en body para EvolutionBot por si lo usa
  if (reply) return json({ data: { message: reply } });
  return new Response('OK', { status: 200 });
}

// Libera la marca de dedup para que un reintento del proveedor pueda reprocesarse.
async function releaseDedup(db, messageId) {
  if (!messageId) return;
  try {
    await db.prepare('DELETE FROM wa_inbound WHERE message_id = ?').bind(messageId).run();
  } catch (err) {
    console.error('Dedup rollback error:', err);
  }
}

/* ── Lógica del flujo ────────────────────────────────────────── */
// Devuelve { reply, commit }. `commit` es una función async (o null) que
// aplica el avance de estado y demás efectos; handleIncoming solo la ejecuta
// tras enviar la respuesta con éxito, para que un reintento no avance dos veces.
async function processMessage(phone, text, trigger, env) {
  const session = await getSession(env.DB, phone);

  // Sin sesión activa: requiere la palabra clave para arrancar
  if (!session || session.step === 0) {
    if (matchesTrigger(text, trigger)) {
      return {
        reply: MSG_WELCOME,
        commit: () => upsertSession(env.DB, phone, { step: 1 }),
      };
    }
    return { reply: MSG_FALLBACK, commit: null };
  }

  // Sesión completada: verificar TTL para re-engagement
  if (session.step === 4) {
    const ttlDays = parseInt(env.SESSION_TTL_DAYS || '30', 10);
    const completedAt = session.completed_at ? new Date(session.completed_at) : null;
    const expired = completedAt
      ? (Date.now() - completedAt.getTime()) > ttlDays * 86400 * 1000
      : false;

    if (expired && matchesTrigger(text, trigger)) {
      return {
        reply: MSG_WELCOME,
        commit: () => upsertSession(env.DB, phone, {
          step: 1, nombre: null, cedula: null, disponibilidad: null, completed_at: null,
        }),
      };
    }
    return { reply: MSG_ALREADY, commit: null };
  }

  // Avanzar flujo según paso actual
  if (session.step === 1) {
    const nombre = text.trim();
    // No avanzar con un nombre vacío/espacios: re-preguntar sin cambiar de paso.
    if (!nombre) return { reply: MSG_RETRY_NOMBRE, commit: null };
    return {
      reply: MSG_ASK_CEDULA(nombre),
      commit: () => upsertSession(env.DB, phone, { step: 2, nombre }),
    };
  }

  if (session.step === 2) {
    const cedula = text.trim();
    // Validar cédula: no vacía y con al menos algún dígito.
    if (!cedula || !/\d/.test(cedula)) return { reply: MSG_RETRY_CEDULA, commit: null };
    return {
      reply: MSG_ASK_DISP,
      commit: () => upsertSession(env.DB, phone, { step: 3, cedula }),
    };
  }

  if (session.step === 3) {
    const disp = text.trim();
    if (!disp) return { reply: MSG_RETRY_DISP, commit: null };
    const now = new Date().toISOString();
    return {
      reply: MSG_DONE,
      commit: async () => {
        await upsertSession(env.DB, phone, { step: 4, disponibilidad: disp, completed_at: now });

        // Guardar en tabla leads (visible en /api/admin)
        try {
          await env.DB.prepare(
            'INSERT INTO leads (nombre, telefono, fuente) VALUES (?, ?, ?)'
          ).bind(session.nombre || 'Bot WA', phone, 'wa_bot').run();
        } catch (err) {
          console.error('D1 leads insert error:', err);
        }

        // Notificación al asesor vía sendText directo (número diferente al cliente)
        if (env.NOTIFY_WA_NUM) {
          const resumen =
            `🌿 *Cliente Caoba*\n` +
            `Nombre: ${session.nombre || '(no indicado)'}\n` +
            `Cédula: ${session.cedula || '(no indicada)'}\n` +
            `Disponibilidad: ${disp}\n` +
            `Número: ${phone}`;
          sendTextDirect(env.NOTIFY_WA_NUM, resumen, env).catch(e =>
            console.error('Notify send error:', e)
          );
        }
      },
    };
  }

  return { reply: null, commit: null };
}

/* ── D1 helpers ──────────────────────────────────────────────── */
async function getSession(db, phone) {
  const row = await db.prepare('SELECT * FROM wa_sessions WHERE phone = ?').bind(phone).first();
  return row || null;
}

// UPSERT atómico (un solo statement): evita el race read-modify-write entre
// mensajes concurrentes del mismo número. Solo actualiza las columnas presentes
// en `fields`; las no indicadas se preservan en la fila existente.
async function upsertSession(db, phone, fields) {
  const now = new Date().toISOString();
  const cols = ['step', 'nombre', 'cedula', 'disponibilidad', 'completed_at'];
  const provided = cols.filter(c => Object.prototype.hasOwnProperty.call(fields, c));
  const setClauses = provided.map(c => `${c}=excluded.${c}`);
  setClauses.push('updated_at=excluded.updated_at');

  await db.prepare(
    `INSERT INTO wa_sessions (phone, step, nombre, cedula, disponibilidad, updated_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(phone) DO UPDATE SET ${setClauses.join(', ')}`
  ).bind(
    phone,
    fields.step ?? 0,
    fields.nombre ?? null,
    fields.cedula ?? null,
    fields.disponibilidad ?? null,
    now,
    fields.completed_at ?? null
  ).run();
}

/* ── Envío directo vía API (solo para notificación al asesor) ── */
async function sendTextDirect(to, text, env) {
  const provider = env.WA_PROVIDER || '';
  if (provider === 'evolution') {
    const url = `${env.WA_API_URL}/message/sendText/${env.WA_INSTANCE}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': env.WA_API_TOKEN },
      body: JSON.stringify({ number: to, text }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('Evolution sendText error:', res.status, body);
      throw new Error(`Evolution sendText failed: ${res.status}`);
    }
  } else if (provider === 'meta') {
    const url = `https://graph.facebook.com/v19.0/${env.WA_PHONE_ID}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.WA_API_TOKEN}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('Meta sendText error:', res.status, body);
      throw new Error(`Meta sendText failed: ${res.status}`);
    }
  }
}

/* ── Parsers de payload entrante ─────────────────────────────── */
function parseIncoming(payload, provider) {
  if (provider === 'meta') return parseMeta(payload);
  return parseEvolution(payload);
}

function parseEvolution(payload) {
  try {
    // Formato Dify (EvolutionBot): {query, user, conversation_id, inputs, files}
    if (payload.query !== undefined && payload.user !== undefined) {
      const phone = (payload.user || '').replace(/@s\.whatsapp\.net$/, '').replace(/@c\.us$/, '');
      const text = payload.query || '';
      // OJO: conversation_id es constante en toda la conversación, NO por mensaje.
      // Usarlo como messageId haría que el dedup descarte todos los mensajes salvo
      // el primero. Este formato no trae un ID por mensaje, así que no deduplicamos.
      const messageId = null;
      if (!phone || !text) return null;
      return { phone, text, messageId };
    }

    // Formato messages.upsert (webhook regular): {event, data:{key, message}}
    if (payload.data && typeof payload.data === 'object') {
      const data = payload.data;
      const key = data.key || {};
      const msg = data.message || {};
      if (key.fromMe) return null;
      const remoteJid = key.remoteJid || data.remoteJid;
      const messageId = key.id;
      const text = msg.conversation || msg.extendedTextMessage?.text || '';
      const phone = (remoteJid || '').replace(/@s\.whatsapp\.net$/, '').replace(/@c\.us$/, '');
      if (!phone || !text) return null;
      return { phone, text, messageId: messageId || null };
    }

    // Formato plano
    const fromMe = payload.fromMe ?? false;
    if (fromMe) return null;
    const remoteJid = payload.remoteJid || payload.number;
    const messageId = payload.messageId;
    const text = payload.text || payload.message || '';
    const phone = (remoteJid || '').replace(/@s\.whatsapp\.net$/, '').replace(/@c\.us$/, '');
    if (!phone || !text) return null;
    return { phone, text, messageId: messageId || null };
  } catch {
    return null;
  }
}

function parseMeta(payload) {
  try {
    const change = payload?.entry?.[0]?.changes?.[0]?.value;
    if (!change?.messages) return null;
    const msg = change.messages[0];
    if (msg.type !== 'text') return null;
    return { phone: msg.from, text: msg.text?.body || '', messageId: msg.id || null };
  } catch {
    return null;
  }
}

/* ── Util ────────────────────────────────────────────────────── */
// Coincide solo si la palabra clave aparece como token completo (no subcadena),
// para no disparar el flujo con palabras como "información" o "informe".
function matchesTrigger(text, trigger) {
  const tokens = (text || '').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  return tokens.includes(trigger);
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
