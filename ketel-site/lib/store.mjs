import { getStore } from '@netlify/blobs';

// Eén vaste opslag, in de EU (Frankfurt) omdat er persoonsgegevens in staan.
// De regio moet bij elke aanroep dezelfde zijn, anders lijkt de opslag leeg.
export const agendaStore = () => getStore({ name: 'agenda', region: 'eu-central-1', consistency: 'strong' });

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
