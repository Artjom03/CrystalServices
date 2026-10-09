import { pasToe, voorKlant, telefoonSleutel } from '../lib/bonnen.js';
import { lees, wijzig } from '../lib/opslag.js';
import { pinKlopt, maakToken, leesToken } from '../lib/klant.js';

// Het klantenportaal: aanmelden met gsm-nummer en pincode, en daarna enkel de eigen bonnen zien.
const pogingen = new Map();

/** Per IP max. 20 aanmeldpogingen per kwartier, bovenop de blokkering per gsm-nummer. */
function teVeel(ip) {
  const nu = Date.now();
  const recent = (pogingen.get(ip) || []).filter((t) => nu - t < 15 * 60 * 1000);
  recent.push(nu);
  pogingen.set(ip, recent);
  return recent.length > 20;
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
    if (tekst.length > 2000) return {};
  }
  try {
    return JSON.parse(tekst || '{}');
  } catch {
    return {};
  }
}

const FOUT = 'Gsm-nummer of code klopt niet.';
const traag = () => new Promise((r) => setTimeout(r, 500));

export default async function handler(req, res) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  try {
    // Aanmelden
    if (req.method === 'POST') {
      if (teVeel(ip)) return json(res, 429, { error: 'Te veel pogingen. Probeer het over een kwartier opnieuw.' });
      const { telefoon, pin } = await leesBody(req);
      const sleutel = telefoonSleutel(telefoon);
      const staat = await lees();
      const klant = sleutel && staat.klanten?.[sleutel];
      if (!klant) {
        await traag();
        return json(res, 401, { error: FOUT });
      }
      if (klant.geblokkeerdTot && klant.geblokkeerdTot > new Date().toISOString()) {
        return json(res, 429, { error: 'Te veel foute codes. Probeer het over een kwartier opnieuw, of bel ons op 0494 40 38 41.' });
      }
      if (!/^\d{6}$/.test(String(pin || '')) || !pinKlopt(String(pin), klant)) {
        await wijzig((huidig) => pasToe(huidig, { op: 'loginFout', sleutel }));
        await traag();
        return json(res, 401, { error: FOUT });
      }
      const { staat: nieuw } = await wijzig((huidig) => pasToe(huidig, { op: 'loginOk', sleutel }));
      return json(res, 200, { token: maakToken(sleutel, klant.v), ...voorKlant(nieuw, sleutel) });
    }

    // Eigen bonnen ophalen
    if (req.method === 'GET') {
      const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
      const data = leesToken(token);
      if (!data) return json(res, 401, { error: 'Meld u opnieuw aan.' });
      const staat = await lees();
      const klant = staat.klanten?.[data.t];
      // Een nieuwe code maakt oude aanmeldingen ongeldig.
      if (!klant || klant.v !== data.v) return json(res, 401, { error: 'Meld u opnieuw aan.' });
      return json(res, 200, voorKlant(staat, data.t));
    }

    return json(res, 405, { error: 'Niet toegestaan' });
  } catch (e) {
    console.error('Klantenportaal: fout', e);
    return json(res, 500, { error: 'Er ging iets mis. Probeer het later opnieuw.' });
  }
}
