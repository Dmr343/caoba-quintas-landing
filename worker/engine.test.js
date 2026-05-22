import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, MSG } from './engine.js';

const config = { trigger: 'info', ttlMs: 30 * 86400 * 1000 };
const T0 = 1_700_000_000_000;
const msg = (text, extra = {}) => ({ phone: '50670000000', text, messageId: 'm1', ...extra });

test('sin sesión: la palabra clave arranca el flujo y avanza a step 1', () => {
  const d = decide(null, msg('info'), config, T0);
  assert.equal(d.reply, MSG.WELCOME);
  assert.deepEqual(d.effects, [{ type: 'saveSession', patch: { step: 1 } }]);
});

test('sin sesión: sin la palabra clave responde fallback y no avanza', () => {
  const d = decide(null, msg('hola, no quiero información'), config, T0);
  assert.equal(d.reply, MSG.FALLBACK);
  assert.deepEqual(d.effects, []);
});

test('step 1: nombre válido pregunta la cédula y guarda nombre (step 2)', () => {
  const d = decide({ step: 1 }, msg('  Ana Pérez  '), config, T0);
  assert.equal(d.reply, MSG.ASK_CEDULA('Ana Pérez'));
  assert.deepEqual(d.effects, [{ type: 'saveSession', patch: { step: 2, nombre: 'Ana Pérez' } }]);
});

test('step 1: nombre vacío/espacios re-pregunta sin avanzar', () => {
  const d = decide({ step: 1 }, msg('   '), config, T0);
  assert.equal(d.reply, MSG.RETRY_NOMBRE);
  assert.deepEqual(d.effects, []);
});

test('step 2: cédula con dígitos pregunta disponibilidad y guarda cédula (step 3)', () => {
  const d = decide({ step: 2, nombre: 'Ana' }, msg('1-2345-6789'), config, T0);
  assert.equal(d.reply, MSG.ASK_DISP);
  assert.deepEqual(d.effects, [{ type: 'saveSession', patch: { step: 3, cedula: '1-2345-6789' } }]);
});

test('step 2: cédula sin dígitos re-pregunta sin avanzar', () => {
  const d = decide({ step: 2, nombre: 'Ana' }, msg('no la tengo'), config, T0);
  assert.equal(d.reply, MSG.RETRY_CEDULA);
  assert.deepEqual(d.effects, []);
});

test('step 3: disponibilidad cierra el flujo con lead + notificación al asesor', () => {
  const session = { step: 3, nombre: 'Ana Pérez', cedula: '1-2345-6789' };
  const d = decide(session, msg('lunes en la tarde'), config, T0);
  assert.equal(d.reply, MSG.DONE);
  // Avance de estado: completado, con completedAt como epoch ms (no string).
  assert.deepEqual(d.effects[0], {
    type: 'saveSession',
    patch: { step: 4, disponibilidad: 'lunes en la tarde', completedAt: T0 },
  });
  // Lead con teléfono y fuente del bot.
  assert.deepEqual(d.effects[1], {
    type: 'insertLead',
    lead: { nombre: 'Ana Pérez', phone: '50670000000', fuente: 'wa_bot' },
  });
  // Notificación: el resumen contiene los datos del cliente.
  assert.equal(d.effects[2].type, 'notifyAdvisor');
  for (const frag of ['Ana Pérez', '1-2345-6789', 'lunes en la tarde', '50670000000']) {
    assert.ok(d.effects[2].summary.includes(frag), `resumen debe incluir "${frag}"`);
  }
});

test('step 3: disponibilidad vacía re-pregunta sin avanzar ni crear lead', () => {
  const d = decide({ step: 3, nombre: 'Ana', cedula: '123' }, msg('  '), config, T0);
  assert.equal(d.reply, MSG.RETRY_DISP);
  assert.deepEqual(d.effects, []);
});

test('step 3: lead usa fallback "Bot WA" si falta el nombre', () => {
  const d = decide({ step: 3, nombre: null, cedula: '123' }, msg('martes'), config, T0);
  assert.equal(d.effects[1].lead.nombre, 'Bot WA');
});

const DAY = 86400 * 1000;

test('step 4 no expirado: responde "ya registrado" sin reiniciar', () => {
  const session = { step: 4, completedAt: T0 - 10 * DAY };
  const d = decide(session, msg('info'), config, T0);
  assert.equal(d.reply, MSG.ALREADY);
  assert.deepEqual(d.effects, []);
});

test('step 4 expirado + palabra clave: reinicia el flujo limpiando datos', () => {
  const session = { step: 4, nombre: 'Ana', cedula: '123', completedAt: T0 - 40 * DAY };
  const d = decide(session, msg('info'), config, T0);
  assert.equal(d.reply, MSG.WELCOME);
  assert.deepEqual(d.effects, [{
    type: 'saveSession',
    patch: { step: 1, nombre: null, cedula: null, disponibilidad: null, completedAt: null },
  }]);
});

test('step 4 expirado sin palabra clave: sigue en "ya registrado"', () => {
  const session = { step: 4, completedAt: T0 - 40 * DAY };
  const d = decide(session, msg('hola'), config, T0);
  assert.equal(d.reply, MSG.ALREADY);
  assert.deepEqual(d.effects, []);
});
