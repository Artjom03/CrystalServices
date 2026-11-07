// Beheer van de agenda. Beveiligd met het wachtwoord in de omgevingsvariabele BEHEER_WACHTWOORD.
import { timingSafeEqual, createHash } from 'node:crypto';
import { adminOverview, openSlots, closeSlots, cancelSeat, AgendaError } from '../../lib/agenda.mjs';
import { agendaStore, json } from '../../lib/store.mjs';

const hash = s => createHash('sha256').update(String(s)).digest();

function authorized(req) {
  const secret = Netlify.env.get('BEHEER_WACHTWOORD');
  if (!secret || secret.length < 8) return false;
  const given = req.headers.get('x-beheer-wachtwoord') || '';
  return timingSafeEqual(hash(given), hash(secret));
}

export default async (req) => {
  if (!Netlify.env.get('BEHEER_WACHTWOORD')) {
    return json({ error: 'Er is nog geen beheerwachtwoord ingesteld (BEHEER_WACHTWOORD in Netlify).' }, 503);
  }
  if (!authorized(req)) return json({ error: 'Wachtwoord klopt niet.' }, 401);

  const store = agendaStore();
  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      return json(await adminOverview(store, url.searchParams.get('van'), url.searchParams.get('tot')));
    }
    const body = await req.json().catch(() => ({}));
    if (body.actie === 'open') return json({ ok: true, aantal: await openSlots(store, body.ids, body.plaatsen) });
    if (body.actie === 'sluit') return json({ ok: true, aantal: await closeSlots(store, body.ids) });
    if (body.actie === 'annuleer') return json({ ok: true, seat: await cancelSeat(store, body.seat) });
    return json({ error: 'Onbekende actie.' }, 400);
  } catch (err) {
    if (err instanceof AgendaError) return json({ error: err.message, code: err.code }, err.status);
    console.error('beheer', err);
    return json({ error: 'Er liep iets mis bij het opslaan.' }, 500);
  }
};

export const config = {
  path: '/api/beheer',
  method: ['GET', 'POST'],
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
