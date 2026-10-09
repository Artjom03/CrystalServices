import { timingSafeEqual } from 'node:crypto';
import { pasToe, voorWinkel, Fout } from '../lib/bonnen.js';
import { lees, wijzig } from '../lib/opslag.js';
import { maakPin, hashPin } from '../lib/klant.js';

// Wat de winkel mag doen. Aanmeldingen van klanten lopen via api/klant.js.
const TOEGESTAAN = ['nieuw', 'wijzig', 'status', 'verwittigd', 'verwijder', 'klantcode'];

// Alles achter de pincode: de bonnen bevatten namen en telefoonnummers.
const pogingen = new Map();

function juistePin(pin) {
  const echt = process.env.APP_PIN || '';
  if (!echt) return false;
  const a = Buffer.from(String(pin));
  const b = Buffer.from(echt);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Max. 10 foute pincodes per kwartier per IP, tegen raden. */
function geblokkeerd(ip, fout) {
  const nu = Date.now();
  const recent = (pogingen.get(ip) || []).filter((t) => nu - t < 15 * 60 * 1000);
  if (fout) recent.push(nu);
  pogingen.set(ip, recent);
  return recent.length >= 10;
}

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

async function leesBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let tekst = '';
  for await (const deel of req) {
    tekst += deel;
    if (tekst.length > 200_000) throw new Fout('Te groot');
  }
  try {
    return JSON.parse(tekst || '{}');
  } catch {
    throw new Fout('Ongeldige gegevens');
  }
}

export default async function handler(req, res) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  try {
    if (geblokkeerd(ip, false)) {
      return json(res, 429, { error: 'Te veel foute pogingen. Probeer het over een kwartier opnieuw.' });
    }
    if (!juistePin(req.headers['x-pin'] || '')) {
      geblokkeerd(ip, true);
      await new Promise((r) => setTimeout(r, 600));
      return json(res, 401, { error: 'Verkeerde pincode' });
    }

    if (req.method === 'GET') {
      return json(res, 200, voorWinkel(await lees()));
    }
    if (req.method === 'POST') {
      const invoer = await leesBody(req);
      if (!TOEGESTAAN.includes(invoer?.op)) throw new Fout('Onbekende handeling');
      let actie = invoer;
      let pin;
      if (invoer.op === 'klantcode') {
        // De code wordt hier gemaakt en maar één keer teruggegeven; bewaard wordt enkel de hash.
        pin = maakPin();
        actie = { op: 'klantcode', telefoon: invoer.telefoon, naam: invoer.naam, ...hashPin(pin) };
      }
      const { staat, bon } = await wijzig((huidig) => pasToe(huidig, actie));
      return json(res, 200, { ...voorWinkel(staat), bon, ...(pin ? { pin } : {}) });
    }
    return json(res, 405, { error: 'Niet toegestaan' });
  } catch (e) {
    if (e instanceof Fout) return json(res, e.status, { error: e.message });
    console.error('Winkel-app: fout', e);
    return json(res, 500, { error: 'Er ging iets mis bij het bewaren. Probeer het opnieuw.' });
  }
}
