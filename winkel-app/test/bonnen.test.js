import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pasToe, LEEG } from '../lib/bonnen.js';

const nu = new Date('2026-10-09T09:00:00Z');
const nieuw = (staat, bon) => pasToe(staat, { op: 'nieuw', bon }, nu);

test('nieuwe bon krijgt een volgnummer per jaar en een totaal', () => {
  let { staat, bon } = nieuw(LEEG, {
    klant: { naam: '  Lauren ' },
    stukken: [{ naam: 'Hemd (strijken)', aantal: 3, prijs: 2.3 }, { naam: 'Broek', aantal: '2', prijs: '2,30' }],
  });
  assert.match(bon.nr, /^\d{6}$/, 'willekeurig getal van 6 cijfers');
  const eerste = bon.nr;
  assert.equal(bon.klant.naam, 'Lauren');
  assert.equal(bon.totaal, 11.5);
  assert.equal(bon.status, 'binnen');
  ({ bon } = nieuw(staat, { klant: { naam: 'Yao' } }));
  assert.match(bon.nr, /^\d{6}$/);
  assert.notEqual(bon.nr, eerste);
});

test('zonder naam geen bon', () => {
  assert.throws(() => nieuw(LEEG, { klant: { naam: ' ' } }), /naam/);
});

test('status klaar en opgehaald zetten de tijdstippen en de betaling', () => {
  let { staat, bon } = nieuw(LEEG, { klant: { naam: 'A' } });
  ({ staat, bon } = pasToe(staat, { op: 'status', id: bon.id, status: 'klaar' }, nu));
  assert.ok(bon.klaarOp);
  ({ staat, bon } = pasToe(staat, { op: 'status', id: bon.id, status: 'opgehaald', betaalwijze: 'kaart' }, nu));
  assert.equal(bon.betaald, true);
  assert.equal(bon.betaalwijze, 'kaart');
  assert.ok(bon.opgehaaldOp);
  ({ bon } = pasToe(staat, { op: 'status', id: bon.id, status: 'binnen' }, nu));
  assert.equal(bon.klaarOp, '');
  assert.equal(bon.opgehaaldOp, '');
});

test('wijzigen houdt nummer en status, verwijderen haalt de bon weg', () => {
  let { staat, bon } = nieuw(LEEG, { klant: { naam: 'A' } });
  const nr = bon.nr;
  ({ staat, bon } = pasToe(staat, { op: 'wijzig', id: bon.id, bon: { klant: { naam: 'B', telefoon: '0470' }, stukken: [{ naam: 'Laken', prijs: 4.2 }] } }, nu));
  assert.equal(bon.nr, nr);
  assert.equal(bon.klant.naam, 'B');
  assert.equal(bon.totaal, 4.2);
  ({ staat } = pasToe(staat, { op: 'verwijder', id: bon.id }, nu));
  assert.equal(staat.bonnen.length, 0);
});

test('rare invoer wordt begrensd', () => {
  const { bon } = nieuw(LEEG, { klant: { naam: 'x'.repeat(500) }, stukken: [{ naam: 'a', aantal: -5, prijs: -3 }, { naam: '' }], betaalwijze: 'bitcoin' });
  assert.equal(bon.klant.naam.length, 80);
  assert.deepEqual(bon.stukken, [{ naam: 'a', aantal: 1, prijs: 0, behandeling: 'ander' }]);
  assert.equal(bon.betaalwijze, '');
  assert.throws(() => pasToe(LEEG, { op: 'status', id: 'nope', status: 'klaar' }, nu), /niet gevonden/);
});

import { telefoonSleutel, voorWinkel, voorKlant } from '../lib/bonnen.js';
import { maakPin, hashPin, pinKlopt, maakToken, leesToken } from '../lib/klant.js';

test('gsm-nummers in elke schrijfwijze geven dezelfde sleutel', () => {
  for (const t of ['0470 12 34 56', '+32 470 12 34 56', '0032470123456', '0470/12.34.56']) {
    assert.equal(telefoonSleutel(t), '32470123456');
  }
  assert.equal(telefoonSleutel('12'), '');
});

