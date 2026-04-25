export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    const url = new URL(request.url);

    if (url.pathname === '/api/leads' && request.method === 'POST') {
      return handleLead(request, env);
    }

    return new Response('Not found', { status: 404 });
  },
};

async function handleLead(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return corsResponse({ error: 'JSON inválido' }, 400);
  }

  const nombre = (body.nombre || '').trim();
  const telefono = (body.telefono || '').trim();
  const fuente = (body.fuente || 'hero').trim();

  if (!nombre || !telefono) {
    return corsResponse({ error: 'nombre y telefono son requeridos' }, 400);
  }

  try {
    await env.DB.prepare(
      'INSERT INTO leads (nombre, telefono, fuente) VALUES (?, ?, ?)'
    ).bind(nombre, telefono, fuente).run();
  } catch (err) {
    console.error('D1 error:', err);
    return corsResponse({ error: 'Error guardando lead' }, 500);
  }

  // Notificación por email (opcional — requiere RESEND_API_KEY en secrets)
  if (env.RESEND_API_KEY && env.NOTIFY_EMAIL) {
    await sendEmail(env, nombre, telefono, fuente).catch(e =>
      console.error('Email error:', e)
    );
  }

  return corsResponse({ ok: true }, 201);
}

async function sendEmail(env, nombre, telefono, fuente) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'leads@caobaquintas.com',
      to: env.NOTIFY_EMAIL,
      subject: `Nuevo lead — ${nombre}`,
      html: `<p><strong>Nombre:</strong> ${nombre}</p>
             <p><strong>Teléfono:</strong> ${telefono}</p>
             <p><strong>Fuente:</strong> ${fuente}</p>`,
    }),
  });
}

function corsResponse(body, status) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  return new Response(body ? JSON.stringify(body) : null, { status, headers });
}
