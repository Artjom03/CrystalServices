// Ophaalagenda: leest een Google Agenda (iCal-bestand, .ics) en geeft de ophalingen van de komende dagen.
// Herhalende afspraken (bv. "elke maandag Rebul") worden uitgerekend: dagelijks, wekelijks, maandelijks, jaarlijks,
// met interval, aantal keer (COUNT), einddatum (UNTIL), weekdagen (BYDAY), uitzonderingen (EXDATE)
// en losse wijzigingen van één keer (RECURRENCE-ID).

const DAGCODE = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const DAG_MS = 86400000;

const pad = (n) => String(n).padStart(2, '0');
const isoDag = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const middag = (j, m, d) => new Date(j, m, d, 12); // 12 u: geen gedoe met zomeruur
const dagenTussen = (a, b) => Math.round((middag(b.getFullYear(), b.getMonth(), b.getDate()) - middag(a.getFullYear(), a.getMonth(), a.getDate())) / DAG_MS);

function ontsnap(t) {
  return String(t || '').replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim();
}

/** "20261109T183000Z", "20261109T183000" of "20261109" → { dag: Date (lokale dag), tijd: 'HH:MM' | '' } */
function leesTijd(waarde, params) {
  const m = String(waarde || '').trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, j, mo, d, u, mi, , z] = m;
  if (u === undefined || /VALUE=DATE(?!-)/i.test(params || '')) return { dag: middag(+j, +mo - 1, +d), tijd: '' };
  if (z) {
    // UTC-tijd omzetten naar Belgische tijd (ook als de server in UTC draait).
    const t = new Date(Date.UTC(+j, +mo - 1, +d, +u, +mi));
    const deel = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(t).map((x) => [x.type, x.value]));
    return { dag: middag(+deel.year, +deel.month - 1, +deel.day), tijd: `${deel.hour}:${deel.minute}` };
  }
  // Met TZID of zonder: de klok zoals ze er staat (de winkel zit in dezelfde tijdzone als de agenda).
  return { dag: middag(+j, +mo - 1, +d), tijd: `${u}:${mi}` };
}

/** Het .ics-bestand lezen: een lijst afspraken (VEVENT). */
export function leesAgenda(tekst) {
  const regels = String(tekst || '').replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const lijst = [];
  let ev = null;
  let diep = 0; // binnen een herinnering (VALARM) e.d. in een afspraak: die gegevens niet gebruiken
  for (const regel of regels) {
    if (regel === 'BEGIN:VEVENT') { ev = { exdates: [] }; diep = 0; continue; }
    if (regel === 'END:VEVENT') { if (ev?.start) lijst.push(ev); ev = null; continue; }
    if (!ev) continue;
    if (/^BEGIN:/i.test(regel)) { diep++; continue; }
    if (/^END:/i.test(regel)) { if (diep) diep--; continue; }
    if (diep) continue;
    const dp = regel.indexOf(':');
    if (dp < 0) continue;
    const kop = regel.slice(0, dp);
    const waarde = regel.slice(dp + 1);
    const [naam, ...rest] = kop.split(';');
    const params = rest.join(';');
    switch (naam.toUpperCase()) {
      case 'UID': ev.uid = waarde.trim(); break;
      case 'SUMMARY': ev.titel = ontsnap(waarde); break;
      case 'LOCATION': ev.plaats = ontsnap(waarde); break;
      case 'DESCRIPTION': ev.notitie = ontsnap(waarde).replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''); break;
      case 'STATUS': ev.geannuleerd = /CANCELLED/i.test(waarde); break;
      case 'DTSTART': ev.start = leesTijd(waarde, params); break;
      case 'RRULE': ev.regel = Object.fromEntries(waarde.split(';').map((p) => p.split('=')).map(([k, v]) => [k.toUpperCase(), v || ''])); break;
      case 'EXDATE': for (const w of waarde.split(',')) { const t = leesTijd(w, params); if (t) ev.exdates.push(isoDag(t.dag)); } break;
      case 'RECURRENCE-ID': { const t = leesTijd(waarde, params); if (t) ev.vervangt = isoDag(t.dag); break; }
      default: break;
    }
  }
  return lijst;
}

