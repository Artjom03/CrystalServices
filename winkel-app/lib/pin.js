// De winkelpincode controleren (gedeeld door api/bonnen.js en api/spiegel.js), met blokkering
// na te veel foute pogingen. De pogingen worden bewaard (privé Blob), zodat de blokkering
// ook geldt als Vercel een nieuwe server opstart.
//
// Tegen raden met veel gelijktijdige aanvragen: elke poging wordt EERST geteld (met een
// voorwaardelijke schrijfactie, zodat niets verloren gaat), en pas daarna wordt de pincode
// vergeleken. Een juiste pincode haalt die ene poging daarna weer weg.
import { timingSafeEqual, createHash, randomBytes } from 'node:crypto';
import { get, head, put, BlobNotFoundError, BlobPreconditionFailedError } from '@vercel/blob';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { geblokkeerdTot, noteerFout, blokTekst, ALLEN } from './slot.js';

const PAD = 'winkel/pogingen.json';
const LOKAAL = new URL('../.data/pogingen.json', import.meta.url);
const online = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
const DAG = 24 * 3600 * 1000;

export function juistePin(pin) {
  const echt = process.env.APP_PIN || '';
  if (!echt) return false;
  const a = Buffer.from(String(pin));
  const b = Buffer.from(echt);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const ipVan = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
// Het adres niet zelf bewaren, enkel een hash ervan (privacy).
const sleutel = (ip) => createHash('sha256').update('crystal-ip:' + ip).digest('hex').slice(0, 24);

// ---------- Opslag van de pogingen, met voorwaardelijk schrijven ----------
let lokaleRij = Promise.resolve();
async function wijzigPogingen(fn) {
  if (!online()) {
    // Lokaal testen: één voor één.
    const klus = lokaleRij.then(async () => {
      let data = {};
      try { data = JSON.parse(await readFile(LOKAAL, 'utf8')); } catch { data = {}; }
      const uit = fn(data);
      await mkdir(new URL('.', LOKAAL), { recursive: true });
      await writeFile(LOKAAL, JSON.stringify(data));
      return uit;
    });
    lokaleRij = klus.catch(() => {});
    return klus;
  }
  for (let poging = 0; poging < 8; poging++) {
    let data = {}, etag = null;
    try {
      etag = (await head(PAD)).etag;
      const r = await get(PAD, { access: 'private', useCache: false });
      if (r?.statusCode === 200) data = JSON.parse(await new Response(r.stream).text());
    } catch (e) {
      if (!(e instanceof BlobNotFoundError)) throw e;
    }
    const uit = fn(data);
    try {
      await put(PAD, JSON.stringify(data), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json', ...(etag ? { ifMatch: etag } : {}) });
      return uit;
    } catch (e) {
      if (!(e instanceof BlobPreconditionFailedError)) throw e;
      await new Promise((r) => setTimeout(r, 20 + Math.random() * 80));
    }
  }
  // Te druk: liever weigeren dan een poging niet tellen.
  throw Object.assign(new Error('Te veel gelijktijdige aanvragen'), { druk: true });
}

function opruimen(data, nu) {
  data.ip = Object.fromEntries(Object.entries(data.ip || {}).filter(([, r]) => geblokkeerdTot(r, nu) || (r.fouten || []).some((t) => nu - t < DAG)));
}

/**
 * Controleert de pincode van een aanvraag.
 * Geeft null als alles goed is, of { status, error } om terug te sturen.
 * opties.metAllen = false: de blokkering voor iedereen samen niet toepassen (de winkel-pc zelf).
 */
export async function controleer(req, { metAllen = true } = {}) {
  const nu = Date.now();
  const ip = sleutel(ipVan(req));
  const id = randomBytes(6).toString('hex');
  let besluit;
  try {
    // 1. Deze poging eerst tellen (als fout), en meteen kijken of er al een blokkering is.
    besluit = await wijzigPogingen((data) => {
      opruimen(data, nu);
      data.ip = data.ip || {};
      const tot = Math.max(geblokkeerdTot(data.ip[ip], nu), metAllen ? geblokkeerdTot(data.allen, nu) : 0);
      if (tot) return { tot };
      data.ip[ip] = noteerFout(data.ip[ip], nu);
      data.allen = noteerFout(data.allen, nu, [ALLEN]);
      (data.open = data.open || {})[id] = nu;
      return { tot: 0 };
    });
  } catch (e) {
    if (e.druk) return { status: 429, error: 'Even te druk. Probeer het zo meteen opnieuw.' };
    throw e;
  }
  if (besluit.tot) return { status: 429, error: blokTekst(besluit.tot) };

  // 2. Pas nu de pincode vergelijken.
  if (juistePin(req.headers['x-pin'] || '')) {
    // Juist: deze poging telt niet als fout; de fouten van dit adres zijn vergeven.
    await wijzigPogingen((data) => {
      if (data.ip?.[ip]) delete data.ip[ip];
      if (data.allen?.fouten) {
        const t = data.open?.[id];
        const i = data.allen.fouten.lastIndexOf(t);
        if (i >= 0) data.allen.fouten.splice(i, 1);
      }
      if (data.open) delete data.open[id];
    }).catch(() => {});
    return null;
  }
  await wijzigPogingen((data) => { if (data.open) delete data.open[id]; }).catch(() => {});
  await new Promise((r) => setTimeout(r, 600));
  return { status: 401, error: 'Verkeerde pincode' };
}
