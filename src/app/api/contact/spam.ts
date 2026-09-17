import crypto from 'crypto';

/**
 * Spambescherming voor het contactformulier.
 *
 * Bots versturen zelden via de pagina: ze posten rechtstreeks naar /api/contact.
 * Daarom zitten alle controles hier aan de serverkant — wat het formulier in de
 * browser doet, is enkel bedoeld om echte bezoekers niet te hinderen.
 */

// Het token wordt ondertekend zodat het niet te verzinnen valt. Zonder eigen
// FORM_SECRET leiden we een sleutel af van de Resend-key, die altijd aanwezig is.
function secret(): string {
  const basis = process.env.FORM_SECRET || process.env.RESEND_API_KEY || 'crystal-services-fallback';
  return crypto.createHash('sha256').update(`form:${basis}`).digest('hex');
}

/** Maakt een ondertekend token met het tijdstip waarop het formulier geopend werd. */
export function maakToken(nu = Date.now()): string {
  const sig = crypto.createHmac('sha256', secret()).update(String(nu)).digest('hex').slice(0, 32);
  return `${nu}.${sig}`;
}

export type TokenOordeel = 'ok' | 'ontbreekt' | 'ongeldig' | 'te-snel' | 'verlopen';

/**
 * Controleert het token. Te snel verstuurd wijst op een bot: een mens heeft tijd
 * nodig om het formulier in te vullen.
 */
export function keurToken(token: unknown, nu = Date.now()): TokenOordeel {
  if (typeof token !== 'string' || !token.includes('.')) return 'ontbreekt';

  const [deel, sig] = token.split('.');
  const uitgegeven = Number(deel);
  if (!Number.isFinite(uitgegeven)) return 'ongeldig';

  const verwacht = crypto.createHmac('sha256', secret()).update(deel).digest('hex').slice(0, 32);
  const a = Buffer.from(sig || '', 'utf8');
  const b = Buffer.from(verwacht, 'utf8');
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return 'ongeldig';

  const verstreken = nu - uitgegeven;
  if (verstreken < 3000) return 'te-snel';
  if (verstreken > 3 * 60 * 60 * 1000) return 'verlopen';
  return 'ok';
}

/** Losse regels die bijna alleen in spam voorkomen. */
const SPAMWOORDEN = [
  'seo service', 'seo services', 'backlink', 'guest post', 'link building',
  'casino', 'viagra', 'cialis', 'crypto investment', 'bitcoin investment',
  'forex', 'binary option', 'porn', 'escort',
  'increase your traffic', 'rank higher', 'boost your website',
  'work from home', 'make money online',
];

const URL_PATROON = /(https?:\/\/|www\.)\S+/gi;

export type SpamOordeel = { spam: false } | { spam: true; reden: string };

/**
 * Inhoudelijke controle. Bewust voorzichtig: een echte klant mag gerust één
 * link meesturen, dus pas vanaf drie links slaan we alarm.
 */
export function keurInhoud(velden: {
  name: string;
  email: string;
  phone?: string;
  message: string;
}): SpamOordeel {
  const { name, email, phone = '', message } = velden;
  const alles = `${name} ${email} ${phone} ${message}`.toLowerCase();

  const links = message.match(URL_PATROON) || [];
  if (links.length >= 3) return { spam: true, reden: `bericht bevat ${links.length} links` };

  // Een naam of telefoonnummer met een link erin komt nooit van een echte klant.
  if (URL_PATROON.test(name) || URL_PATROON.test(phone)) {
    return { spam: true, reden: 'link in naam- of telefoonveld' };
  }

  const gevonden = SPAMWOORDEN.find((w) => alles.includes(w));
  if (gevonden) return { spam: true, reden: `spamterm "${gevonden}"` };

  // Bericht dat vrijwel alleen uit een link bestaat.
  if (links.length > 0 && message.replace(URL_PATROON, '').trim().length < 15) {
    return { spam: true, reden: 'bericht bestaat vrijwel enkel uit een link' };
  }

  // BBCode/HTML-tags zijn een klassiek teken van geautomatiseerde troep.
  if (/\[\/?url[\]=]|<a\s+href=/i.test(message)) {
    return { spam: true, reden: 'opmaakcode voor links in bericht' };
  }

  return { spam: false };
}

/** Bovengrenzen per veld, zodat niemand de mailbox kan volpompen. */
export const MAX = { name: 100, email: 150, phone: 40, message: 5000 } as const;

export function teLang(velden: { name: string; email: string; phone?: string; message: string }) {
  if (velden.name.length > MAX.name) return 'naam';
  if (velden.email.length > MAX.email) return 'e-mailadres';
  if ((velden.phone || '').length > MAX.phone) return 'telefoonnummer';
  if (velden.message.length > MAX.message) return 'bericht';
  return null;
}

/**
 * Eenvoudige snelheidsbegrenzing per IP. Draait in het geheugen, dus op
 * serverless wordt dit per instantie bijgehouden en na een tijd opgeruimd —
 * genoeg om stortvloeden te breken, geen sluitende garantie.
 */
const bezoeken = new Map<string, number[]>();
const VENSTER_MS = 10 * 60 * 1000;
const MAX_PER_VENSTER = 3;

export function teVaak(ip: string, nu = Date.now()): boolean {
  const recent = (bezoeken.get(ip) || []).filter((t) => nu - t < VENSTER_MS);
  recent.push(nu);
  bezoeken.set(ip, recent);

  if (bezoeken.size > 500) {
    for (const [k, v] of bezoeken) {
      if (v.every((t) => nu - t >= VENSTER_MS)) bezoeken.delete(k);
    }
  }
  return recent.length > MAX_PER_VENSTER;
}

export function ipVan(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return headers.get('x-real-ip') || 'onbekend';
}
