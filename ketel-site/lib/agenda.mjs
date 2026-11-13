// Agendalogica voor afspraken per dagdeel (voormiddag / namiddag).
// Werkt op elke "store" met get / setJSON / list / delete (Netlify Blobs of een testopslag).
//
// Sleutels in de store:
//   slots/2026-11-05_VM      { cap: 3 }                 dagdeel staat open met 3 plaatsen
//   seats/2026-11-05_VM_1    { naam, tel, ... }         plaats 1 van dat dagdeel is geboekt

export const PARTS = {
  VM: { label: 'Voormiddag', range: '8:00 – 12:00', start: '08:00' },
  NM: { label: 'Namiddag', range: '13:00 – 17:00', start: '13:00' },
};
export const TYPES = ['Onderhoud', 'Plaatsbezoek nieuwe ketel', 'Herstelling / storing', 'Advies hybride warmtepomp'];
export const MAX_CAP = 6;
const SLOT_RE = /^(\d{4}-\d{2}-\d{2})_(VM|NM)$/;
const SEAT_RE = /^(\d{4}-\d{2}-\d{2})_(VM|NM)_(\d{1,2})$/;

export class AgendaError extends Error {
  constructor(code, message, status = 400) { super(message); this.code = code; this.status = status; }
}

/** Huidige datum en tijd in België, als "YYYY-MM-DD" en "HH:MM". */
export function brusselsNow(now = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).map(x => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

export function parseSlot(id) {
  const m = SLOT_RE.exec(String(id || ''));
  if (!m) return null;
  const d = new Date(m[1] + 'T12:00:00Z');
  if (isNaN(d) || d.toISOString().slice(0, 10) !== m[1]) return null;
  return { id: m[0], date: m[1], part: m[2] };
}

export function parseSeat(id) {
  const m = SEAT_RE.exec(String(id || ''));
  return m ? { id: m[0], slot: `${m[1]}_${m[2]}`, date: m[1], part: m[2], n: +m[3] } : null;
}

/** Is het dagdeel nog niet begonnen (Belgische tijd)? */
export function isUpcoming(slot, now = new Date()) {
  const s = typeof slot === 'string' ? parseSlot(slot) : slot;
  if (!s) return false;
  const b = brusselsNow(now);
  return s.date > b.date || (s.date === b.date && PARTS[s.part].start > b.time);
}

function addDays(date, n) {
  const d = new Date(date + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}

async function keys(store, prefix) {
  const { blobs } = await store.list({ prefix });
  return blobs.map(b => b.key.slice(prefix.length));
}

async function loadState(store, from, to) {
  const inRange = d => (!from || d >= from) && (!to || d <= to);
  const [slotIds, seatIds] = await Promise.all([keys(store, 'slots/'), keys(store, 'seats/')]);
  const slots = {};
  await Promise.all(slotIds.map(parseSlot).filter(s => s && inRange(s.date)).map(s => s.id).map(async id => {
    const v = await store.get('slots/' + id, { type: 'json', consistency: 'strong' });
    if (v) slots[id] = { cap: Math.min(MAX_CAP, Math.max(1, +v.cap || 1)) };
  }));
  const seats = seatIds.map(parseSeat).filter(s => s && inRange(s.date));
  return { slots, seats };
}

/** Publiek overzicht: enkel open dagdelen met vrije plaatsen, zonder persoonsgegevens. */
export async function publicAvailability(store, now = new Date(), days = 60) {
  const first = brusselsNow(now).date, last = addDays(first, days);
  const { slots, seats } = await loadState(store, first, last);
  const used = {};
  seats.forEach(s => { used[s.slot] = (used[s.slot] || 0) + 1; });
  return Object.entries(slots)
    .map(([id, v]) => ({ ...parseSlot(id), free: Math.max(0, v.cap - (used[id] || 0)) }))
    .filter(s => s.free > 0 && isUpcoming(s, now) && s.date <= last)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(({ id, date, part, free }) => ({ id, date, part, label: PARTS[part].label, range: PARTS[part].range, free }));
}

function clean(v, max) {
  return String(v ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
}

export function validateBooking(body) {
  const b = body || {};
  const slot = parseSlot(b.slot);
  if (!slot) throw new AgendaError('invalid_slot', 'Kies een dag en een dagdeel.');
  const naam = clean(b.naam, 80), tel = clean(b.tel, 30), adres = clean(b.adres, 160);
  const type = TYPES.includes(b.type) ? b.type : TYPES[0];
  const opmerking = clean(b.opmerking, 600);
  if (naam.length < 2) throw new AgendaError('invalid_naam', 'Vul uw naam in.');
  if (tel.replace(/\D/g, '').length < 8) throw new AgendaError('invalid_tel', 'Vul een geldig telefoonnummer in.');
  if (adres.length < 5) throw new AgendaError('invalid_adres', 'Vul uw adres in.');
  return { slot, naam, tel, adres, type, opmerking };
}

/** Boekt de eerste vrije plaats in het dagdeel. onlyIfNew maakt elke plaats atomair. */
export async function book(store, body, now = new Date()) {
  const b = validateBooking(body);
  if (!isUpcoming(b.slot, now)) throw new AgendaError('past', 'Dit moment is al voorbij. Kies een ander moment.');
  const open = await store.get('slots/' + b.slot.id, { type: 'json', consistency: 'strong' });
  if (!open) throw new AgendaError('closed', 'Dit dagdeel is niet (meer) beschikbaar. Kies een ander moment.', 409);
  const cap = Math.min(MAX_CAP, Math.max(1, +open.cap || 1));
  const record = { slot: b.slot.id, naam: b.naam, tel: b.tel, adres: b.adres, type: b.type, opmerking: b.opmerking, geboektOp: now.toISOString() };
  for (let n = 1; n <= cap; n++) {
    const key = `seats/${b.slot.id}_${n}`;
    const res = await store.setJSON(key, record, { onlyIfNew: true });
    if (res && res.modified) {
      return { seat: `${b.slot.id}_${n}`, date: b.slot.date, part: b.slot.part, label: PARTS[b.slot.part].label, range: PARTS[b.slot.part].range };
    }
  }
  throw new AgendaError('full', 'Dit dagdeel is net volgeboekt. Kies een ander moment.', 409);
}

// ---------- Beheer ----------

/** Volledig overzicht voor de beheerder, van `from` tot en met `to` (YYYY-MM-DD). */
export async function adminOverview(store, from, to) {
  const { slots, seats } = await loadState(store, from, to);
  const bookings = [];
  await Promise.all(seats.map(async s => {
    const v = await store.get('seats/' + s.id, { type: 'json', consistency: 'strong' });
    if (v) bookings.push({ seat: s.id, slot: s.slot, date: s.date, part: s.part, ...v });
  }));
  bookings.sort((a, b) => a.seat.localeCompare(b.seat, 'en', { numeric: true }));
  const out = {};
  Object.entries(slots).forEach(([id, v]) => { out[id] = v; });
  return { slots: out, bookings };
}

export async function openSlots(store, ids, cap) {
  const c = Math.min(MAX_CAP, Math.max(1, Math.round(+cap) || 1));
  const valid = [...new Set(ids || [])].map(parseSlot).filter(Boolean);
  if (valid.length > 200) throw new AgendaError('too_many', 'Te veel dagdelen tegelijk.');
  await Promise.all(valid.map(s => store.setJSON('slots/' + s.id, { cap: c })));
  return valid.length;
}

export async function closeSlots(store, ids) {
  const valid = [...new Set(ids || [])].map(parseSlot).filter(Boolean);
  await Promise.all(valid.map(s => store.delete('slots/' + s.id)));
  return valid.length;
}

export async function cancelSeat(store, seatId) {
  const s = parseSeat(seatId);
  if (!s) throw new AgendaError('invalid_seat', 'Onbekende afspraak.');
  await store.delete('seats/' + s.id);
  return s.id;
}

// ---------- Zelf inplannen en wijzigen (beheerder) ----------

export const MAX_SEATS = 30; // de beheerder mag boven de capaciteit inplannen
export const STATUSES = ['gepland', 'afgewerkt'];

function adminRecord(body, previous = {}) {
  const b = body || {};
  const naam = clean(b.naam ?? previous.naam, 80);
  if (naam.length < 2) throw new AgendaError('invalid_naam', 'Vul de naam van de klant in.');
  return {
    naam,
    tel: clean(b.tel ?? previous.tel, 30),
    adres: clean(b.adres ?? previous.adres, 160),
    type: TYPES.includes(b.type) ? b.type : (previous.type || TYPES[0]),
    opmerking: clean(b.opmerking ?? previous.opmerking, 600),
    status: STATUSES.includes(b.status) ? b.status : (previous.status || 'gepland'),
  };
}

async function claimFreeSeat(store, slotId, record) {
  for (let n = 1; n <= MAX_SEATS; n++) {
    const res = await store.setJSON(`seats/${slotId}_${n}`, record, { onlyIfNew: true });
    if (res && res.modified) return `${slotId}_${n}`;
  }
  throw new AgendaError('full', 'Dit dagdeel zit helemaal vol.', 409);
}

/** De beheerder plant een klant in, ook in een gesloten of vol dagdeel. */
export async function adminPlan(store, body, now = new Date()) {
  const slot = parseSlot(body && body.slot);
  if (!slot) throw new AgendaError('invalid_slot', 'Kies een datum en een dagdeel.');
  const record = { slot: slot.id, ...adminRecord(body), bron: 'beheer', geboektOp: now.toISOString() };
  return { seat: await claimFreeSeat(store, slot.id, record) };
}

/** Gegevens aanpassen, status wijzigen of verplaatsen naar een ander dagdeel. */
export async function adminUpdate(store, seatId, body, now = new Date()) {
  const seat = parseSeat(seatId);
  if (!seat) throw new AgendaError('invalid_seat', 'Onbekende afspraak.');
  const previous = await store.get('seats/' + seat.id, { type: 'json', consistency: 'strong' });
  if (!previous) throw new AgendaError('not_found', 'Deze afspraak bestaat niet meer.', 404);
  const record = { ...previous, ...adminRecord(body, previous), gewijzigdOp: now.toISOString() };
  const target = body && body.slot ? parseSlot(body.slot) : parseSlot(seat.slot);
  if (!target) throw new AgendaError('invalid_slot', 'Kies een geldige datum en dagdeel.');
  if (target.id === seat.slot) {
    await store.setJSON('seats/' + seat.id, record);
    return { seat: seat.id };
  }
  // Verplaatsen: eerst de nieuwe plaats vastleggen, dan pas de oude verwijderen.
  const newSeat = await claimFreeSeat(store, target.id, { ...record, slot: target.id });
  await store.delete('seats/' + seat.id);
  return { seat: newSeat, moved: true };
}

// ---------- Agenda-abonnement (iCal) voor de gsm-agenda ----------

function icsEscape(v) {
  return String(v || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}
function icsFold(line) {
  const out = []; let rest = line;
  while (Buffer.byteLength(rest, 'utf8') > 74) {
    let cut = 74; while (Buffer.byteLength(rest.slice(0, cut), 'utf8') > 74) cut--;
    out.push(rest.slice(0, cut)); rest = ' ' + rest.slice(cut);
  }
  out.push(rest); return out.join('\r\n');
}
const PART_TIMES = { VM: ['080000', '120000'], NM: ['130000', '170000'] };

export function toICal(bookings, { name = 'Afspraken', now = new Date() } = {}) {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Haard en Ketel//Agenda//NL', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:' + icsEscape(name), 'X-WR-TIMEZONE:Europe/Brussels', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
    'BEGIN:VTIMEZONE', 'TZID:Europe/Brussels',
    'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
    'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
    'END:VTIMEZONE'];
  for (const b of bookings) {
    const d = b.date.replace(/-/g, ''), [start, end] = PART_TIMES[b.part];
    const desc = [b.type, b.tel && 'Tel: ' + b.tel, b.opmerking].filter(Boolean).join('\n');
    lines.push('BEGIN:VEVENT', 'UID:' + b.seat + '@haard-en-ketel', 'DTSTAMP:' + stamp,
      `DTSTART;TZID=Europe/Brussels:${d}T${start}`, `DTEND;TZID=Europe/Brussels:${d}T${end}`,
      'SUMMARY:' + icsEscape(`${b.naam} – ${b.type}${b.status === 'afgewerkt' ? ' (afgewerkt)' : ''}`),
      'LOCATION:' + icsEscape(b.adres), 'DESCRIPTION:' + icsEscape(desc), 'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(icsFold).join('\r\n') + '\r\n';
}