test('klantcode: enkel de hash wordt bewaard en de winkel ziet die niet', () => {
  const pin = maakPin();
  assert.match(pin, /^\d{6}$/);
  let { staat } = nieuw(LEEG, { klant: { naam: 'Lauren', telefoon: '0497 31 96 09' } });
  ({ staat } = nieuw(staat, { klant: { naam: 'Ander', telefoon: '0470 00 00 00' } }));
  ({ staat } = pasToe(staat, { op: 'klantcode', telefoon: '+32497319609', naam: 'Lauren', ...hashPin(pin) }, nu));
  const k = staat.klanten['32497319609'];
  assert.ok(pinKlopt(pin, k));
  assert.ok(!pinKlopt('000000' === pin ? '111111' : '000000', k));
  assert.ok(!JSON.stringify(staat).includes(`"${pin}"`));
  assert.deepEqual(Object.keys(voorWinkel(staat).klanten['32497319609']).sort(), ['laatsteLogin', 'naam', 'sinds']);
  // De klant ziet enkel de eigen bon.
  const zicht = voorKlant(staat, '32497319609');
  assert.equal(zicht.bonnen.length, 1);
  assert.equal(zicht.bonnen[0].nr, staat.bonnen[0].nr);
  assert.equal('opmerking' in zicht.bonnen[0], false);
});

test('na 5 foute codes 15 minuten geblokkeerd, nieuwe code verhoogt de versie', () => {
  let { staat } = pasToe(LEEG, { op: 'klantcode', telefoon: '0470123456', ...hashPin('123456') }, nu);
  for (let i = 0; i < 5; i++) ({ staat } = pasToe(staat, { op: 'loginFout', sleutel: '32470123456' }, nu));
  assert.ok(staat.klanten['32470123456'].geblokkeerdTot > nu.toISOString());
  ({ staat } = pasToe(staat, { op: 'klantcode', telefoon: '0470123456', ...hashPin('654321') }, nu));
  assert.equal(staat.klanten['32470123456'].v, 2);
  assert.equal(staat.klanten['32470123456'].geblokkeerdTot, '');
});

test('toegangsbewijs: echt, vervalst en verlopen', () => {
  process.env.KLANT_GEHEIM = 'test';
  const t = maakToken('32470123456', 1, 1000);
  assert.deepEqual({ ...leesToken(t, 2000), exp: 0 }, { t: '32470123456', v: 1, exp: 0 });
  assert.equal(leesToken(t.slice(0, -2) + 'xx', 2000), null);
  assert.equal(leesToken(t, 1000 + 181 * 24 * 3600 * 1000), null);
});

test('stukken per behandeling, prijs mag leeg blijven, droogkuis vraagt stukken', () => {
  assert.throws(() => nieuw(LEEG, { klant: { naam: 'A' }, soorten: ['Droogkuis'] }), /droogkuis/i);
  const { staat, bon } = nieuw(LEEG, {
    klant: { naam: 'A' },
    soorten: ['Strijk'],
    stukken: [
      { naam: 'Hemd (strijken)', aantal: 2, prijs: 2.3, behandeling: 'strijk' },
      { naam: 'Mantel', aantal: 1, prijs: '', behandeling: 'droogkuis' },
    ],
  });
  assert.deepEqual(bon.soorten, ['Strijk', 'Droogkuis']);
  assert.equal(bon.soort, 'Strijk + Droogkuis');
  assert.equal(bon.stukken[1].prijs, null);
  assert.equal(bon.totaal, 4.6);
  assert.equal(bon.prijsOpen, true);
  // Bij het ophalen de prijs invullen
  const { bon: na } = pasToe(staat, { op: 'wijzig', id: bon.id, bon: { stukken: [bon.stukken[0], { ...bon.stukken[1], prijs: '14,50' }] } }, nu);
  assert.equal(na.totaal, 19.1);
  assert.equal(na.prijsOpen, false);
});

