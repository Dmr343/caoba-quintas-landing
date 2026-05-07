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
  if (mode === 'subscribe' && token === (env.WA_API_TOKEN || '')) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Forbidden', { status: 403 });
}

/* ── Procesador de mensajes entrantes ────────────────────────── */
async function handleIncoming(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const msg = parseIncoming(payload, env.WA_PROVIDER);
  if (!msg) return new Response('OK', { status: 200 });

  const { phone, text, messageId } = msg;
  const trigger = (env.WA_TRIGGER || 'info').toLowerCase();

  // Idempotencia: ignorar reintentos del proveedor con el mismo messageId
  if (messageId) {
    try {
      const result = await env.DB.prepare(
        'INSERT OR IGNORE INTO wa_inbound (message_id, phone) VALUES (?, ?)'
      ).bind(messageId, phone).run();
      if (result.meta.changes === 0) return new Response('OK', { status: 200 });
    } catch (err) {
      console.error('Dedup error:', err);
    }
  }

  try {
    const responseText = await processMessage(phone, text, trigger, env);
    if (responseText) {
      // Enviar respuesta vía API (patrón confirmado en cobros bot)
      await sendTextDirect(phone, responseText, env);
      // También devolver en body para EvolutionBot por si lo usa
      return json({ data: { message: responseText } });
    }
  } catch (err) {
    console.error('Bot error:', err);
  }

  return new Response('OK', { status: 200 });
}

/* ── Lógica del flujo ────────────────────────────────────────── */
async function processMessage(phone, text, trigger, env) {
  let session = await getSession(env.DB, phone);

  // Sin sesión activa: requiere la palabra clave para arrancar
  if (!session || session.step === 0) {
    if (text.toLowerCase().includes(trigger)) {
      await upsertSession(env.DB, phone, { step: 1 });
      return MSG_WELCOME;
    }
    return MSG_FALLBACK;
  }

  // Sesión completada: verificar TTL para re-engagement
  if (session.step === 4) {
    const ttlDays = parseInt(env.SESSION_TTL_DAYS || '30', 10);
    const completedAt = session.completed_at ? new Date(session.completed_at) : null;
    const expired = completedAt
      ? (Date.now() - completedAt.getTime()) > ttlDays * 86400 * 1000
      : false;

    if (expired && text.toLowerCase().includes(trigger)) {
      await upsertSession(env.DB, phone, {
        step: 1, nombre: null, cedula: null, disponibilidad: null, completed_at: null,
      });
      return MSG_WELCOME;
    }
    return MSG_ALREADY;
  }

  // Avanzar flujo según paso actual
  if (session.step === 1) {
    const nombre = text.trim();
    await upsertSession(env.DB, phone, { step: 2, nombre });
    return MSG_ASK_CEDULA(nombre);
  }

  if (session.step === 2) {
    await upsertSession(env.DB, phone, { step: 3, cedula: text.trim() });
    return MSG_ASK_DISP;
  }

  if (session.step === 3) {
    const disp = text.trim();
    const now = new Date().toISOString();

    // Refrescar para tener nombre y cédula guardados
    session = await getSession(env.DB, phone);
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
        `Nombre: ${session.nombre}\n` +
        `Cédula: ${session.cedula}\n` +
        `Disponibilidad: ${disp}\n` +
        `Número: ${phone}`;
      sendTextDirect(env.NOTIFY_WA_NUM, resumen, env).catch(e =>
        console.error('Notify send error:', e)
      );
    }

    return MSG_DONE;
  }

  return null;
}

/* ── D1 helpers ──────────────────────────────────────────────── */
async function getSession(db, phone) {
  const row = await db.prepare('SELECT * FROM wa_sessions WHERE phone = ?').bind(phone).first();
  return row || null;
}

async function upsertSession(db, phone, fields) {
  const session = await getSession(db, phone);
  const now = new Date().toISOString();

  if (!session) {
    await db.prepare(
      `INSERT INTO wa_sessions (phone, step, nombre, cedula, disponibilidad, updated_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      phone,
      fields.step ?? 0,
      fields.nombre ?? null,
      fields.cedula ?? null,
      fields.disponibilidad ?? null,
      now,
      fields.completed_at ?? null
    ).run();
  } else {
    const updates = { ...session, ...fields, updated_at: now };
    await db.prepare(
      `UPDATE wa_sessions
       SET step=?, nombre=?, cedula=?, disponibilidad=?, updated_at=?, completed_at=?
       WHERE phone=?`
    ).bind(
      updates.step,
      updates.nombre ?? null,
      updates.cedula ?? null,
      updates.disponibilidad ?? null,
      now,
      updates.completed_at ?? null,
      phone
    ).run();
  }
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
    if (!res.ok) console.error('Evolution sendText error:', res.status, await res.text());
  } else if (provider === 'meta') {
    const url = `https://graph.facebook.com/v19.0/${env.WA_PHONE_ID}/messages`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.WA_API_TOKEN}` },
      body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body: text } }),
    });
    if (!res.ok) console.error('Meta sendText error:', res.status, await res.text());
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
      const messageId = payload.conversation_id || null;
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
function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
