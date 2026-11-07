// Online kopie van de winkel-pc: het Windows-programma stuurt hier regelmatig al zijn gegevens naartoe
// (gzip), zodat de gsm ze kan bekijken en er altijd een back-up online staat.
// Vanaf dan is de online versie "alleen kijken": wijzigen gebeurt op de winkel-pc.
import { gunzipSync } from 'node:zlib';
import { juistePin, geblokkeerd, ipVan } from '../lib/pin.js';
import { wijzig } from '../lib/opslag.js';
import { bewaarBackup } from '../lib/kluis.js';

const MAX = 4_000_000; // Vercel aanvaardt tot 4,5 MB per aanvraag.

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

async function leesRuw(req) {
  const delen = [];
  let n = 0;
  for await (const deel of req) {
    n += deel.length;
    if (n > MAX) throw Object.assign(new Error('Te groot'), { status: 413 });
    delen.push(Buffer.from(deel));
  }
  return Buffer.concat(delen);
}

export default async function handler(req, res) {
  const ip = ipVan(req);
  try {
    if (geblokkeerd(ip, false)) return json(res, 429, { error: 'Te veel foute pogingen' });
    if (!juistePin(req.headers['x-pin'] || '')) {
      geblokkeerd(ip, true);
      await new Promise((r) => setTimeout(r, 600));
      return json(res, 401, { error: 'Verkeerde pincode' });
    }
    if (req.method !== 'POST') return json(res, 405, { error: 'Niet toegestaan' });
    const ruw = await leesRuw(req);
    let data;
    try {
      data = JSON.parse(gunzipSync(ruw).toString('utf8'));
    } catch {
      return json(res, 400, { error: 'Ongeldige gegevens' });
    }
    const nieuw = data?.staat;
    if (!nieuw || !Array.isArray(nieuw.bonnen)) return json(res, 400, { error: 'Ongeldige gegevens' });
    const op = new Date().toISOString();
    await wijzig((huidig) => ({
      staat: {
        ...nieuw,
        // Toegangscodes van het klantenportaal bestaan enkel online: die blijven staan.
        klanten: { ...(nieuw.klanten || {}), ...(huidig.klanten || {}) },
        spiegel: {
          op,
          versie: String(data.versie || '').slice(0, 20),
          // Het geheime agenda-adres: enkel gebruikt door de server om de ophaalagenda te tonen.
          agenda: /^https:\/\//.test(data.agenda || '') ? String(data.agenda).slice(0, 500) : '',
        },
      },
    }));
    // Dagelijkse back-up: versleuteld op een geheime plek, max. 7 dagen. Lukt dat niet, dan gaat de kopie toch door.
    let backup = null;
    try { backup = await bewaarBackup(ruw); } catch (e) { console.error('Back-up: fout', e); }
    return json(res, 200, { ok: true, op, backup: Boolean(backup) });
  } catch (e) {
    if (e.status === 413) return json(res, 413, { error: 'Te groot' });
    console.error('Spiegel: fout', e);
    return json(res, 500, { error: 'Kon de kopie niet bewaren' });
  }
}
