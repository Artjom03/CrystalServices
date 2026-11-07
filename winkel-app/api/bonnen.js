import { pasToe, voorWinkel, Fout } from '../lib/bonnen.js';
import { lees, wijzig } from '../lib/opslag.js';
import { maakPin, hashPin } from '../lib/klant.js';
import { leesAgenda, komendeAfspraken } from '../lib/agenda.js';
import { controleer } from '../lib/pin.js';

// Wat de winkel mag doen. Aanmeldingen van klanten lopen via api/klant.js.
const TOEGESTAAN = ['nieuw', 'wijzig', 'status', 'locatie', 'extern', 'verwittigd', 'verwijder', 'klantcode', 'instellingen', 'prijslijst', 'klant', 'klantNieuw', 'klantWeg', 'kassaOpen', 'kassaBeweging', 'kassaSluit', 'kassaHeropen', 'kassaBewegingWijzig', 'betalingWijzig', 'factuurVraag', 'factuurGemaakt', 'partnerPrijs', 'factuurBetaald', 'klantenImport'];

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
  try {
    // Pincode, met blokkering na te veel foute pogingen (zie lib/slot.js).
    const nee = await controleer(req);
    if (nee) return json(res, nee.status, { error: nee.error });

    if (req.method === 'GET') {
      const staat = await lees();
      // Ophaalagenda (Google Agenda) voor de gsm: de server haalt ze op met het adres van de winkel-pc.
      const dagen = new URL(req.url, 'http://x').searchParams.get('agenda');
      if (dagen) {
        const adres = staat.spiegel?.agenda;
        if (!adres) return json(res, 200, { geenAdres: true });
        try {
          const r = await fetch(adres, { cache: 'no-store' });
          const tekst = r.ok ? await r.text() : '';
          if (!tekst.includes('BEGIN:VCALENDAR')) return json(res, 200, { fout: 'Kon de agenda niet lezen.' });
          return json(res, 200, { afspraken: komendeAfspraken(leesAgenda(tekst), new Date(), Math.min(60, Math.max(1, Number(dagen) || 14))) });
        } catch {
          return json(res, 200, { fout: 'Kon de agenda niet ophalen.' });
        }
      }
      return json(res, 200, voorWinkel(staat));
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
      const { staat, bon } = await wijzig((huidig) => {
        // Komt alles van de winkel-pc (online kopie), dan is online enkel kijken; klantcodes mogen wel.
        if (huidig.spiegel && actie.op !== 'klantcode') throw new Fout('Op de gsm kan je enkel kijken. Wijzigen doe je op de winkel-pc.', 403);
        return pasToe(huidig, actie);
      });
      return json(res, 200, { ...voorWinkel(staat), bon, ...(pin ? { pin } : {}) });
    }
    return json(res, 405, { error: 'Niet toegestaan' });
  } catch (e) {
    if (e instanceof Fout) return json(res, e.status, { error: e.message });
    console.error('Winkel-app: fout', e);
    return json(res, 500, { error: 'Er ging iets mis bij het bewaren. Probeer het opnieuw.' });
  }
}