test('oudere bonnen zonder behandeling blijven werken', () => {
  const oud = { bonnen: [{ id: 'x', nr: '26-001', klant: { naam: 'A' }, soort: 'Strijk', stukken: [{ naam: 'Hemd (strijken)', aantal: 1, prijs: 2.3 }] }], teller: { 26: 1 } };
  const { bon } = pasToe(oud, { op: 'wijzig', id: 'x', bon: {} }, nu);
  assert.equal(bon.stukken[0].behandeling, 'strijk');
  assert.deepEqual(bon.soorten, ['Strijk']);
});

test('locatie: bij het maken, apart te wijzigen, en niet zichtbaar voor de klant', () => {
  let { staat, bon } = nieuw(LEEG, { klant: { naam: 'A', telefoon: '0470 12 34 56' }, locatie: '  Rek 3 ' });
  assert.equal(bon.locatie, 'Rek 3');
  ({ staat, bon } = pasToe(staat, { op: 'locatie', id: bon.id, locatie: 'Plank B'.repeat(10) }, nu));
  assert.equal(bon.locatie.length, 40);
  ({ staat, bon } = pasToe(staat, { op: 'wijzig', id: bon.id, bon: { klant: { naam: 'A', telefoon: '0470 12 34 56' } } }, nu));
  assert.ok(bon.locatie.startsWith('Plank B'), 'wijzigen zonder locatie houdt de oude');
  assert.equal(voorKlant(staat, '32470123456').bonnen[0].locatie, undefined);
});

test('bewaartermijn: opgehaalde bonnen verdwijnen na de gekozen maanden, de rest blijft', () => {
  const toen = new Date('2025-09-01T09:00:00Z');
  let { staat, bon: oud } = pasToe(LEEG, { op: 'nieuw', bon: { klant: { naam: 'Oud' } } }, toen);
  ({ staat } = pasToe(staat, { op: 'status', id: oud.id, status: 'opgehaald' }, toen));
  let nietOpgehaald;
  ({ staat, bon: nietOpgehaald } = pasToe(staat, { op: 'nieuw', bon: { klant: { naam: 'Vergeten' } } }, toen));
  assert.equal(staat.instellingen.bewaarMaanden, 12);

  // 13 maanden later: de opgehaalde bon is weg, de vergeten bon niet.
  ({ staat } = nieuw(staat, { klant: { naam: 'Nieuw' } }));
  assert.deepEqual(staat.bonnen.map((b) => b.klant.naam), ['Vergeten', 'Nieuw']);
  assert.equal(staat.bonnen[0].id, nietOpgehaald.id);
});

test('bewaartermijn instellen: 1 tot 24 maanden, en de winkel ziet meteen het resultaat', () => {
  assert.throws(() => pasToe(LEEG, { op: 'instellingen', bewaarMaanden: 0 }, nu), /1 tot 24/);
  assert.throws(() => pasToe(LEEG, { op: 'instellingen', bewaarMaanden: 25 }, nu), /1 tot 24/);
  const tweeMaandenGeleden = new Date('2026-08-01T09:00:00Z');
  let { staat, bon } = pasToe(LEEG, { op: 'nieuw', bon: { klant: { naam: 'A' } } }, tweeMaandenGeleden);
  ({ staat } = pasToe(staat, { op: 'status', id: bon.id, status: 'opgehaald' }, tweeMaandenGeleden));
  assert.equal(voorWinkel(staat, nu).bonnen.length, 1);
  ({ staat } = pasToe(staat, { op: 'instellingen', bewaarMaanden: 1 }, nu));
  assert.equal(staat.instellingen.bewaarMaanden, 1);
  assert.equal(staat.bonnen.length, 0);
  assert.equal(voorWinkel(staat, nu).instellingen.bewaarMaanden, 1);
  // Zonder schrijven ziet de winkel ook niets meer dat over tijd is.
  const zonderOpruimen = { ...staat, bonnen: [{ ...bon, status: 'opgehaald', opgehaaldOp: tweeMaandenGeleden.toISOString() }] };
  assert.equal(voorWinkel(zonderOpruimen, nu).bonnen.length, 0);
});

