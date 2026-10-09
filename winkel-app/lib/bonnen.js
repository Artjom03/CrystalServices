// De regels van de winkel-app: hoe een bon eruitziet en wat je ermee mag doen.
// Puur rekenwerk, zonder opslag, zodat het makkelijk te testen is.

export const STATUSSEN = ['binnen', 'klaar', 'opgehaald'];
export const BETAALWIJZEN = ['', 'cash', 'kaart', 'dienstencheques', 'overschrijving'];
export const SOORTEN = ['Strijk', 'Was', 'Droogkuis', 'Schoenen', 'Motorkleding', 'Ander'];
export const BEHANDELINGEN = ['strijk', 'was', 'droogkuis', 'ander'];

// Hoe lang opgehaalde bonnen bewaard blijven, in maanden; de winkel kiest zelf tussen 1 en 24.
export const BEWAAR_MIN = 1;
export const BEWAAR_MAX = 24;
export const STANDAARD_INSTELLINGEN = { bewaarMaanden: 12 };

export const LEEG = { bonnen: [], teller: {}, klanten: {}, instellingen: STANDAARD_INSTELLINGEN };

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
    return [{ naam, aantal, prijs: prijsOfLeeg(s?.prijs), behandeling: behandelingVan(s) }];
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
  const m = Math.round(Number(staat?.instellingen?.bewaarMaanden));
  return { bewaarMaanden: m >= BEWAAR_MIN && m <= BEWAAR_MAX ? m : STANDAARD_INSTELLINGEN.bewaarMaanden };
}

/**
 * De bonnen die blijven: opgehaalde bonnen verdwijnen na de gekozen bewaartermijn,
 * gerekend vanaf het ophalen. Wat nog niet opgehaald is, blijft altijd staan.
 */
export function teBewaren(staat, nu = new Date()) {
  const grens = new Date(nu);
  grens.setMonth(grens.getMonth() - instellingenVan(staat).bewaarMaanden);
  const iso = grens.toISOString();
  return (staat.bonnen || []).filter((b) => !(b.status === 'opgehaald' && b.opgehaaldOp && b.opgehaaldOp < iso));
}

/** Bonnummers per jaar: 26-001, 26-002, ... */
function volgendNummer(staat, nu) {
  const jaar = String(nu.getFullYear()).slice(2);
  const n = (staat.teller[jaar] || 0) + 1;
  staat.teller[jaar] = n;
  return `${jaar}-${String(n).padStart(3, '0')}`;
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
        nr: volgendNummer(staat, nu),
        ...v,
        status: 'binnen',
        binnenOp: iso,
        klaarOp: '',
        opgehaaldOp: '',
        verwittigdOp: '',
        gewijzigdOp: iso,
      };
      staat.bonnen.push(bon);
      return { staat, bon };
    }
    case 'wijzig': {
      const i = zoek(actie.id);
      const v = velden({ ...staat.bonnen[i], ...(actie.bon || {}) });
      if (!v.klant.naam) throw new Fout('Vul de naam van de klant in');
      staat.bonnen[i] = { ...staat.bonnen[i], ...v, gewijzigdOp: iso };
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
      const m = Math.round(Number(actie.bewaarMaanden));
      if (!(m >= BEWAAR_MIN && m <= BEWAAR_MAX)) throw new Fout(`Kies een bewaartermijn van ${BEWAAR_MIN} tot ${BEWAAR_MAX} maanden`);
      staat.instellingen = { ...staat.instellingen, bewaarMaanden: m };
      return { staat };
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
