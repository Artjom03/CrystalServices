import {
  ACTIE, CONTACT, OPENINGSUREN, OPENINGSUREN_WASSALON, PRIJSLIJST, WELKOM,
  actieLoopt, eur, metKorting, prijsRegel, type Groep, type Stuk,
} from './kennis';

/**
 * Eenvoudige antwoorden op basis van zoekwoorden. Die gebruiken we als de AI
 * niet bereikbaar is (geen API-sleutel, storing, te druk), zodat de chat nooit
 * stilvalt.
 */

const STOPWOORDEN = new Set([
  'wat', 'kan', 'kost', 'kosten', 'prijs', 'prijzen', 'voor', 'met', 'van', 'een', 'het', 'de',
  'ik', 'wil', 'wilt', 'graag', 'hoeveel', 'strijken', 'wassen', 'laten', 'jullie', 'uw', 'deze',
  'dit', 'is', 'zijn', 'mijn', 'per', 'stuk', 'stuks', 'and', 'the', 'hoe', 'bij', 'ook', 'nog',
  'strijk', 'was', 'aub', 'alstublieft', 'dag', 'hallo', 'beste',
]);

function normaliseer(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    // "2 personen", "2p" en "tweepersoons" worden allemaal "2p".
    .replace(/\b(1|een|eenpersoons)\s*(p|pers|persoon|personen|persoons)\b|\beenpersoons\b/g, ' 1p ')
    .replace(/\b(2|twee|tweepersoons)\s*(p|pers|persoon|personen|persoons)\b|\btweepersoons\b/g, ' 2p ')
    .replace(/[.,;:!?()/+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

type Treffer = { stuk: Stuk; groep: Groep; score: number };

/** Hoe goed een zoekwoord op een woord uit de prijslijst past: 3 exact, 1 begin, 0 niet. */
function pas(w: string, h: string): number {
  if (w === h) return 3;
  if (w.length >= 4 && h.startsWith(w)) return 1;
  if (h.length >= 4 && w.startsWith(h)) return 1;
  return 0;
}

/** De stukken die het best passen bij de vraag, het beste eerst. */
function zoekStukken(vraag: string): Treffer[] {
  let woorden = normaliseer(vraag)
    .split(' ')
    .filter((w) => (w.length >= 3 || /^[12]p$/.test(w)) && !STOPWOORDEN.has(w));
  const kind = woorden.some((w) => w.startsWith('kind'));
  woorden = woorden.filter((w) => !w.startsWith('kind') && w !== 'kleding' && w !== 'kleren');
  if (!woorden.length) return [];

  const treffers: Treffer[] = [];
  for (const groep of PRIJSLIJST) {
    // Kinderprijzen alleen tonen als er naar kinderkleding gevraagd wordt.
    if (groep.titel.startsWith('Kinder') !== kind) continue;
    for (const stuk of groep.stukken) {
      const hooi = normaliseer([stuk.naam, ...(stuk.ook || [])].join(' ')).split(' ');
      const score = woorden.reduce((som, w) => som + Math.max(0, ...hooi.map((h) => pas(w, h))), 0);
      if (score > 0) treffers.push({ stuk, groep, score });
    }
  }
  const beste = Math.max(0, ...treffers.map((t) => t.score));
  return treffers.filter((t) => t.score === beste).slice(0, 6);
}

/** "T-shirt/topje kind (met kap)" wordt "een T-shirt voor kinderen". */
function metLidwoord(stuk: Stuk, groep: Groep): string {
  let naam = stuk.naam.replace(/\/[^\s]+/, '').replace(/\s*\(.*\)/, '').replace(/ kind$/, '');
  if (!/^[A-Z][-A-Z]/.test(naam)) naam = naam[0].toLowerCase() + naam.slice(1);
  return 'een ' + naam + (groep.titel.startsWith('Kinder') ? ' voor kinderen' : '');
}

function hoofdletter(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

/** Een prijs zoals in onze mails: eerst strijken, dan wassen. */
function prijsZin(stuk: Stuk, groep: Groep): string | null {
  if (stuk.prijs != null || / per kg/.test(stuk.naam)) return null;
  const wie = metLidwoord(stuk, groep);
  const werk = groep.wassenLabel.replace(' + ', ' en ');
  const zinnen: string[] = [];
  if (stuk.strijken != null) {
    zinnen.push(`Het strijken van ${wie} kost bij ons ${eur(stuk.strijken)} per stuk.`);
    if (stuk.wassen != null) zinnen.push(`Wilt u het ook laten ${werk}, dan is dat ${eur(stuk.wassen)} per stuk.`);
  } else if (stuk.wassen != null) {
    zinnen.push(`${hoofdletter(wie)} ${werk} kost bij ons ${eur(stuk.wassen)} per stuk.`);
  }
  return zinnen.join(' ');
}

function prijsAntwoord(vraag: string, actie: boolean): string | null {
  const treffers = zoekStukken(vraag);
  if (!treffers.length) return null;

  // Eén stuk, of een stuk met varianten (hemd, hemd lux, ...): antwoord zoals in een mail.
  const basis = normaliseer(treffers[0].stuk.naam).split(' ')[0];
  const varianten = treffers.every((t) => normaliseer(t.stuk.naam).split(' ')[0] === basis);
  const zin = varianten ? prijsZin(treffers[0].stuk, treffers[0].groep) : null;
  const regels = (lijst: Treffer[]) => lijst.map((t) => '• ' + prijsRegel(t.stuk, t.groep, actie)).join('\n');

  let tekst: string;
  if (zin) {
    const rest = treffers.slice(1);
    tekst = rest.length ? `${zin}\n\nAndere varianten:\n${regels(rest)}` : zin;
  } else {
    tekst = 'Onze prijzen per stuk:\n' + regels(treffers);
  }

  // De oktoberkorting geldt enkel op strijkwerk.
  const eerste = treffers[0].stuk;
  if (actie && zin && eerste.strijken != null) {
    tekst += `\n\nGoed om te weten: in oktober krijgt u 15% korting op het strijkwerk. ${hoofdletter(metLidwoord(eerste, treffers[0].groep))} strijken kost dan maar ${eur(metKorting(eerste.strijken))}.`;
  } else if (actie && treffers.some((t) => t.stuk.strijken != null)) {
    tekst += '\n\nGoed om te weten: in oktober krijgt u 15% korting op alle strijkprijzen.';
  }
  return tekst;
}

// Zoals in de prijsmail die we naar klanten sturen.
const MEEST_GEVRAAGD = ['T-shirt/topje', 'Polo', 'Hemd', 'Bloes', 'Broek', 'Trui', 'Kleed'];

function regelVoor(naam: string, actie: boolean): string {
  for (const groep of PRIJSLIJST) {
    const stuk = groep.stukken.find((s) => s.naam === naam);
    if (stuk) return prijsRegel(stuk, groep, actie);
  }
  throw new Error(`Onbekend stuk in MEEST_GEVRAAGD: ${naam}`);
}

const BEL = `bel ${CONTACT.telefoon} of mail ${CONTACT.email}`;
const BEL_ZIN = `Bel ${CONTACT.telefoon} of mail ${CONTACT.email}`;

export function regelAntwoord(vraag: string, nu = new Date()): string {
  const t = vraag.toLowerCase();
  const actie = actieLoopt(nu);
  const actieZin = actie ? '\n\nGoed om te weten: in oktober krijgt u 15% korting op alle strijkprijzen.' : '';

  if (/droogkuis|stomen|wetclean|kostuum|maatpak|mantel|colbert|trouwjurk|trouwkleed|vlek/.test(t)) {
    if (/dons|deken|dekbed/.test(t)) {
      return `Ja, wij nemen donsdekens aan voor de droogkuis. De prijs ligt tussen € 39,50 en € 49,00 per donsdeken, afhankelijk van de stof. Breng de deken gerust even langs in de winkel: dan bekijken we de stof en geven we u meteen de juiste prijs. ${WELKOM}`;
    }
    return `Voor droogkuis hangt de prijs af van het soort kledingstuk, de stof en eventuele vlekken. Daarom komt u het best even langs in de winkel. Dan kunnen we alles goed bekijken en u meteen een correcte prijs geven. ${WELKOM}`;
  }
  if (/wassalon|zelfbediening|speed queen|wasmachine/.test(t)) {
    return `${OPENINGSUREN_WASSALON} U kan gewoon binnenlopen; uw was is klaar in ongeveer 60 minuten. Voor de prijzen van het wassalon: ${BEL}.`;
  }
  if (/open|uren|tijden|wanneer|hoe laat|gesloten/.test(t)) return OPENINGSUREN;
  if (/dienstencheque/.test(t)) {
    return 'Ja, voor het strijken van uw kleding kan u bij ons betalen met dienstencheques. Breng ze gerust mee bij afgifte.';
  }
  if (/btw|vat|ondernemingsnummer/.test(t)) return `Ons btw-nummer is ${CONTACT.btw}.`;
  if (/actie|korting|promo|flyer/.test(t)) {
    return actie
      ? ACTIE.tekst.join('\n\n')
      : `Op dit moment loopt er geen actie. Vragen over prijzen? ${BEL_ZIN}.`;
  }
  if (/schoen|sneaker|bottine|laars/.test(t)) {
    return 'Wij reinigen schoenen en sneakers in drie pakketten:\n• Pakket 1, buitenkant: € 30\n• Pakket 2, binnen- en buitenkant: € 40\n• Pakket 3, met ozonbehandeling: vanaf € 50\nDe definitieve prijs spreken we bij afgifte met u af.';
  }
  if (/motor/.test(t)) {
    return 'Een lederen motorjas reinigen en voeden kost € 59, een lederen broek € 49, een 2-delig pak € 95 en een 1-delig racepak € 99. Alle prijzen staan op onze pagina Motorkleding.';
  }

  const prijs = prijsAntwoord(vraag, actie);
  if (prijs) return prijs;

  if (/prijs|prijzen|tarief|kost|kosten|hoeveel|prijslijst/.test(t)) {
    return `Onze prijzen zijn per stuk. De meest gevraagde stukken:\n${MEEST_GEVRAAGD.map((n) => '• ' + regelVoor(n, actie)).join('\n')}\nTyp gerust de naam van een kledingstuk voor de prijs.${actieZin}`;
  }
  if (/zakelijk|bedrijf|horeca|hotel|salon|offerte/.test(t)) {
    return `Voor zaken halen wij linnen en bedrijfskleding op vaste dagen op en brengen het gewassen en gestreken terug. ${BEL_ZIN} met uw volume en wensen, dan maken wij een vrijblijvend voorstel.`;
  }
  if (/ophalen|ophaal|leveren|levering|brengen|thuis/.test(t)) {
    return `U kan uw was gewoon naar ons atelier brengen, een afspraak is niet nodig. Ophalen en leveren doen wij voor zakelijke klanten op vaste dagen. Wilt u laten ophalen? ${BEL_ZIN}.`;
  }
  if (/dienst|strijk|was|droog|reinig|kleding|handtas|leer/.test(t)) {
    return 'Wij strijken, wassen en drogen uw kleding en linnen, doen droogkuis en wetcleaning, en reinigen ook handtassen, leer, schoenen en motorkleding. Daarnaast hebben we een zelfbedieningswassalon.';
  }
  if (/adres|locatie|waar|route/.test(t)) return `Ons adres is ${CONTACT.adres}.`;
  if (/contact|bel|mail|telefoon|nummer/.test(t)) {
    return `U kan ons bereiken op ${CONTACT.telefoon} of via ${CONTACT.email}. Ons adres is ${CONTACT.adres}.`;
  }
  return `Daar kan ik u niet meteen mee helpen, maar ons team beantwoordt uw vraag graag persoonlijk: ${BEL}.`;
}
