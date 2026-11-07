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

async function loadState(store) {
  const [slotIds, seatIds] = await Promise.all([keys(store, 'slots/'), keys(store, 'seats/')]);
  const slots = {};
  await Promise.all(slotIds.filter(parseSlot).map(async id => {
    const v = await store.get('slots/' + id, { type: 'json', consistency: 'strong' });
    if (v) slots[id] = { cap: Math.min(MAX_CAP, Math.max(1, +v.cap || 1)) };
  }));
  const seats = seatIds.map(parseSeat).filter(Boolean);
  return { slots, seats };
}

/** Publiek overzicht: enkel open dagdelen met vrije plaatsen, zonder persoonsgegevens. */
export async function publicAvailability(store, now = new Date(), days = 60) {
  const { slots, seats } = await loadState(store);
  const last = addDays(brusselsNow(now).date, days);
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
  const { slots, seats } = await loadState(store);
  const inRange = d => (!from || d >= from) && (!to || d <= to);
  const bookings = [];
  await Promise.all(seats.filter(s => inRange(s.date)).map(async s => {
    const v = await store.get('seats/' + s.id, { type: 'json', consistency: 'strong' });
    if (v) bookings.push({ seat: s.id, slot: s.slot, date: s.date, part: s.part, ...v });
  }));
  bookings.sort((a, b) => a.seat.localeCompare(b.seat, 'en', { numeric: true }));
  const out = {};
  Object.entries(slots).forEach(([id, v]) => { const s = parseSlot(id); if (inRange(s.date)) out[id] = v; });
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
