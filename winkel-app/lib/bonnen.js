// De regels van de winkel-app: hoe een bon eruitziet en wat je ermee mag doen.
// Puur rekenwerk, zonder opslag, zodat het makkelijk te testen is.

export const STATUSSEN = ['binnen', 'klaar', 'opgehaald'];
export const BETAALWIJZEN = ['', 'cash', 'kaart', 'dienstencheques', 'overschrijving'];

export const LEEG = { bonnen: [], teller: {} };

const MAX = { naam: 80, telefoon: 30, email: 120, opmerking: 500, stukNaam: 80, stukken: 60 };

function tekst(v, max) {
  return String(v ?? '').trim().slice(0, max);
}

function bedrag(v) {
  const n = Math.round(Number(String(v ?? '').replace(',', '.')) * 100) / 100;
  return Number.isFinite(n) && n >= 0 && n < 10000 ? n : 0;
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
    return [{ naam, aantal, prijs: bedrag(s?.prijs) }];
  });
}

export function totaal(stukken) {
  return Math.round(stukken.reduce((som, s) => som + s.aantal * s.prijs, 0) * 100) / 100;
}

function velden(invoer) {
  const stukken = schoonStukken(invoer.stukken);
  return {
    klant: {
      naam: tekst(invoer.klant?.naam, MAX.naam),
      telefoon: tekst(invoer.klant?.telefoon, MAX.telefoon),
      email: tekst(invoer.klant?.email, MAX.email),
    },
    soort: tekst(invoer.soort, 40) || 'Strijk',
    stukken,
    totaal: totaal(stukken),
    opmerking: tekst(invoer.opmerking, MAX.opmerking),
    klaarTegen: datum(invoer.klaarTegen),
    betaald: Boolean(invoer.betaald),
    betaalwijze: BETAALWIJZEN.includes(invoer.betaalwijze) ? invoer.betaalwijze : '',
  };
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
  const staat = { bonnen: [...(oud.bonnen || [])], teller: { ...(oud.teller || {}) } };
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
    default:
      throw new Fout('Onbekende handeling');
  }
}
