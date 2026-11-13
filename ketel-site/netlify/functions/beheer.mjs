// Beheer van de agenda. Beveiligd met het wachtwoord in de omgevingsvariabele BEHEER_WACHTWOORD.
import { adminOverview, openSlots, closeSlots, cancelSeat, adminPlan, adminUpdate, AgendaError } from '../../lib/agenda.mjs';
import { agendaStore, json } from '../../lib/store.mjs';
import { isBeheerder, beheerWachtwoord, feedSleutel } from '../../lib/auth.mjs';

export default async (req) => {
  if (beheerWachtwoord().length < 8) {
    return json({ error: 'Er is nog geen beheerwachtwoord ingesteld (BEHEER_WACHTWOORD in Netlify, minstens 8 tekens).' }, 503);
  }
  if (!isBeheerder(req)) return json({ error: 'Wachtwoord klopt niet.' }, 401);

  const store = agendaStore();
  try {
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const data = await adminOverview(store, url.searchParams.get('van'), url.searchParams.get('tot'));
      return json({ ...data, feed: '/api/agenda.ics?sleutel=' + feedSleutel() });
    }
    const body = await req.json().catch(() => ({}));
    switch (body.actie) {
      case 'open': return json({ ok: true, aantal: await openSlots(store, body.ids, body.plaatsen) });
      case 'sluit': return json({ ok: true, aantal: await closeSlots(store, body.ids) });
      case 'annuleer': return json({ ok: true, seat: await cancelSeat(store, body.seat) });
      case 'plan': return json({ ok: true, ...(await adminPlan(store, body.afspraak)) }, 201);
      case 'wijzig': return json({ ok: true, ...(await adminUpdate(store, body.seat, body.afspraak)) });
      default: return json({ error: 'Onbekende actie.' }, 400);
    }
  } catch (err) {
    if (err instanceof AgendaError) return json({ error: err.message, code: err.code }, err.status);
    console.error('beheer', err);
    return json({ error: 'Er liep iets mis bij het opslaan.' }, 500);
  }
};

export const config = {
  path: '/api/beheer',
  method: ['GET', 'POST'],
  rateLimit: { windowLimit: 120, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