test('eigen prijslijst: wordt opgeschoond, blijft bewaard bij andere wijzigingen, null zet terug', () => {
  let { staat } = pasToe(LEEG, {
    op: 'prijslijst',
    prijslijst: {
      groepen: [{ titel: 'Kleding', wassenLabel: 'wassen + strijken', stukken: [
        { naam: ' Hemd ', strijken: '2,50', wassen: 4.5 },
        { naam: '', strijken: 1 },
        { naam: 'Sjaal', strijken: '' },
      ] }],
      droogkuis: ['Mantel', 'Mantel', ' ', 'Jas'],
    },
  }, nu);
  assert.deepEqual(staat.prijslijst, {
    groepen: [{ titel: 'Kleding', wassenLabel: 'wassen + strijken', stukken: [{ naam: 'Hemd', strijken: 2.5, wassen: 4.5 }, { naam: 'Sjaal' }] }],
    droogkuis: ['Mantel', 'Jas'],
  });
  ({ staat } = nieuw(staat, { klant: { naam: 'A' } }));
  assert.equal(staat.prijslijst.groepen[0].stukken[0].strijken, 2.5);
  ({ staat } = pasToe(staat, { op: 'instellingen', bewaarMaanden: 6 }, nu));
  assert.ok(staat.prijslijst, 'blijft bij instellingen');
  ({ staat } = pasToe(staat, { op: 'prijslijst', prijslijst: null }, nu));
  assert.equal(staat.prijslijst, null);
  assert.throws(() => pasToe(LEEG, { op: 'prijslijst', prijslijst: 'onzin' }, nu), /Ongeldige/);
});

test('klantenbestand: blijft bewaard als de bonnen gewist zijn, en is aan te vullen', async () => {
  const { voorWinkel, klantSleutel } = await import('../lib/bonnen.js');
  const toen = new Date('2025-01-10T09:00:00Z');
  let { staat, bon } = pasToe(LEEG, { op: 'nieuw', bon: { klant: { naam: 'René Peeters', telefoon: '0470 12 34 56' } } }, toen);
  ({ staat } = pasToe(staat, { op: 'status', id: bon.id, status: 'opgehaald' }, toen));
  const sleutel = klantSleutel(bon.klant);
  ({ staat } = pasToe(staat, { op: 'klant', sleutel, klant: { adres: 'Kerkstraat 1, 2000 Antwerpen', btw: 'BE0123456789' } }, toen));
  // Twee jaar later: de bon is weg, de klant niet.
  ({ staat } = pasToe(staat, { op: 'instellingen', bewaarMaanden: 1 }, nu));
  const w = voorWinkel(staat, nu);
  assert.equal(w.bonnen.length, 0);
  assert.equal(w.klantenboek[sleutel].naam, 'René Peeters');
  assert.equal(w.klantenboek[sleutel].adres, 'Kerkstraat 1, 2000 Antwerpen');
  // Oudere gegevens zonder klantenbestand: wordt opgebouwd uit de bonnen.
  const oud = { bonnen: [{ ...bon, binnenOp: toen.toISOString() }], teller: {}, klanten: {} };
  assert.equal(Object.keys(voorWinkel(oud, toen).klantenboek).length, 1);
});

test('betalingen worden genoteerd bij betalen, één keer per bon', () => {
  let { staat, bon } = nieuw(LEEG, { klant: { naam: 'A' }, stukken: [{ naam: 'Hemd', prijs: 2.3, aantal: 2 }], betaald: true, betaalwijze: 'kaart' });
  assert.deepEqual(staat.betalingen.map((p) => [p.wijze, p.bedrag]), [['kaart', 4.6]]);
  ({ staat } = pasToe(staat, { op: 'status', id: bon.id, status: 'opgehaald' }, nu));
  assert.equal(staat.betalingen.length, 1, 'al betaald: geen tweede betaling');
  let b2;
  ({ staat, bon: b2 } = nieuw(staat, { klant: { naam: 'B' }, stukken: [{ naam: 'Broek', prijs: 5 }] }));
  ({ staat } = pasToe(staat, { op: 'status', id: b2.id, status: 'opgehaald', betaalwijze: 'cash' }, nu));
  assert.deepEqual(staat.betalingen.map((p) => [p.nr, p.wijze, p.bedrag]), [[bon.nr, 'kaart', 4.6], [b2.nr, 'cash', 5]]);
});