/** Valt dag d (na of op de start) binnen de herhaling? */
function past(regel, start, d) {
  // BYSETPOS (bv. "laatste werkdag van de maand"): enkel de n-de passende dag van die maand.
  if (regel.BYSETPOS && (regel.FREQ || '').toUpperCase() === 'MONTHLY') {
    const zonder = { ...regel }; delete zonder.BYSETPOS;
    const laatste = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const raak = [];
    for (let i = 1; i <= laatste; i++) { const x = middag(d.getFullYear(), d.getMonth(), i); if (x >= start && past(zonder, start, x)) raak.push(i); }
    return regel.BYSETPOS.split(',').map(Number).some((n) => raak[n > 0 ? n - 1 : raak.length + n] === d.getDate());
  }
  // Delen die we niet kennen: liever niet tonen dan op verkeerde dagen.
  if (regel.BYWEEKNO || regel.BYYEARDAY || (regel.BYSETPOS && (regel.FREQ || '').toUpperCase() !== 'MONTHLY')) return false;
  const freq = (regel.FREQ || '').toUpperCase();
  const iv = Math.max(1, parseInt(regel.INTERVAL, 10) || 1);
  const byday = (regel.BYDAY || '').split(',').filter(Boolean);
  const verschil = dagenTussen(start, d);
  if (freq === 'DAILY') return verschil % iv === 0 && (!byday.length || byday.some((b) => b.slice(-2) === DAGCODE[d.getDay()]));
  if (freq === 'WEEKLY') {
    const maandag = (x) => middag(x.getFullYear(), x.getMonth(), x.getDate() - ((x.getDay() + 6) % 7));
    const weken = Math.round(dagenTussen(maandag(start), maandag(d)) / 7);
    const dagen = byday.length ? byday.map((b) => b.slice(-2)) : [DAGCODE[start.getDay()]];
    return weken % iv === 0 && dagen.includes(DAGCODE[d.getDay()]);
  }
  if (freq === 'MONTHLY') {
    const maanden = (d.getFullYear() - start.getFullYear()) * 12 + d.getMonth() - start.getMonth();
    if (maanden % iv !== 0) return false;
    if (byday.length) {
      return byday.some((b) => {
        const m = b.match(/^([+-]?\d+)?([A-Z]{2})$/);
        if (!m || m[2] !== DAGCODE[d.getDay()]) return false;
        if (!m[1]) return true;
        const n = parseInt(m[1], 10);
        const laatste = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        return n > 0 ? Math.ceil(d.getDate() / 7) === n : Math.ceil((laatste - d.getDate() + 1) / 7) === -n;
      });
    }
    const laatsteDag = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const dagen = (regel.BYMONTHDAY || '').split(',').filter(Boolean).map(Number).map((n) => (n < 0 ? laatsteDag + 1 + n : n));
    return (dagen.length ? dagen : [start.getDate()]).includes(d.getDate());
  }
  if (freq === 'YEARLY') {
    return (d.getFullYear() - start.getFullYear()) % iv === 0 && d.getMonth() === start.getMonth() && d.getDate() === start.getDate();
  }
  return false;
}

/**
 * De afspraken van `vanaf` (Date) tot en met `dagen` dagen later, gesorteerd.
 * Elk: { datum: 'YYYY-MM-DD', tijd: 'HH:MM' | '', titel, plaats, notitie }.
 */
export function komendeAfspraken(lijst, vanaf = new Date(), dagen = 14) {
  const eerste = middag(vanaf.getFullYear(), vanaf.getMonth(), vanaf.getDate());
  const laatste = new Date(eerste.getTime() + dagen * DAG_MS);
  const van = isoDag(eerste);
  const tot = isoDag(laatste);
  const uit = [];
  // Losse wijzigingen van één keer uit een reeks: per uid de dagen die vervangen zijn.
  const vervangen = new Map();
  for (const ev of lijst) if (ev.vervangt && ev.uid) vervangen.set(ev.uid, new Set([...(vervangen.get(ev.uid) || []), ev.vervangt]));
  const voegToe = (ev, dag) => {
    const datum = isoDag(dag);
    if (datum < van || datum > tot || ev.geannuleerd) return;
    uit.push({ datum, tijd: ev.start.tijd, titel: ev.titel || '(zonder titel)', plaats: ev.plaats || '', notitie: ev.notitie || '' });
  };
  for (const ev of lijst) {
    const start = ev.start.dag;
    if (!ev.regel || ev.vervangt) { voegToe(ev, start); continue; }
    const eind = ev.regel.UNTIL ? leesTijd(ev.regel.UNTIL, '') : null;
    const totDag = eind ? isoDag(eind.dag) : null;
    const max = parseInt(ev.regel.COUNT, 10) || Infinity;
    const overslaan = new Set([...ev.exdates, ...(vervangen.get(ev.uid) || [])]);
    let teller = 0;
    for (let i = 0; i < 20000; i++) {
      const d = middag(start.getFullYear(), start.getMonth(), start.getDate() + i);
      if (d > laatste) break;
      const datum = isoDag(d);
      if (totDag && datum > totDag) break;
      if (!past(ev.regel, start, d)) continue;
      teller++;
      if (teller > max) break;
      if (!overslaan.has(datum)) voegToe(ev, d);
    }
  }
  return uit.sort((a, b) => (a.datum + (a.tijd || '00:00')).localeCompare(b.datum + (b.tijd || '00:00')));
}

/** Het geheime iCal-adres van Google Agenda nakijken (enkel https). */
export function agendaAdres(adres) {
  const a = String(adres || '').trim().replace(/^webcal:\/\//i, 'https://');
  if (!a) return '';
  let url;
  try { url = new URL(a); } catch { return null; }
  if (url.protocol !== 'https:') return null;
  return url.href;
}
