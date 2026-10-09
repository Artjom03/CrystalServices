// Pincodes en aanmeldingen voor het klantenportaal.
import { createHash, createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';

const GELDIG_MS = 180 * 24 * 60 * 60 * 1000; // een half jaar aangemeld blijven

export function maakPin() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

export function hashPin(pin, zout = randomBytes(16).toString('hex')) {
  return { zout, hash: scryptSync(String(pin), zout, 32).toString('hex') };
}

export function pinKlopt(pin, klant) {
  if (!klant?.hash || !klant?.zout) return false;
  const a = Buffer.from(hashPin(pin, klant.zout).hash, 'hex');
  const b = Buffer.from(klant.hash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}

function geheim() {
  const basis = process.env.KLANT_GEHEIM || process.env.BLOB_READ_WRITE_TOKEN || process.env.APP_PIN || '';
  if (!basis) throw new Error('Geen geheim voor klant-aanmeldingen');
  return createHash('sha256').update('klant:' + basis).digest();
}

function handtekening(deel) {
  return createHmac('sha256', geheim()).update(deel).digest('base64url');
}

/** Een ondertekend toegangsbewijs: gsm-sleutel, codeversie en vervaldatum. */
export function maakToken(sleutel, v, nu = Date.now()) {
  const deel = Buffer.from(JSON.stringify({ t: sleutel, v, exp: nu + GELDIG_MS })).toString('base64url');
  return `${deel}.${handtekening(deel)}`;
}

export function leesToken(token, nu = Date.now()) {
  const [deel, sig] = String(token || '').split('.');
  if (!deel || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(handtekening(deel));
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(deel, 'base64url').toString());
    return data.exp > nu ? data : null;
  } catch {
    return null;
  }
}
