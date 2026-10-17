// De regels van de winkel-app: hoe een bon eruitziet en wat je ermee mag doen.
// Puur rekenwerk, zonder opslag, zodat het makkelijk te testen is.

export const STATUSSEN = ['binnen', 'klaar', 'opgehaald'];
export const BETAALWIJZEN = ['', 'cash', 'kaart', 'dienstencheques', 'overschrijving'];
export const SOORTEN = ['Strijk', 'Was', 'Droogkuis', 'Schoenen', 'Motorkleding', 'Ander'];
export const BEHANDELINGEN = ['strijk', 'was', 'droogkuis', 'ander'];

// Hoe lang opgehaalde bonnen bewaard blijven, in maanden; de winkel kiest zelf tussen 1 en 24.
export const BEWAAR_MIN = 1;
export const BEWAAR_MAX = 24;
export const BETAALWIJZEN_KASSA = ['cash', 'kaart', 'dienstencheques', 'overschrijving'];
export const STANDAARD_INSTELLINGEN = { bewaarMaanden: 12, formaat: 'klein' };

export const LEEG = {
  bonnen: [], teller: {}, klanten: {}, instellingen: STANDAARD_INSTELLINGEN,
  klantenboek: {}, betalingen: [], kassa: {},
};

/**
 * Een gsm-nummer als sleutel: enkel cijfers, met landcode.
 * "0470 12 34 56", "+32 470123456" en "0032470123456" worden allemaal "32470123456".
 */
export function telefoonSleutel(tel) {
  let d = String(tel || '').replace(/[^\d+]/g, '');
  if (d.startsWith('+')) d = d.slice(1);
  else if (d.startsWith('00')) d = d.slice(2);
  else if (d.startsWith('0')) d = '32' + d.slice(1);
  return /^\d{8,15}$/.test(d) ? d : '';
}

const BLOKKEER_NA = 5;
const BLOKKEER_MS = 15 * 60 * 1000;

const MAX = { naam: 80, telefoon: 30, email: 120, opmerking: 500, stukNaam: 80, stukken: 60, locatie: 40 };

function tekst(v, max) {
  return String(v ?? '').trim().slice(0, max);
}

function bedrag(v) {
  const n = Math.round(Number(String(v ?? '').replace(',', '.')) * 100) / 100;
  return Number.isFinite(n) && n >= 0 && n < 10000 ? n : 0;
}

/** Een prijs mag leeg blijven ("prijs volgt"), bijvoorbeeld bij droogkuis. */
function prijsOfLeeg(v) {
  return v === null || v === undefined || String(v).trim() === '' ? null : bedrag(v);
}

/** Oudere bonnen hebben nog geen behandeling per stuk: afleiden uit de naam. */
function behandelingVan(s) {
  if (BEHANDELINGEN.includes(s?.behandeling)) return s.behandeling;
  const naam = String(s?.naam || '').toLowerCase();
  if (naam.includes('(strijken)')) return 'strijk';
  if (naam.includes('(wassen')) return 'was';
  return 'ander';
}

function datum(v) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(v || '')) ? String(v) : '';
}

/** Houdt enkel de velden over die we kennen, met redelijke grenzen. */
export function schoonStukken(stukken) {
  if (!Array.isArray(stukken)) return [];
  return stukken.slice(0, MAX.stukken).flatMap((s) => {
    const naam = tekst(s?.naam, MAX.stukNaam);
    if (!naam) return [];
    const aantal = Math.min(999, Math.max(1, Math.round(Number(s?.aantal) || 1)));
    const stuk = { naam, aantal, prijs: prijsOfLeeg(s?.prijs), behandeling: behandelingVan(s) };
    // Waar een vlek zit (bv. "kraag, linkermouw"); leeg = geen vlek.
    const vlek = tekst(s?.vlek, 120);
    if (vlek) {
      stuk.vlek = vlek;
      // Hoeveel van de stukken een vlek hebben (bv. 3 van 10 servetten); niet ingevuld = allemaal.
      const n = Math.round(Number(s?.vlekAantal));
      stuk.vlekAantal = n >= 1 ? Math.min(n, aantal) : aantal;
    }
    return [stuk];
  });
}

