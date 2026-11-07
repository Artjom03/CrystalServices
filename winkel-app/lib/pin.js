// De winkelpincode controleren (gedeeld door api/bonnen.js en api/spiegel.js).
import { timingSafeEqual } from 'node:crypto';

const pogingen = new Map();

export function juistePin(pin) {
  const echt = process.env.APP_PIN || '';
  if (!echt) return false;
  const a = Buffer.from(String(pin));
  const b = Buffer.from(echt);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Max. 10 foute pincodes per kwartier per IP, tegen raden. */
export function geblokkeerd(ip, fout) {
  const nu = Date.now();
  const recent = (pogingen.get(ip) || []).filter((t) => nu - t < 15 * 60 * 1000);
  if (fout) recent.push(nu);
  pogingen.set(ip, recent);
  return recent.length >= 10;
}

export const ipVan = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
