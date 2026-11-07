// Back-ups van de winkel-pc: één per dag, versleuteld, op een geheime plek, maximum 7 dagen bewaard.
// - Versleuteld met AES-256-GCM; de sleutel komt uit de winkelpincode (APP_PIN), dus zonder pincode
//   is een back-up onleesbaar, ook voor wie aan de opslag kan.
// - De map heeft een naam die uit de pincode volgt: niet te raden en niet zichtbaar in de app.
// - Elke dag wordt de back-up van die dag overschreven; ouder dan 7 dagen wordt gewist.
import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';
import { put, list, del } from '@vercel/blob';
import { mkdir, writeFile, readdir, rm } from 'node:fs/promises';

export const BEWAAR_DAGEN = 7;
const LOKAAL = new URL('../.data/kluis/', import.meta.url);

function sleutel() {
  const pin = process.env.APP_PIN || '';
  if (!pin) throw new Error('Geen APP_PIN');
  return scryptSync(pin, 'crystal-winkel-kluis', 32);
}
function map() {
  return 'kluis/' + createHash('sha256').update('crystal-kluis:' + (process.env.APP_PIN || '')).digest('hex').slice(0, 32) + '/';
}

export function versleutel(data) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', sleutel(), iv);
  const inhoud = Buffer.concat([c.update(data), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), inhoud]);
}

export function ontsleutel(blob) {
  const d = createDecipheriv('aes-256-gcm', sleutel(), blob.subarray(0, 12));
  d.setAuthTag(blob.subarray(12, 28));
  return Buffer.concat([d.update(blob.subarray(28)), d.final()]);
}

const dagVan = (d) => d.toISOString().slice(0, 10);
const online = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);

/** Bewaart de back-up van vandaag (gzip van alle gegevens) en wist wat ouder is dan 7 dagen. */
export async function bewaarBackup(gzip, nu = new Date()) {
  const dag = dagVan(nu);
  const grens = dagVan(new Date(nu.getTime() - (BEWAAR_DAGEN - 1) * 86400000));
  const inhoud = versleutel(gzip);
  if (online()) {
    await put(map() + dag + '.bin', inhoud, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/octet-stream' });
    const { blobs } = await list({ prefix: map(), limit: 100 });
    const oud = blobs.filter((b) => (b.pathname.split('/').pop() || '').slice(0, 10) < grens).map((b) => b.url);
    if (oud.length) await del(oud);
    return { dag, gewist: oud.length };
  }
  // Lokaal testen: zelfde regels in .data/kluis/.
  await mkdir(LOKAAL, { recursive: true });
  await writeFile(new URL(dag + '.bin', LOKAAL), inhoud);
  let gewist = 0;
  for (const f of await readdir(LOKAAL)) {
    if (f.slice(0, 10) < grens) { await rm(new URL(f, LOKAAL)); gewist++; }
  }
  return { dag, gewist };
}
