import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicAvailability, book, openSlots, closeSlots, cancelSeat, adminOverview, isUpcoming, brusselsNow, AgendaError } from '../lib/agenda.mjs';

// Opslag in het geheugen die zich gedraagt als Netlify Blobs (incl. onlyIfNew).
function memStore() {
  const m = new Map();
  return {
    async get(k) { return m.has(k) ? structuredClone(m.get(k)) : null; },
    async setJSON(k, v, o = {}) {
      await new Promise(r => setTimeout(r, Math.random() * 3)); // gelijktijdigheid nabootsen
      if (o.onlyIfNew && m.has(k)) return { modified: false };
      m.set(k, structuredClone(v)); return { modified: true, etag: 'x' };
    },
    async list({ prefix = '' } = {}) { return { blobs: [...m.keys()].filter(k => k.startsWith(prefix)).map(key => ({ key })) }; },
    async delete(k) { m.delete(k); },
    _m: m,
  };
}
const NOW = new Date('2026-11-09T09:30:00+01:00'); // maandag 9 november, 9:30 in België
const klant = (slot, extra = {}) => ({ slot, naam: 'Jan Peeters', tel: '0470 12 34 56', adres: 'Kerkstraat 1, Deurne', type: 'Onderhoud', ...extra });

test('Belgische tijd en "nog niet begonnen"', () => {
  assert.deepEqual(brusselsNow(NOW), { date: '2026-11-09', time: '09:30' });
  assert.equal(isUpcoming('2026-11-09_VM', NOW), false); // voormiddag is al bezig
  assert.equal(isUpcoming('2026-11-09_NM', NOW), true);
  assert.equal(isUpcoming('2026-11-10_VM', NOW), true);
  assert.equal(isUpcoming('2026-02-30_VM', NOW), false); // geen geldige datum
});

test('enkel open, toekomstige dagdelen met plaatsen zijn publiek zichtbaar', async () => {
  const s = memStore();
  await openSlots(s, ['2026-11-09_VM', '2026-11-09_NM', '2026-11-10_VM', 'onzin'], 2);
  const a = await publicAvailability(s, NOW);
  assert.deepEqual(a.map(x => x.id), ['2026-11-09_NM', '2026-11-10_VM']);
  assert.equal(a[0].free, 2);
  assert.ok(!JSON.stringify(a).includes('naam'));
});

test('boeken vult plaatsen tot de capaciteit en weigert daarna', async () => {
  const s = memStore();
  await openSlots(s, ['2026-11-10_NM'], 2);
  assert.equal((await book(s, klant('2026-11-10_NM'), NOW)).seat, '2026-11-10_NM_1');
  assert.equal((await book(s, klant('2026-11-10_NM'), NOW)).seat, '2026-11-10_NM_2');
  await assert.rejects(book(s, klant('2026-11-10_NM'), NOW), e => e instanceof AgendaError && e.code === 'full');
  assert.deepEqual(await publicAvailability(s, NOW), []);
});

test('tien gelijktijdige boekingen voor 3 plaatsen: exact 3 lukken', async () => {
  const s = memStore();
  await openSlots(s, ['2026-11-11_VM'], 3);
  const res = await Promise.allSettled(Array.from({ length: 10 }, (_, i) => book(s, klant('2026-11-11_VM', { naam: 'Klant ' + i }), NOW)));
  assert.equal(res.filter(r => r.status === 'fulfilled').length, 3);
  assert.equal(new Set(res.filter(r => r.status === 'fulfilled').map(r => r.value.seat)).size, 3);
});

test('gesloten, verleden en ongeldige aanvragen worden geweigerd', async () => {
  const s = memStore();
  await openSlots(s, ['2026-11-09_VM'], 1);
  await assert.rejects(book(s, klant('2026-11-12_VM'), NOW), { code: 'closed' });
  await assert.rejects(book(s, klant('2026-11-09_VM'), NOW), { code: 'past' });
  await assert.rejects(book(s, klant('2026-11-12_XX'), NOW), { code: 'invalid_slot' });
  await assert.rejects(book(s, klant('2026-11-12_VM', { tel: '12' }), NOW), { code: 'invalid_tel' });
  await assert.rejects(book(s, klant('2026-11-12_VM', { naam: '' }), NOW), { code: 'invalid_naam' });
});

