// Publieke agenda: vrije dagdelen opvragen (GET) en een afspraak boeken (POST).
import { publicAvailability, book, AgendaError } from '../../lib/agenda.mjs';
import { agendaStore, json } from '../../lib/store.mjs';

export default async (req) => {
  const store = agendaStore();
  try {
    if (req.method === 'GET') return json({ slots: await publicAvailability(store) });

    const body = await req.json().catch(() => null);
    if (!body) return json({ error: 'Ongeldige aanvraag.' }, 400);
    if (body.website) return json({ ok: true }); // honeypot: bots vullen dit verborgen veld in
    const result = await book(store, body);
    return json({ ok: true, ...result }, 201);
  } catch (err) {
    if (err instanceof AgendaError) return json({ error: err.message, code: err.code }, err.status);
    console.error('afspraak', err);
    return json({ error: 'Er liep iets mis. Bel ons gerust om de afspraak te maken.' }, 500);
  }
};

export const config = {
  path: '/api/afspraak',
  method: ['GET', 'POST'],
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ['ip', 'domain'] },
};