/** Totaal van de stukken met een prijs; stukken zonder prijs tellen (nog) niet mee. */
export function totaal(stukken) {
  return Math.round(stukken.reduce((som, s) => som + s.aantal * (s.prijs ?? 0), 0) * 100) / 100;
}

export function prijsOpen(stukken) {
  return stukken.some((s) => s.prijs === null);
}

const SOORT_VAN = { strijk: 'Strijk', was: 'Was', droogkuis: 'Droogkuis' };

/** Wat de klant binnenbracht: de gekozen soorten, aangevuld met wat uit de stukken blijkt. */
function soortenVan(invoer, stukken) {
  const gekozen = Array.isArray(invoer.soorten) ? invoer.soorten : invoer.soort ? String(invoer.soort).split(' + ') : [];
  const set = new Set(gekozen.filter((x) => SOORTEN.includes(x)));
  for (const st of stukken) if (SOORT_VAN[st.behandeling]) set.add(SOORT_VAN[st.behandeling]);
  if (!set.size) set.add('Strijk');
  return SOORTEN.filter((x) => set.has(x));
}

function velden(invoer) {
  const stukken = schoonStukken(invoer.stukken);
  const soorten = soortenVan(invoer, stukken);
  if (soorten.includes('Droogkuis') && !stukken.some((st) => st.behandeling === 'droogkuis')) {
    throw new Fout('Vul bij droogkuis in welke stukken de klant binnenbrengt');
  }
  return {
    klant: {
      naam: tekst(invoer.klant?.naam, MAX.naam),
      telefoon: tekst(invoer.klant?.telefoon, MAX.telefoon),
      email: tekst(invoer.klant?.email, MAX.email),
    },
    soorten,
    soort: soorten.join(' + '),
    stukken,
    totaal: totaal(stukken),
    prijsOpen: prijsOpen(stukken),
    opmerking: tekst(invoer.opmerking, MAX.opmerking),
    locatie: tekst(invoer.locatie, MAX.locatie),
    klaarTegen: datum(invoer.klaarTegen),
    betaald: Boolean(invoer.betaald),
    betaalwijze: BETAALWIJZEN.includes(invoer.betaalwijze) ? invoer.betaalwijze : '',
  };
}

/**
 * De eigen prijslijst van de winkel, in dezelfde vorm als prijzen.js:
 * groepen met stukken (prijs per behandeling) en de namen van de droogkuisstukken.
 */
export function schoonPrijslijst(p) {
  if (!p || typeof p !== 'object') return null;
  const groepen = (Array.isArray(p.groepen) ? p.groepen : []).slice(0, 30).map((g) => ({
    titel: tekst(g?.titel, 60) || 'Overige',
    wassenLabel: tekst(g?.wassenLabel, 30),
    stukken: (Array.isArray(g?.stukken) ? g.stukken : []).slice(0, 200).flatMap((s) => {
      const naam = tekst(s?.naam, MAX.stukNaam);
      if (!naam) return [];
      const stuk = { naam };
      for (const k of ['strijken', 'wassen', 'prijs']) {
        const v = prijsOfLeeg(s?.[k]);
        if (v !== null) stuk[k] = v;
      }
      return [stuk];
    }),
  }));
  const droogkuis = [...new Set((Array.isArray(p.droogkuis) ? p.droogkuis : []).map((n) => tekst(n, MAX.stukNaam)).filter(Boolean))].slice(0, 100);
  return { groepen, droogkuis };
}

export function instellingenVan(staat) {
  const i = staat?.instellingen || {};
  const m = Math.round(Number(i.bewaarMaanden));
  const uit = {
    bewaarMaanden: m >= BEWAAR_MIN && m <= BEWAAR_MAX ? m : STANDAARD_INSTELLINGEN.bewaarMaanden,
    formaat: i.formaat === 'a4' ? 'a4' : 'klein',
  };
  // Zonder eigen indeling gebruikt de app een standaardindeling.
  if (Array.isArray(i.indeling)) uit.indeling = indelingVan(i.indeling);
  return uit;
}

