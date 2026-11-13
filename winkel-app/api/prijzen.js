import { lees } from '../lib/opslag.js';

// Openbaar: de gewone prijslijst van de winkel, voor de chatbot op de website.
// Enkel de gewone prijzen per stuk (strijken / wassen). Nooit afgesproken klantprijzen
// (Sportclubs, Vaste klanten), partners, klanten of bonnen.
const GEHEIM = new Set(['Sportclubs', 'Vaste klanten']);
const getal = (v) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 && v < 10000 ? Math.round(v * 100) / 100 : undefined);

/** Haalt enkel de openbare velden uit een lijst groepen. */
export function openbaar(groepen) {
  return (Array.isArray(groepen) ? groepen : [])
    .filter((g) => g && !GEHEIM.has(g.titel))
    .map((g) => ({
      titel: String(g.titel || '').slice(0, 60),
      wassenLabel: String(g.wassenLabel || '').slice(0, 30),
      stukken: (Array.isArray(g.stukken) ? g.stukken : []).flatMap((s) => {
        const naam = String(s?.naam || '').slice(0, 80);
        if (!naam) return [];
        const uit = { naam };
        for (const k of ['strijken', 'wassen', 'prijs']) if (getal(s[k]) !== undefined) uit[k] = getal(s[k]);
        return Object.keys(uit).length > 1 ? [uit] : [];
      }),
    }))
    .filter((g) => g.stukken.length);
}

/** De standaardprijzen uit /prijzen.js van dezelfde site (als de winkel niets aanpaste). */
async function standaard(req) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').replace(/[^\w.:-]/g, '');
  const proto = req.headers['x-forwarded-proto'] === 'http' || /^localhost/.test(host) ? 'http' : 'https';
  const r = await fetch(`${proto}://${host}/prijzen.js`);
  const tekst = await r.text();
  const m = tekst.match(/window\.PRIJSLIJST\s*=\s*(\[.*?\]);\s*$/m);
  return m ? JSON.parse(m[1]) : [];
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Een paar minuten bewaren is genoeg: een aangepaste prijs staat zo snel in de chatbot.
  res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');
  try {
    if (req.method !== 'GET') { res.statusCode = 405; return res.end('{}'); }
    const staat = await lees();
    const eigen = staat?.prijslijst?.versie >= 2 ? staat.prijslijst.groepen : null;
    const groepen = openbaar(eigen || await standaard(req));
    res.statusCode = 200;
    res.end(JSON.stringify({ bron: eigen ? 'winkel' : 'standaard', groepen }));
  } catch {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Prijzen niet beschikbaar' }));
  }
}