test('kassa: openen, geld in/uit, afsluiten', () => {
  let { staat } = pasToe(LEEG, { op: 'kassaOpen', dag: '2026-10-09', begin: '150,50' }, nu);
  assert.equal(staat.kassa['2026-10-09'].begin, 150.5);
  ({ staat } = pasToe(staat, { op: 'kassaBeweging', dag: '2026-10-09', bedrag: -50, reden: 'naar de bank' }, nu));
  assert.throws(() => pasToe(staat, { op: 'kassaBeweging', dag: '2026-10-09', bedrag: 5, reden: '' }, nu), /reden/);
  ({ staat } = pasToe(staat, { op: 'kassaSluit', dag: '2026-10-09', geteld: 100.5 }, nu));
  assert.equal(staat.kassa['2026-10-09'].geteld, 100.5);
  assert.throws(() => pasToe(staat, { op: 'kassaBeweging', dag: '2026-10-09', bedrag: 5, reden: 'x' }, nu), /afgesloten/);
  assert.throws(() => pasToe(LEEG, { op: 'kassaOpen', dag: 'gisteren', begin: 5 }, nu), /dag/);
});

test('factuur aanvragen: gegevens bij de klant bewaard, afvinken, en de bon blijft tot de factuur gemaakt is', async () => {
  const { voorWinkel, klantSleutel } = await import('../lib/bonnen.js');
  const toen = new Date('2025-01-10T09:00:00Z');
  let { staat, bon } = pasToe(LEEG, { op: 'nieuw', bon: { klant: { naam: 'Firma X', telefoon: '0470 00 00 01' }, stukken: [{ naam: 'Hemd', prijs: 2.3 }] } }, toen);
  ({ staat, bon } = pasToe(staat, { op: 'factuurVraag', id: bon.id }, toen));
  assert.ok(bon.factuur.gevraagdOp);
  assert.equal(bon.factuur.gemaaktOp, '');
  ({ staat, bon } = pasToe(staat, { op: 'factuurVraag', id: bon.id, gegevens: { naam: 'Firma X BV', adres: 'Straat 1, 2000 Antwerpen', btw: 'BE0111111111' } }, toen));
  assert.equal(staat.klantenboek[klantSleutel(bon.klant)].btw, 'BE0111111111');
  ({ staat } = pasToe(staat, { op: 'status', id: bon.id, status: 'opgehaald' }, toen));
  // Lang na de bewaartermijn: de bon blijft zolang de factuur niet gemaakt is.
  ({ staat } = pasToe(staat, { op: 'instellingen', bewaarMaanden: 1 }, nu));
  assert.equal(voorWinkel(staat, nu).bonnen.length, 1);
  ({ staat, bon } = pasToe(staat, { op: 'factuurGemaakt', id: bon.id }, nu));
  assert.ok(bon.factuur.gemaaktOp);
  assert.equal(voorWinkel(staat, new Date('2026-12-01T09:00:00Z')).bonnen.length, 0);
  // Een nieuwe bon van dezelfde klant krijgt het adres al mee.
  let b2;
  ({ staat, bon: b2 } = nieuw(staat, { klant: { naam: 'Firma X', telefoon: '0470 00 00 01' } }));
  ({ bon: b2 } = pasToe(staat, { op: 'factuurVraag', id: b2.id }, nu));
  assert.equal(b2.factuur.adres, 'Straat 1, 2000 Antwerpen');
  assert.throws(() => pasToe(LEEG, { op: 'factuurGemaakt', id: 'x' }, nu), /niet gevonden/);
});

