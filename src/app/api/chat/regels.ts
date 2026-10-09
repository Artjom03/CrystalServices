import { ACTIE, CONTACT, OPENINGSUREN, OPENINGSUREN_WASSALON, PRIJSLIJST, actieLoopt, prijsRegel } from './kennis';

/**
 * Eenvoudige antwoorden op basis van zoekwoorden. Die gebruiken we als de AI
 * niet bereikbaar is (geen API-sleutel, storing, te druk), zodat de chat nooit
 * stilvalt.
 */

const STOPWOORDEN = new Set([
  'wat', 'kan', 'kost', 'kosten', 'prijs', 'prijzen', 'voor', 'met', 'van', 'een', 'het', 'de',
  'ik', 'wil', 'wilt', 'graag', 'hoeveel', 'strijken', 'wassen', 'laten', 'jullie', 'uw', 'deze',
  'dit', 'is', 'zijn', 'mijn', 'per', 'stuk', 'and', 'the', 'hoe', 'bij', 'ook', 'nog',
]);

function normaliseer(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[.,;:!?()/+-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function zoekPrijzen(vraag: string, actie: boolean): string[] {
  let woorden = normaliseer(vraag)
    .split(' ')
    .filter((w) => w.length >= 3 && !STOPWOORDEN.has(w));
  const kind = woorden.some((w) => w.startsWith('kind'));
  woorden = woorden.filter((w) => !w.startsWith('kind') && w !== 'kleding' && w !== 'kleren');
  if (!woorden.length) return [];

  const regels: string[] = [];
  for (const groep of PRIJSLIJST) {
    for (const stuk of groep.stukken) {
      // Kinderprijzen alleen tonen als er naar kinderkleding gevraagd wordt.
      if (groep.titel.startsWith('Kinder') !== kind) continue;
      const hooi = normaliseer([stuk.naam, ...(stuk.ook || [])].join(' ')).split(' ');
      if (woorden.some((w) => hooi.some((h) => h.length >= 3 && (h.startsWith(w) || w.startsWith(h))))) {
        regels.push('• ' + prijsRegel(stuk, groep, actie));
      }
    }
  }
  return regels.slice(0, 6);
}

const BEL = `bel ${CONTACT.telefoon} of mail ${CONTACT.email}`;
const BEL_ZIN = `Bel ${CONTACT.telefoon} of mail ${CONTACT.email}`;

export function regelAntwoord(vraag: string, nu = new Date()): string {
  const t = vraag.toLowerCase();
  const actie = actieLoopt(nu);
  const actieZin = actie ? '\n\nGoed om te weten: in oktober krijgt u 15% korting op alle strijkprijzen.' : '';

  if (/droogkuis|stomen|wetclean|kostuum|maatpak|mantel/.test(t)) {
    if (/dons|deken|dekbed/.test(t)) {
      return 'Ja, wij nemen donsdekens aan voor de droogkuis. De prijs ligt tussen € 39,50 en € 49,00 per donsdeken, afhankelijk van de stof. Gewoon wassen kost € 25,00 (klein) of € 30,00 (groot).';
    }
    return 'Voor droogkuis hangt de prijs af van het soort kledingstuk, de stof en eventuele vlekken. Daarom komt u het best even langs in de winkel. Dan kunnen we alles goed bekijken en u meteen een correcte prijs geven.';
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

  const prijzen = zoekPrijzen(vraag, actie);
  if (prijzen.length) return 'Onze prijzen per stuk:\n' + prijzen.join('\n') + actieZin;

  if (/prijs|prijzen|tarief|kost|kosten|hoeveel|prijslijst/.test(t)) {
    return `Onze prijzen zijn per stuk. Een paar voorbeelden:\n• Hemd: strijken € 2,30, wassen + strijken € 4,50\n• Broek: strijken € 2,30, wassen + strijken € 5,50\n• T-shirt: strijken € 1,20, wassen + strijken € 3,00\nTyp gerust de naam van een kledingstuk voor de prijs.${actieZin}`;
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
