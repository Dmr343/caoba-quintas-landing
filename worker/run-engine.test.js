import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runEngine, MSG } from './engine.js';

const config = { trigger: 'info', ttlMs: 30 * 86400 * 1000 };
const T0 = 1_700_000_000_000;

// Construye un set de puertos en memoria con espías sobre el orden de operaciones.
function makeDeps(overrides = {}) {
  const log = [];
  const sessions = new Map();
  const deps = {
    config,
    clock: { now: () => T0 },
    sessions: {
      get: async phone => sessions.get(phone) ?? null,
    },
    sender: {
      send: async (to, text) => { log.push(['send', to]); },
    },
    dedup: {
      claim: async () => true,
      release: async () => { log.push(['release']); },
    },
    applyEffect: async (effect, phone) => {
      log.push(['effect', effect.type]);
      if (effect.type === 'saveSession') {
        sessions.set(phone, { ...(sessions.get(phone) || {}), ...effect.patch });
      }
    },
    ...overrides,
  };
  return { deps, log, sessions };
}

test('happy path: reclama, envía la respuesta y LUEGO aplica los efectos', async () => {
  const { deps, log, sessions } = makeDeps();
  const res = await runEngine({ phone: '506', text: 'info', messageId: 'm1' }, deps);

  assert.equal(res.status, 'ok');
  assert.equal(res.reply, MSG.WELCOME);
  // El envío ocurre ANTES de persistir el efecto.
  assert.deepEqual(log, [['send', '506'], ['effect', 'saveSession']]);
  assert.equal(sessions.get('506').step, 1);
});

test('fallo de envío: libera el dedup y NO aplica efectos (sin doble-avance)', async () => {
  const { deps, log, sessions } = makeDeps({
    sender: { send: async () => { throw new Error('WA 500'); } },
  });
  const res = await runEngine({ phone: '506', text: 'info', messageId: 'm1' }, deps);

  assert.equal(res.status, 'send_failed');
  assert.deepEqual(log, [['release']]); // se libera, ningún efecto aplicado
  assert.equal(sessions.has('506'), false); // estado intacto
});

test('mensaje duplicado: no decide, no envía, no aplica efectos', async () => {
  const { deps, log } = makeDeps({ dedup: { claim: async () => false, release: async () => {} } });
  const res = await runEngine({ phone: '506', text: 'info', messageId: 'm1' }, deps);

  assert.equal(res.status, 'duplicate');
  assert.deepEqual(log, []);
});
