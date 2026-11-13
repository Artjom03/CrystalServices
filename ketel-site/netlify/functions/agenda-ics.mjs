// Agenda-abonnement: de afspraken als iCal-feed, om in Google Agenda of de iPhone-agenda te zetten.
import { adminOverview, brusselsNow, toICal } from '../../lib/agenda.mjs';
import { agendaStore } from '../../lib/store.mjs';
import { isGeldigeFeedSleutel } from '../../lib/auth.mjs';
import { site } from '../../src/site.config.mjs';

export default async (req) => {
  const url = new URL(req.url);
  if (!isGeldigeFeedSleutel(url.searchParams.get('sleutel'))) return new Response('Niet gevonden', { status: 404 });
  const today = brusselsNow().date;
  const from = new Date(Date.parse(today + 'T12:00:00Z') - 30 * 864e5).toISOString().slice(0, 10);
  const to = new Date(Date.parse(today + 'T12:00:00Z') + 365 * 864e5).toISOString().slice(0, 10);
  const { bookings } = await adminOverview(agendaStore(), from, to);
  return new Response(toICal(bookings, { name: site.naam + ' – afspraken' }), {
    headers: { 'content-type': 'text/calendar; charset=utf-8', 'cache-control': 'no-store' },
  });
};

export const config = { path: '/api/agenda.ics', method: ['GET'] };
