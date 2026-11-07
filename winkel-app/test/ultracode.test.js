import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pasToe, LEEG, klantSleutel } from '../lib/bonnen.js';
import { leesAgenda, komendeAfspraken } from '../lib/agenda.js';

const nu = new Date('2026-11-07T10:00:00Z');
const doe = (s, a) => pasToe(s, a, nu);

test('pro-klant met nieuw nummer: bonnen blijven bewaard', () => {
  let { staat } = doe(structuredClone(LEEG), { op: 'klantNieuw', klant: { naam: 'Hotel X', telefoon: '0470111111', pro: true } });
  let bon;
  ({ staat, bon } = doe(staat, { op: 'nieuw', bon: { klant: { naam: 'Hotel X', telefoon: '0470111111' }, soorten: ['Was'] } }));
  ({ staat } = doe(staat, { op: 'klant', sleutel: '32470111111', klant: { telefoon: '0470222222' } }));
  assert.ok(staat.klantenboek['32470222222'], 'klant verhuisd naar het nieuwe nummer');
  let b2;
  ({ staat, bon: b2 } = doe(staat, { op: 'nieuw', bon: { klant: { naam: 'Hotel X', telefoon: '0470222222' }, soorten: ['Was'] } }));
  assert.ok(b2.factuur, 'nieuwe bon herkend als pro');
  for (const id of [bon.id, b2.id]) ({ staat } = doe(staat, { op: 'status', id, status: 'opgehaald' }));
  ({ staat } = doe(staat, { op: 'dagWissen' }));
  assert.equal(staat.bonnen.length, 2);
});

test('dagWissen bewaart gemaakte maar onbetaalde facturen', () => {
  let { staat, bon } = doe(structuredClone(LEEG), { op: 'nieuw', bon: { klant: { naam: 'Piet' }, stukken: [{ naam: 'Hemd', prijs: 3 }] } });
  ({ staat } = doe(staat, { op: 'factuurVraag', id: bon.id, gegevens: { naam: 'Piet', adres: 'Straat 1' } }));
  ({ staat } = doe(staat, { op: 'factuurGemaakt', id: bon.id }));
  ({ staat } = doe(staat, { op: 'status', id: bon.id, status: 'opgehaald' }));
  ({ staat } = doe(staat, { op: 'dagWissen' }));
  assert.equal(staat.bonnen.length, 1);
  ({ staat } = doe(staat, { op: 'factuurBetaald', id: bon.id }));
  ({ staat } = doe(staat, { op: 'dagWissen' }));
  assert.equal(staat.bonnen.length, 0);
});

test('betalingen volgen de bon: niet dubbel, prijs achteraf, al betaald blijft', () => {
  const actief = (s) => s.betalingen.filter((p) => !p.geschraptOp).reduce((n, p) => n + p.bedrag, 0);
  let { staat, bon } = doe(structuredClone(LEEG), { op: 'nieuw', bon: { klant: { naam: 'A' }, stukken: [{ naam: 'Hemd', prijs: 10 }], betaald: true, betaalwijze: 'cash' } });
  ({ staat } = doe(staat, { op: 'wijzig', id: bon.id, bon: { betaald: false } }));
  ({ staat } = doe(staat, { op: 'wijzig', id: bon.id, bon: { betaald: true, betaalwijze: 'cash' } }));
  assert.equal(actief(staat), 10, 'niet dubbel geteld');
  ({ staat } = doe(staat, { op: 'wijzig', id: bon.id, bon: { stukken: [{ naam: 'Hemd', prijs: 10, aantal: 3 }] } }));
  assert.equal(actief(staat), 30, 'prijsverhoging bijgeboekt');
  ({ staat } = doe(staat, { op: 'status', id: bon.id, status: 'opgehaald', betaalwijze: 'kaart' }));
  assert.equal(staat.bonnen[0].betaalwijze, 'cash', 'betaalwijze blijft zoals betaald');
});

test('partner: splitsen in hele stuks en vlekken verdelen', () => {
  let { staat, bon } = doe(structuredClone(LEEG), { op: 'nieuw', bon: { klant: { naam: 'A' }, soorten: ['Was'], stukken: [{ naam: 'Servet', aantal: 10, prijs: 1, vlek: 'ja', vlekAantal: 3, behandeling: 'was' }] } });
  ({ staat } = doe(staat, { op: 'extern', status: 'sturen', partner: 'Neven', stukken: [{ id: bon.id, index: 0, aantal: 5.5 }] }));
  const st = staat.bonnen[0].stukken;
  assert.deepEqual(st.map((x) => x.aantal), [4, 6]);
  assert.equal(st.reduce((n, x) => n + (x.vlekAantal || 0), 0), 3);
});

const ics = (inhoud) => `BEGIN:VCALENDAR\r\n${inhoud}END:VCALENDAR\r\n`;
test('agenda: herinnering (VALARM) overschrijft de titel niet; UTC wordt Belgische tijd', () => {
  const lijst = komendeAfspraken(leesAgenda(ics('BEGIN:VEVENT\r\nUID:a\r\nDTSTART:20261109T083000Z\r\nSUMMARY:Ophalen Peeters\r\nDESCRIPTION:Terug: 12/11\r\nBEGIN:VALARM\r\nACTION:EMAIL\r\nDESCRIPTION:This is an event reminder\r\nSUMMARY:Alarm notification\r\nEND:VALARM\r\nEND:VEVENT\r\n')), new Date(2026, 10, 7), 7);
  assert.equal(lijst[0].titel, 'Ophalen Peeters');
  assert.equal(lijst[0].notitie, 'Terug: 12/11');
  assert.equal(lijst[0].tijd, '09:30');
});

test('agenda: laatste werkdag van de maand (BYSETPOS)', () => {
  const lijst = komendeAfspraken(leesAgenda(ics('BEGIN:VEVENT\r\nUID:b\r\nDTSTART;TZID=Europe/Brussels:20261030T090000\r\nRRULE:FREQ=MONTHLY;BYDAY=MO,TU,WE,TH,FR;BYSETPOS=-1\r\nSUMMARY:Factuur\r\nEND:VEVENT\r\n')), new Date(2026, 10, 1), 60);
  assert.deepEqual(lijst.map((a) => a.datum), ['2026-11-30', '2026-12-31']);
});