test('indeling van de winkel: wordt opgeschoond en bewaard, null zet terug op standaard', () => {
  let { staat } = pasToe(LEEG, { op: 'instellingen', indeling: [
    { plaats: '  Kast lingerie ', woorden: ['Lingerie', ' bh ', 'bh', ''] },
    { plaats: 'Rek hemden', woorden: 'hemd, bloes' },
    { plaats: '', woorden: ['zonder plaats'] },
  ] }, nu);
  assert.deepEqual(voorWinkel(staat, nu).instellingen.indeling, [
    { plaats: 'Kast lingerie', woorden: ['lingerie', 'bh'] },
    { plaats: 'Rek hemden', woorden: ['hemd', 'bloes'] },
  ]);
  ({ staat } = pasToe(staat, { op: 'instellingen', bewaarMaanden: 6 }, nu));
  assert.equal(voorWinkel(staat, nu).instellingen.indeling.length, 2, 'blijft bij andere instellingen');
  ({ staat } = pasToe(staat, { op: 'instellingen', indeling: null }, nu));
  assert.equal(voorWinkel(staat, nu).instellingen.indeling, undefined);
});

test('klanten importeren: nieuwe klanten erbij, bestaande enkel aangevuld', () => {
  let { staat } = nieuw(LEEG, { klant: { naam: 'Bocal', telefoon: '0485 75 27 63' } });
  let r = pasToe(staat, { op: 'klantenImport', klanten: [
    { naam: 'Bocal', telefoon: '0485752763', email: 'admin@bocal.be', adres: 'Lodewijk van Berckenlaan 372, 2140 Borgerhout', btw: 'BE 0768.909.595' },
    { naam: 'Immo MVP BV' },
    { naam: 'Immo MVP BV', adres: 'Joe Englishstraat 61, 2140 Borgerhout' },
    { naam: '' },
  ] }, nu);
  staat = r.staat;
  assert.equal(r.nieuw, 1);
  assert.equal(r.aangevuld, 2);
  const boek = voorWinkel(staat, nu).klantenboek;
  assert.equal(Object.keys(boek).length, 2);
  assert.equal(boek['32485752763'].telefoon, '0485 75 27 63', 'bestaande gegevens blijven');
  assert.equal(boek['32485752763'].btw, 'BE 0768.909.595');
  assert.equal(boek['naam:immo mvp bv'].adres, 'Joe Englishstraat 61, 2140 Borgerhout');
});

test('vlekken per stuk en een klant met vlekkenrapport', () => {
  let { staat, bon } = nieuw(LEEG, {
    klant: { naam: 'Flying Service NV' },
    stukken: [
      { naam: 'Hemd (strijken)', aantal: 3, prijs: 2.3, vlek: '  1 hemd: kraag ' },
      { naam: 'Broek (strijken)', aantal: 1, prijs: 2.3, vlek: '' },
    ],
  });
  assert.equal(bon.stukken[0].vlek, '1 hemd: kraag');
  assert.equal(bon.stukken[0].vlekAantal, 3, 'niet ingevuld: allemaal');
  assert.equal('vlek' in bon.stukken[1], false, 'geen vlek: geen veld');
  ({ bon } = nieuw(LEEG, { klant: { naam: 'X' }, stukken: [
    { naam: 'Servet', aantal: 10, vlek: 'rode wijn', vlekAantal: 3 },
    { naam: 'Theenap', aantal: 2, vlek: 'koffie', vlekAantal: 9 },
  ] }));
  assert.equal(bon.stukken[0].vlekAantal, 3);
  assert.equal(bon.stukken[1].vlekAantal, 2, 'nooit meer dan het aantal');
  ({ staat } = pasToe(staat, { op: 'klant', sleutel: 'naam:flying service nv', klant: { vlekkenrapport: true } }, nu));
  assert.equal(voorWinkel(staat, nu).klantenboek['naam:flying service nv'].vlekkenrapport, true);
  ({ staat } = pasToe(staat, { op: 'klant', sleutel: 'naam:flying service nv', klant: { notitie: 'x' } }, nu));
  assert.equal(voorWinkel(staat, nu).klantenboek['naam:flying service nv'].vlekkenrapport, true, 'blijft aan bij andere wijziging');
});

