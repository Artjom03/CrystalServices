import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rm } from 'node:fs/promises';
import { noteerFout, geblokkeerdTot, REGELS, ALLEN } from '../lib/slot.js';

const MIN = 60000;

test('slot: 5 fouten = 15 min, 15 fouten op een dag = 24 uur', () => {
  let rec = null;
  const t0 = Date.UTC(2026, 10, 7, 10);
  for (let i = 0; i < 4; i++) rec = noteerFout(rec, t0 + i * 1000);
  assert.equal(geblokkeerdTot(rec, t0 + 5000), 0, 'na 4 fouten nog niet');
  rec = noteerFout(rec, t0 + 5000);
  assert.equal(geblokkeerdTot(rec, t0 + 6000), t0 + 5000 + 15 * MIN);
  assert.equal(geblokkeerdTot(rec, t0 + 21 * MIN), 0, 'na 15 min weer open');
  // Telkens 4 fouten per kwartier, tot 15 op een dag
  let t = t0 + 30 * MIN;
  for (let i = 0; i < 10; i++) { rec = noteerFout(rec, t); t += 4 * MIN; }
  assert.ok(geblokkeerdTot(rec, t) >= t + 23 * 60 * MIN, '24 uur dicht');
  assert.equal(REGELS.length, 2);
  assert.equal(ALLEN.fouten, 50);
});

test('pin: blokkeert na 5 foute pogingen per adres, ook met de juiste pincode', async () => {
  process.env.APP_PIN = '123456';
  delete process.env.BLOB_READ_WRITE_TOKEN;
  await rm(new URL('../.data/pogingen.json', import.meta.url), { force: true });
  const { controleer } = await import('../lib/pin.js');
  const req = (pin, ip = '1.2.3.4') => ({ headers: { 'x-pin': pin, 'x-forwarded-for': ip }, socket: {} });
  assert.equal(await controleer(req('123456')), null);
  for (let i = 0; i < 5; i++) assert.equal((await controleer(req('000000'))).status, 401);
  const r = await controleer(req('123456'));
  assert.equal(r.status, 429, 'ook de juiste pincode wordt even geweigerd');
  assert.match(r.error, /Geblokkeerd tot/);
  assert.equal(await controleer(req('123456', '5.6.7.8')), null, 'ander adres: geen last');
  // Veel pogingen tegelijk: elke poging telt, dus een juiste pincode achteraan in de stoot wordt geweigerd.
  const stoot = await Promise.all([...Array(20)].map(() => controleer(req('000000', '9.9.9.9'))).concat([controleer(req('123456', '9.9.9.9'))]));
  assert.equal(stoot.at(-1)?.status, 429, 'raden met een stoot aanvragen lukt niet');
  await rm(new URL('../.data/pogingen.json', import.meta.url), { force: true });
});
