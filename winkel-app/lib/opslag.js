// Waar de bonnen bewaard worden.
// Online: één privé-bestand in Vercel Blob (alleen de server kan het lezen).
// Lokaal, zonder Blob-instellingen: een bestand in .data/, om te testen.
import { get, put, BlobPreconditionFailedError } from '@vercel/blob';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { LEEG } from './bonnen.js';

const PAD = 'winkel/bonnen.json';
const LOKAAL = new URL('../.data/bonnen.json', import.meta.url);

async function leesBlob() {
  const res = await get(PAD, { access: 'private', useCache: false });
  if (!res || res.statusCode !== 200) return { staat: structuredClone(LEEG), etag: null };
  const tekst = await new Response(res.stream).text();
  return { staat: JSON.parse(tekst), etag: res.blob.etag };
}

async function schrijfBlob(staat, etag) {
  await put(PAD, JSON.stringify(staat), {
    access: 'private',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
    ...(etag ? { ifMatch: etag } : {}),
  });
}

async function leesLokaal() {
  try {
    return { staat: JSON.parse(await readFile(LOKAAL, 'utf8')), etag: null };
  } catch {
    return { staat: structuredClone(LEEG), etag: null };
  }
}

async function schrijfLokaal(staat) {
  await mkdir(new URL('.', LOKAAL), { recursive: true });
  await writeFile(LOKAAL, JSON.stringify(staat, null, 2));
}

function online() {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return true;
  // Op Vercel zelf nooit naar een lokaal bestand schrijven: dat zou verloren gaan.
  if (process.env.VERCEL) throw new Error('Geen Blob-opslag gekoppeld aan dit project');
  return false;
}

export async function lees() {
  return (online() ? await leesBlob() : await leesLokaal()).staat;
}

/**
 * Leest de laatste versie, past de wijziging toe en schrijft terug. Heeft een
 * ander toestel intussen iets bewaard, dan proberen we het opnieuw op die
 * nieuwere versie, zodat er nooit werk verloren gaat.
 */
export async function wijzig(fn) {
  for (let poging = 0; poging < 4; poging++) {
    const { staat, etag } = online() ? await leesBlob() : await leesLokaal();
    const resultaat = fn(staat);
    try {
      if (online()) await schrijfBlob(resultaat.staat, etag);
      else await schrijfLokaal(resultaat.staat);
      return resultaat;
    } catch (e) {
      if (!(e instanceof BlobPreconditionFailedError)) throw e;
    }
  }
  throw new Error('Kon niet bewaren: te veel gelijktijdige wijzigingen');
}