test('beheer: overzicht, annuleren maakt de plaats weer vrij, sluiten verbergt het dagdeel', async () => {
  const s = memStore();
  await openSlots(s, ['2026-11-12_VM'], 1);
  const r = await book(s, klant('2026-11-12_VM', { opmerking: 'Vaillant, fout F28' }), NOW);
  const o = await adminOverview(s, '2026-11-09', '2026-11-14');
  assert.equal(o.bookings.length, 1);
  assert.equal(o.bookings[0].opmerking, 'Vaillant, fout F28');
  assert.equal(o.slots['2026-11-12_VM'].cap, 1);
  await cancelSeat(s, r.seat);
  assert.equal((await publicAvailability(s, NOW)).length, 1);
  await closeSlots(s, ['2026-11-12_VM']);
  assert.equal((await publicAvailability(s, NOW)).length, 0);
  await assert.rejects(cancelSeat(s, '../slots/x'), { code: 'invalid_seat' });
});

// ---------- Beheerder: zelf inplannen, wijzigen, verplaatsen ----------
import { adminPlan, adminUpdate, toICal } from '../lib/agenda.mjs';

test('beheerder plant in, ook in een gesloten of vol dagdeel', async () => {
  const s = memStore();
  const a = await adminPlan(s, { slot: '2026-11-20_VM', naam: 'Mevr. Claes', tel: '03 123 45 67' }, NOW);
  assert.equal(a.seat, '2026-11-20_VM_1');
  await openSlots(s, ['2026-11-20_NM'], 1);
  await book(s, klant('2026-11-20_NM'), NOW);
  const b = await adminPlan(s, { slot: '2026-11-20_NM', naam: 'Extra klant' }, NOW);
  assert.equal(b.seat, '2026-11-20_NM_2');
  await assert.rejects(adminPlan(s, { slot: '2026-11-20_NM', naam: '' }, NOW), { code: 'invalid_naam' });
  // klanten zien het gesloten dagdeel niet, en het volle dagdeel ook niet
  assert.deepEqual((await publicAvailability(s, NOW)).map(x => x.id), []);
});

test('wijzigen behoudt gegevens, verplaatsen maakt de oude plaats vrij', async () => {
  const s = memStore();
  await openSlots(s, ['2026-11-21_VM', '2026-11-23_NM'], 1);
  const r = await book(s, klant('2026-11-21_VM', { opmerking: 'Bulex' }), NOW);
  await adminUpdate(s, r.seat, { status: 'afgewerkt' }, NOW);
  let o = await adminOverview(s);
  assert.equal(o.bookings[0].status, 'afgewerkt');
  assert.equal(o.bookings[0].opmerking, 'Bulex');
  const m = await adminUpdate(s, r.seat, { slot: '2026-11-23_NM', tel: '0470 99 88 77' }, NOW);
  assert.equal(m.moved, true);
  o = await adminOverview(s);
  assert.equal(o.bookings.length, 1);
  assert.equal(o.bookings[0].slot, '2026-11-23_NM');
  assert.equal(o.bookings[0].tel, '0470 99 88 77');
  assert.equal(o.bookings[0].naam, 'Jan Peeters');
  assert.deepEqual((await publicAvailability(s, NOW)).map(x => x.id), ['2026-11-21_VM']);
  await assert.rejects(adminUpdate(s, '2026-11-21_VM_1', {}, NOW), { code: 'not_found' });
});

test('overzicht leest alleen de gevraagde periode', async () => {
  const s = memStore();
  await adminPlan(s, { slot: '2026-10-01_VM', naam: 'Oud' }, NOW);
  await adminPlan(s, { slot: '2026-12-01_VM', naam: 'Nieuw' }, NOW);
  let gets = 0; const orig = s.get; s.get = (...a) => { gets++; return orig(...a); };
  const o = await adminOverview(s, '2026-11-15', '2026-12-31');
  assert.deepEqual(o.bookings.map(b => b.naam), ['Nieuw']);
  assert.equal(gets, 1);
});

test('agenda-abonnement (iCal) is geldig en met Belgische tijden', () => {
  const ics = toICal([{ seat: '2026-11-20_VM_1', date: '2026-11-20', part: 'VM', naam: 'Jan; Peeters', type: 'Onderhoud', adres: 'Kerkstraat 1, Deurne', tel: '0470', opmerking: 'regel 1\nregel 2 met een heel lange opmerking die zeker over de vijfenzeventig tekens van een ical-regel gaat' }], { now: NOW });
  assert.match(ics, /^BEGIN:VCALENDAR\r\n/);
  assert.match(ics, /DTSTART;TZID=Europe\/Brussels:20261120T080000/);
  assert.match(ics, /SUMMARY:Jan\; Peeters – Onderhoud/);
  assert.match(ics, /LOCATION:Kerkstraat 1\\, Deurne/);
  assert.ok(ics.split('\r\n').every(l => Buffer.byteLength(l) <= 75));
});