test('kassa verbeteren: beginbedrag, beweging en betaling, met een spoor van elke correctie', () => {
  const dag = '2026-10-09';
  let { staat } = pasToe(LEEG, { op: 'kassaOpen', dag, begin: 100 }, nu);
  ({ staat } = pasToe(staat, { op: 'kassaOpen', dag, begin: 120 }, nu));
  assert.equal(staat.kassa[dag].begin, 120);
  assert.match(staat.kassa[dag].correcties[0].tekst, /Beginbedrag € 100,00 → € 120,00/);

  ({ staat } = pasToe(staat, { op: 'kassaBeweging', dag, bedrag: -50, reden: 'bank' }, nu));
  ({ staat } = pasToe(staat, { op: 'kassaBewegingWijzig', dag, index: 0, bedrag: -40, reden: 'naar de bank' }, nu));
  assert.deepEqual(staat.kassa[dag].bewegingen.map((b) => [b.bedrag, b.reden]), [[-40, 'naar de bank']]);
  ({ staat } = pasToe(staat, { op: 'kassaBewegingWijzig', dag, index: 0, weg: true }, nu));
  assert.equal(staat.kassa[dag].bewegingen.length, 0);

  let bon;
  ({ staat, bon } = nieuw(staat, { klant: { naam: 'Jan' }, stukken: [{ naam: 'Hemd', aantal: 2, prijs: 5 }], betaald: true, betaalwijze: 'kaart' }));
  const id = staat.betalingen[0].id;
  ({ staat } = pasToe(staat, { op: 'betalingWijzig', id, wijze: 'cash', bedrag: '9,50' }, nu));
  assert.deepEqual([staat.betalingen[0].wijze, staat.betalingen[0].bedrag], ['cash', 9.5]);
  assert.equal(staat.bonnen.find((b) => b.id === bon.id).betaalwijze, 'cash');
  ({ staat } = pasToe(staat, { op: 'betalingWijzig', id, weg: true }, nu));
  assert.ok(staat.betalingen[0].geschraptOp, 'blijft bewaard, maar geschrapt');
  assert.equal(staat.bonnen.find((b) => b.id === bon.id).betaald, false);
  assert.throws(() => pasToe(staat, { op: 'betalingWijzig', id, wijze: 'kaart' }, nu), /geschrapt/);
  assert.equal(staat.kassa[dag].correcties.length, 5);

  ({ staat } = pasToe(staat, { op: 'kassaSluit', dag, geteld: 120 }, nu));
  assert.throws(() => pasToe(staat, { op: 'kassaOpen', dag, begin: 1 }, nu), /afgesloten/);
  assert.throws(() => pasToe(staat, { op: 'kassaBeweging', dag, bedrag: 5, reden: 'x' }, nu), /afgesloten/);
});

test('de kassa en de betalingen blijven bewaard, ook als de bonnen opgeruimd worden', () => {
  let { staat, bon } = nieuw(LEEG, { klant: { naam: 'Oud' }, stukken: [{ naam: 'Hemd', aantal: 1, prijs: 3 }] });
  ({ staat } = pasToe(staat, { op: 'kassaOpen', dag: '2026-10-09', begin: 50 }, nu));
  ({ staat } = pasToe(staat, { op: 'status', id: bon.id, status: 'opgehaald', betaalwijze: 'cash' }, nu));
  const later = new Date('2029-01-01T09:00:00Z');
  ({ staat } = pasToe(staat, { op: 'kassaOpen', dag: '2029-01-01', begin: 0 }, later));
  assert.equal(staat.bonnen.length, 0, 'de opgehaalde bon is opgeruimd');
  assert.equal(staat.betalingen.length, 1);
  assert.equal(staat.kassa['2026-10-09'].begin, 50);
});