/**
 * De indeling van de winkel: waar welk stuk naartoe gaat (een rek, een kast...).
 * Een stuk komt bij de eerste plaats waarvan een woord in de naam van het stuk staat.
 */
function indelingVan(lijst) {
  return (Array.isArray(lijst) ? lijst : []).slice(0, 30).map((r) => ({
    plaats: tekst(r?.plaats, 40),
    woorden: [...new Set((Array.isArray(r?.woorden) ? r.woorden : String(r?.woorden || '').split(','))
      .map((w) => tekst(w, 30).toLowerCase()).filter(Boolean))].slice(0, 30),
  })).filter((r) => r.plaats);
}

/** Zoeken en vergelijken zonder hoofdletters en accenten. */
function zoekVorm(t) {
  return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

/** Eén sleutel per klant: het gsm-nummer, of anders de naam. */
export function klantSleutel(klant) {
  return telefoonSleutel(klant?.telefoon) || 'naam:' + zoekVorm(klant?.naam);
}

/**
 * Het klantenbestand blijft altijd bewaard, ook als de bonnen van een klant al gewist zijn.
 * Oudere gegevens hebben er nog geen: dan bouwen we het uit de bonnen.
 */
export function klantenboekVan(staat) {
  if (staat.klantenboek) return { ...staat.klantenboek };
  const boek = {};
  const bonnen = [...(staat.bonnen || [])].sort((a, b) => String(a.binnenOp).localeCompare(String(b.binnenOp)));
  for (const b of bonnen) zetKlant(boek, b.klant, b.binnenOp || '');
  return boek;
}

function zetKlant(boek, klant, iso, extra = {}) {
  const naam = tekst(klant?.naam, MAX.naam);
  if (!naam) return null;
  const sleutel = klantSleutel(klant);
  const oud = boek[sleutel] || { sinds: iso, adres: '', btw: '', notitie: '' };
  boek[sleutel] = {
    ...oud,
    sleutel,
    naam,
    telefoon: tekst(klant.telefoon, MAX.telefoon) || oud.telefoon || '',
    email: tekst(klant.email, MAX.email) || oud.email || '',
    ...extra,
    gewijzigdOp: iso,
  };
  return boek[sleutel];
}

/** De dag van een tijdstip in Belgische tijd (YYYY-MM-DD), voor de kassa en het dagoverzicht. */
export function dagVan(iso, tijdzone = 'Europe/Brussels') {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: tijdzone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function noteerBetaling(staat, bon, wijze, iso) {
  if (!bon.totaal) return;
  staat.betalingen.push({
    id: 'p' + Date.parse(iso).toString(36) + Math.random().toString(36).slice(2, 6),
    bonId: bon.id,
    nr: bon.nr,
    naam: bon.klant.naam,
    bedrag: bon.totaal,
    wijze: BETAALWIJZEN_KASSA.includes(wijze) ? wijze : 'onbekend',
    op: iso,
  });
}

function bedragMetTeken(v) {
  const n = Math.round(Number(String(v ?? '').replace(',', '.')) * 100) / 100;
  if (!Number.isFinite(n) || Math.abs(n) >= 100000) throw new Fout('Ongeldig bedrag');
  return n;
}

function kassaDag(staat, dag) {
  if (!datum(dag)) throw new Fout('Ongeldige dag');
  return { bewegingen: [], ...(staat.kassa[dag] || {}) };
}

const euro = (n) => '€ ' + Number(n).toFixed(2).replace('.', ',');

/** Een correctie in de kassa: de kassa van die dag moet open zijn, en elke wijziging blijft zichtbaar. */
function kassaCorrectie(staat, dag, tekst, iso) {
  const k = kassaDag(staat, dag);
  if (k.geslotenOp) throw new Fout('De kassa van die dag is afgesloten. Open ze eerst opnieuw om iets te verbeteren.');
  staat.kassa[dag] = { ...k, correcties: [...(k.correcties || []), { tekst, op: iso }] };
}

/**
 * De bonnen die blijven: opgehaalde bonnen verdwijnen na de gekozen bewaartermijn,
 * gerekend vanaf het ophalen. Wat nog niet opgehaald is, blijft altijd staan.
 */
export function teBewaren(staat, nu = new Date()) {
  const grens = new Date(nu);
  grens.setMonth(grens.getMonth() - instellingenVan(staat).bewaarMaanden);
  const iso = grens.toISOString();
  // Een gevraagde factuur die nog niet gemaakt is, houdt de bon vast.
  return (staat.bonnen || []).filter((b) => !(b.status === 'opgehaald' && b.opgehaaldOp && b.opgehaaldOp < iso && !(b.factuur && !b.factuur.gemaaktOp)));
}

/** Elk bonnummer is een willekeurig getal van 6 cijfers, dat nog niet bij een andere bon hoort. */
function volgendNummer(staat) {
  const bezet = new Set(staat.bonnen.map((b) => String(b.nr).replace(/\D/g, '')));
  for (;;) {
    const nr = String(100000 + Math.floor(Math.random() * 900000));
    if (!bezet.has(nr)) return nr;
  }
}

export class Fout extends Error {
  constructor(boodschap, status = 400) {
    super(boodschap);
    this.status = status;
  }
}

/**
 * Past één handeling toe op de staat en geeft de nieuwe staat terug.
 * De server roept dit aan op de meest recente versie, zodat twee toestellen
 * elkaars werk niet overschrijven.
 */
export function pasToe(oud, actie, nu = new Date()) {
  const resultaat = handeling(oud, actie, nu);
  // Bij elke wijziging meteen opruimen wat over de bewaartermijn is.
  resultaat.staat.bonnen = teBewaren(resultaat.staat, nu);
  return resultaat;
}

function handeling(oud, actie, nu) {
  const staat = {
    bonnen: [...(oud.bonnen || [])],
    teller: { ...(oud.teller || {}) },
    klanten: { ...(oud.klanten || {}) },
    instellingen: instellingenVan(oud),
    prijslijst: oud.prijslijst || null,
    klantenboek: klantenboekVan(oud),
    betalingen: [...(oud.betalingen || [])],
    kassa: { ...(oud.kassa || {}) },
  };
  const iso = nu.toISOString();
  const zoek = (id) => {
    const i = staat.bonnen.findIndex((b) => b.id === id);
    if (i < 0) throw new Fout('Bon niet gevonden', 404);
    return i;
  };

  switch (actie?.op) {
    case 'nieuw': {
      const v = velden(actie.bon || {});
      if (!v.klant.naam) throw new Fout('Vul de naam van de klant in');
      const bon = {
        id: 'b' + nu.getTime().toString(36) + Math.random().toString(36).slice(2, 6),
        nr: volgendNummer(staat),
        ...v,
        status: 'binnen',
        binnenOp: iso,
        klaarOp: '',
        opgehaaldOp: '',
        verwittigdOp: '',
        gewijzigdOp: iso,
      };
      staat.bonnen.push(bon);
      zetKlant(staat.klantenboek, bon.klant, iso);
      if (bon.betaald) noteerBetaling(staat, bon, bon.betaalwijze, iso);
      return { staat, bon };
    }
    case 'wijzig': {
      const i = zoek(actie.id);
      const v = velden({ ...staat.bonnen[i], ...(actie.bon || {}) });
      if (!v.klant.naam) throw new Fout('Vul de naam van de klant in');
      const wasBetaald = staat.bonnen[i].betaald;
      staat.bonnen[i] = { ...staat.bonnen[i], ...v, gewijzigdOp: iso };
      zetKlant(staat.klantenboek, v.klant, iso);
      if (!wasBetaald && v.betaald) noteerBetaling(staat, staat.bonnen[i], v.betaalwijze, iso);
      return { staat, bon: staat.bonnen[i] };
    }
    case 'status': {
      if (!STATUSSEN.includes(actie.status)) throw new Fout('Onbekende status');
      const i = zoek(actie.id);
      const b = { ...staat.bonnen[i], status: actie.status, gewijzigdOp: iso };
      if (actie.status === 'binnen') { b.klaarOp = ''; b.opgehaaldOp = ''; }
      if (actie.status === 'klaar') { b.klaarOp = b.klaarOp || iso; b.opgehaaldOp = ''; }
      if (actie.status === 'opgehaald') {
        b.klaarOp = b.klaarOp || iso;
        b.opgehaaldOp = iso;
        if (actie.betaalwijze !== undefined) {
          if (!b.betaald) noteerBetaling(staat, b, actie.betaalwijze, iso);
          b.betaald = true;
          b.betaalwijze = BETAALWIJZEN.includes(actie.betaalwijze) ? actie.betaalwijze : b.betaalwijze;
        }
      }
      staat.bonnen[i] = b;
      return { staat, bon: b };
    }
    case 'locatie': {
      // Waar de kleren liggen of hangen (rek, plank, mand), los van de rest van de bon.
      const i = zoek(actie.id);
      staat.bonnen[i] = { ...staat.bonnen[i], locatie: tekst(actie.locatie, MAX.locatie), gewijzigdOp: iso };
      return { staat, bon: staat.bonnen[i] };
    }
    case 'instellingen': {
      const nieuw = { ...staat.instellingen };
      if (actie.bewaarMaanden !== undefined) {
        const m = Math.round(Number(actie.bewaarMaanden));
        if (!(m >= BEWAAR_MIN && m <= BEWAAR_MAX)) throw new Fout(`Kies een bewaartermijn van ${BEWAAR_MIN} tot ${BEWAAR_MAX} maanden`);
        nieuw.bewaarMaanden = m;
      }
      if (actie.formaat !== undefined) nieuw.formaat = actie.formaat === 'a4' ? 'a4' : 'klein';
      if (actie.indeling !== undefined) {
        if (actie.indeling === null) delete nieuw.indeling;
        else nieuw.indeling = indelingVan(actie.indeling);
      }
      staat.instellingen = nieuw;
      return { staat };
    }
    case 'klantenImport': {
      // Een lijst klanten in één keer toevoegen (bv. uit Excel). Bestaande klanten (zelfde gsm,
      // of zonder gsm dezelfde naam) worden enkel aangevuld: wat al ingevuld is, blijft staan.
      const lijst = Array.isArray(actie.klanten) ? actie.klanten.slice(0, 2000) : [];
      let nieuw = 0;
      let aangevuld = 0;
      for (const k of lijst) {
        const naam = tekst(k?.naam, MAX.naam);
        if (!naam) continue;
        const invoer = { naam, telefoon: tekst(k.telefoon, MAX.telefoon), email: tekst(k.email, MAX.email) };
        const sleutel = klantSleutel(invoer);
        const oud = staat.klantenboek[sleutel];
        const extra = {
          adres: oud?.adres || tekst(k.adres, 160),
          btw: oud?.btw || tekst(k.btw, 30),
          notitie: oud?.notitie || tekst(k.notitie, 300),
        };
        if (oud) {
          staat.klantenboek[sleutel] = {
            ...oud,
            ...extra,
            telefoon: oud.telefoon || invoer.telefoon,
            email: oud.email || invoer.email,
            gewijzigdOp: iso,
          };
          aangevuld++;
        } else {
          zetKlant(staat.klantenboek, invoer, iso, extra);
          nieuw++;
        }
      }
      return { staat, nieuw, aangevuld };
    }
    case 'klant': {
      // Klantgegevens aanvullen (adres, btw-nummer voor facturen, notitie).
      const sleutel = String(actie.sleutel || '');
      const oud = staat.klantenboek[sleutel];
      if (!oud) throw new Fout('Klant niet gevonden', 404);
      const k = actie.klant || {};
      const naam = tekst(k.naam ?? oud.naam, MAX.naam);
      if (!naam) throw new Fout('Vul de naam van de klant in');
      staat.klantenboek[sleutel] = {
        ...oud,
        naam,
        telefoon: tekst(k.telefoon ?? oud.telefoon, MAX.telefoon),
        email: tekst(k.email ?? oud.email, MAX.email),
        adres: tekst(k.adres ?? oud.adres, 160),
        btw: tekst(k.btw ?? oud.btw, 30),
        notitie: tekst(k.notitie ?? oud.notitie, 300),
        // Klant krijgt een aparte A4-bon met vlekkencontrole (bv. een bedrijf dat dat vraagt).
        vlekkenrapport: Boolean(k.vlekkenrapport ?? oud.vlekkenrapport),
        gewijzigdOp: iso,
      };
      return { staat, klant: staat.klantenboek[sleutel] };
    }
    case 'kassaOpen': {
      const k = kassaDag(staat, actie.dag);
      if (k.geslotenOp) throw new Fout('De kassa van die dag is al afgesloten');
      const begin = bedragMetTeken(actie.begin);
      if (begin < 0) throw new Fout('Het beginbedrag kan niet negatief zijn');
      staat.kassa[actie.dag] = { ...k, begin, geopendOp: k.geopendOp || iso };
      // Een beginbedrag achteraf aanpassen is een correctie.
      if (k.geopendOp && k.begin !== begin) kassaCorrectie(staat, actie.dag, `Beginbedrag ${euro(k.begin ?? 0)} → ${euro(begin)}`, iso);
      return { staat };
    }
    case 'kassaBeweging': {
      const k = kassaDag(staat, actie.dag);
      if (k.geslotenOp) throw new Fout('De kassa van die dag is al afgesloten');
      const b = bedragMetTeken(actie.bedrag);
      if (!b) throw new Fout('Vul een bedrag in');
      const reden = tekst(actie.reden, 80);
      if (!reden) throw new Fout('Vul een reden in, bv. "wisselgeld" of "naar de bank"');
      staat.kassa[actie.dag] = { ...k, bewegingen: [...k.bewegingen, { bedrag: b, reden, op: iso }] };
      return { staat };
    }
    case 'kassaSluit': {
      const k = kassaDag(staat, actie.dag);
      const geteld = bedragMetTeken(actie.geteld);
      if (geteld < 0) throw new Fout('Het getelde bedrag kan niet negatief zijn');
      staat.kassa[actie.dag] = { ...k, geteld, geslotenOp: iso };
      return { staat };
    }
    case 'kassaBewegingWijzig': {
      // Een verkeerde beweging (geld in/uit) verbeteren of schrappen.
      const k = kassaDag(staat, actie.dag);
      const i = Number(actie.index);
      const oud = k.bewegingen[i];
      if (!Number.isInteger(i) || !oud) throw new Fout('Beweging niet gevonden', 404);
      const wat = `${oud.bedrag < 0 ? 'Uit' : 'In'} de kassa "${oud.reden}" ${euro(Math.abs(oud.bedrag))}`;
      if (actie.weg) {
        kassaCorrectie(staat, actie.dag, `${wat}: geschrapt`, iso);
        staat.kassa[actie.dag].bewegingen = k.bewegingen.filter((_, j) => j !== i);
        return { staat };
      }
      const b = bedragMetTeken(actie.bedrag);
      if (!b) throw new Fout('Vul een bedrag in');
      const reden = tekst(actie.reden, 80);
      if (!reden) throw new Fout('Vul een reden in');
      kassaCorrectie(staat, actie.dag, `${wat} → ${b < 0 ? 'uit' : 'in'} "${reden}" ${euro(Math.abs(b))}`, iso);
      staat.kassa[actie.dag].bewegingen = k.bewegingen.map((x, j) => (j === i ? { ...x, bedrag: b, reden } : x));
      return { staat };
    }
    case 'betalingWijzig': {
      // Een verkeerd ingegeven betaling verbeteren (betaalwijze of bedrag) of ongedaan maken.
      const i = staat.betalingen.findIndex((p) => p.id === actie.id);
      if (i < 0) throw new Fout('Betaling niet gevonden', 404);
      const p = staat.betalingen[i];
      if (p.geschraptOp) throw new Fout('Deze betaling is al geschrapt');
      const dag = dagVan(p.op);
      const wat = `Betaling ${p.nr} (${p.naam}) ${euro(p.bedrag)} ${p.wijze}`;
      if (actie.weg) {
        kassaCorrectie(staat, dag, `${wat}: geschrapt`, iso);
        staat.betalingen[i] = { ...p, geschraptOp: iso };
        // De bon staat dan weer als niet betaald.
        const b = staat.bonnen.findIndex((x) => x.id === p.bonId);
        if (b >= 0) staat.bonnen[b] = { ...staat.bonnen[b], betaald: false, betaalwijze: '', gewijzigdOp: iso };
        return { staat };
      }
      const wijze = actie.wijze === undefined ? p.wijze : actie.wijze;
      if (!BETAALWIJZEN_KASSA.includes(wijze)) throw new Fout('Kies een betaalwijze');
      const bedrag = actie.bedrag === undefined ? p.bedrag : bedragMetTeken(actie.bedrag);
      if (!(bedrag > 0)) throw new Fout('Het bedrag moet groter dan 0 zijn');
      if (wijze === p.wijze && bedrag === p.bedrag) return { staat };
      kassaCorrectie(staat, dag, `${wat} → ${euro(bedrag)} ${wijze}`, iso);
      staat.betalingen[i] = { ...p, wijze, bedrag };
      const b = staat.bonnen.findIndex((x) => x.id === p.bonId);
      if (b >= 0 && wijze !== p.wijze) staat.bonnen[b] = { ...staat.bonnen[b], betaalwijze: wijze, gewijzigdOp: iso };
      return { staat };
    }
    case 'kassaHeropen': {
      const k = kassaDag(staat, actie.dag);
      staat.kassa[actie.dag] = { ...k, geteld: undefined, geslotenOp: '' };
      return { staat };
    }
    case 'factuurVraag': {
      // De klant vraagt een factuur; de zaakvoerder maakt die later zelf (bv. via Peppol).
      const i = zoek(actie.id);
      const b = staat.bonnen[i];
      if (actie.aan === false) {
        staat.bonnen[i] = { ...b, factuur: null, gewijzigdOp: iso };
        return { staat, bon: staat.bonnen[i] };
      }
      const g = actie.gegevens || {};
      const vorig = b.factuur || {};
      const sleutel = klantSleutel(b.klant);
      const k = staat.klantenboek[sleutel] || {};
      const factuur = {
        gevraagdOp: vorig.gevraagdOp || iso,
        gemaaktOp: vorig.gemaaktOp || '',
        naam: tekst(g.naam ?? vorig.naam ?? '', MAX.naam),
        adres: tekst(g.adres ?? vorig.adres ?? k.adres ?? '', 160),
        btw: tekst(g.btw ?? vorig.btw ?? k.btw ?? '', 30),
        email: tekst(g.email ?? vorig.email ?? b.klant.email ?? k.email ?? '', MAX.email),
      };
      staat.bonnen[i] = { ...b, factuur, gewijzigdOp: iso };
      // Adres en btw-nummer ook bij de klant bewaren, voor een volgende keer.
      if (staat.klantenboek[sleutel]) {
        staat.klantenboek[sleutel] = {
          ...k,
          adres: factuur.adres || k.adres || '',
          btw: factuur.btw || k.btw || '',
          email: k.email || factuur.email,
        };
      }
      return { staat, bon: staat.bonnen[i] };
    }
    case 'factuurGemaakt': {
      const i = zoek(actie.id);
      const b = staat.bonnen[i];
      if (!b.factuur) throw new Fout('Voor deze bon is geen factuur gevraagd');
      staat.bonnen[i] = { ...b, factuur: { ...b.factuur, gemaaktOp: actie.gemaakt === false ? '' : iso }, gewijzigdOp: iso };
      return { staat, bon: staat.bonnen[i] };
    }
    case 'prijslijst': {
      // null zet de standaardprijzen terug.
      staat.prijslijst = actie.prijslijst === null ? null : schoonPrijslijst(actie.prijslijst);
      if (actie.prijslijst !== null && !staat.prijslijst) throw new Fout('Ongeldige prijslijst');
      return { staat };
    }
    case 'verwittigd': {
      const i = zoek(actie.id);
      staat.bonnen[i] = { ...staat.bonnen[i], verwittigdOp: iso, gewijzigdOp: iso };
      return { staat, bon: staat.bonnen[i] };
    }
    case 'verwijder': {
      const i = zoek(actie.id);
      const [bon] = staat.bonnen.splice(i, 1);
      return { staat, bon };
    }
    case 'klantcode': {
      // De server maakt de code en geeft enkel de hash door; de code zelf bewaren we nooit.
      const sleutel = telefoonSleutel(actie.telefoon);
      if (!sleutel) throw new Fout('Vul eerst een geldig gsm-nummer in');
      if (!actie.hash || !actie.zout) throw new Fout('Code ontbreekt');
      const vorig = staat.klanten[sleutel];
      staat.klanten[sleutel] = {
        naam: tekst(actie.naam, MAX.naam) || vorig?.naam || '',
        hash: actie.hash,
        zout: actie.zout,
        v: (vorig?.v || 0) + 1, // oude aanmeldingen vervallen bij een nieuwe code
        sinds: vorig?.sinds || iso,
        laatsteLogin: vorig?.laatsteLogin || '',
        fouten: 0,
        geblokkeerdTot: '',
      };
      return { staat, sleutel };
    }
    case 'loginFout': {
      const k = staat.klanten[actie.sleutel];
      if (!k) throw new Fout('Onbekende klant', 404);
      const fouten = (k.fouten || 0) + 1;
      staat.klanten[actie.sleutel] = fouten >= BLOKKEER_NA
        ? { ...k, fouten: 0, geblokkeerdTot: new Date(nu.getTime() + BLOKKEER_MS).toISOString() }
        : { ...k, fouten };
      return { staat };
    }
    case 'loginOk': {
      const k = staat.klanten[actie.sleutel];
      if (!k) throw new Fout('Onbekende klant', 404);
      staat.klanten[actie.sleutel] = { ...k, fouten: 0, geblokkeerdTot: '', laatsteLogin: iso };
      return { staat };
    }
    default:
      throw new Fout('Onbekende handeling');
  }
}

/** Wat de winkel te zien krijgt: alles, behalve de geheime delen van de klantcodes. */
export function voorWinkel(staat, nu = new Date()) {
  const klanten = {};
  for (const [sleutel, k] of Object.entries(staat.klanten || {})) {
    klanten[sleutel] = { naam: k.naam, sinds: k.sinds, laatsteLogin: k.laatsteLogin };
  }
  return {
    bonnen: teBewaren(staat, nu),
    teller: staat.teller || {},
    klanten,
    instellingen: instellingenVan(staat),
    prijslijst: staat.prijslijst || null,
    klantenboek: klantenboekVan(staat),
    betalingen: staat.betalingen || [],
    kassa: staat.kassa || {},
  };
}

/** Wat een klant te zien krijgt: enkel de eigen bonnen, zonder interne opmerkingen of locatie. */
export function voorKlant(staat, sleutel, nu = new Date()) {
  const bonnen = teBewaren(staat, nu)
    .filter((b) => telefoonSleutel(b.klant?.telefoon) === sleutel)
    .map((b) => ({
      nr: b.nr,
      soort: b.soort,
      stukken: b.stukken,
      totaal: b.totaal,
      prijsOpen: Boolean(b.prijsOpen),
      status: b.status,
      binnenOp: b.binnenOp,
      klaarTegen: b.klaarTegen,
      klaarOp: b.klaarOp,
      opgehaaldOp: b.opgehaaldOp,
      betaald: b.betaald,
    }))
    .sort((a, b) => b.binnenOp.localeCompare(a.binnenOp));
  return { naam: staat.klanten?.[sleutel]?.naam || '', bonnen };
}
