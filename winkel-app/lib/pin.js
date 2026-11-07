// De winkelpincode controleren (gedeeld door api/bonnen.js en api/spiegel.js), met blokkering
// na te veel foute pogingen. De pogingen worden bewaard (privé Blob), zodat de blokkering
// ook geldt als Vercel een nieuwe server opstart.
import { timingSafeEqual, createHash } from 'node:crypto';
import { get, put, BlobNotFoundError } from '@vercel/blob';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { geblokkeerdTot, noteerFout, blokTekst, ALLEN } from './slot.js';

const PAD = 'winkel/pogingen.json';
const LOKAAL = new URL('../.data/pogingen.json', import.meta.url);
const online = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

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

async function lees() {
  try {
    if (online()) {
      const r = await get(PAD, { access: 'private', useCache: false });
      return r?.statusCode === 200 ? JSON.parse(await new Response(r.stream).text()) : {};
    }
    return JSON.parse(await readFile(LOKAAL, 'utf8'));
  } catch (e) {
    if (e instanceof BlobNotFoundError || e?.code === 'ENOENT') return {};
    console.error('Pogingen lezen: fout', e);
    return {};
  }
}
async function schrijf(data) {
  try {
    if (online()) await put(PAD, JSON.stringify(data), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
    else { await mkdir(new URL('.', LOKAAL), { recursive: true }); await writeFile(LOKAAL, JSON.stringify(data)); }
  } catch (e) { console.error('Pogingen bewaren: fout', e); }
}

/**
 * Controleert de pincode van een aanvraag.
 * Geeft null als alles goed is, of { status, error } om terug te sturen.
 */
export async function controleer(req) {
  const nu = Date.now();
  const ip = sleutel(ipVan(req));
  const data = await lees();
  const tot = Math.max(geblokkeerdTot(data.ip?.[ip], nu), geblokkeerdTot(data.allen, nu));
  if (tot) return { status: 429, error: blokTekst(tot) };
  if (juistePin(req.headers['x-pin'] || '')) {
    if (data.ip?.[ip]?.fouten?.length) { delete data.ip[ip]; await schrijf(data); }
    return null;
  }
  // Fout: noteren per adres en voor iedereen samen; oude records opruimen.
  data.ip = Object.fromEntries(Object.entries(data.ip || {}).filter(([, r]) => r.tot > nu || (r.fouten || []).some((t) => nu - t < 24 * 3600 * 1000)));
  data.ip[ip] = noteerFout(data.ip[ip], nu);
  data.allen = noteerFout(data.allen, nu, [ALLEN]);
  await schrijf(data);
  await new Promise((r) => setTimeout(r, 600));
  const nieuw = Math.max(geblokkeerdTot(data.ip[ip], nu), geblokkeerdTot(data.allen, nu));
  return nieuw ? { status: 429, error: blokTekst(nieuw) } : { status: 401, error: 'Verkeerde pincode' };
}
