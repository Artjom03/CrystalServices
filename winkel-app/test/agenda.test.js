import test from 'node:test';
import assert from 'node:assert/strict';
import { leesAgenda, komendeAfspraken, agendaAdres } from '../lib/agenda.js';

const ICS = `BEGIN:VCALENDAR\r
BEGIN:VEVENT\r
UID:rebul@x\r
DTSTART;TZID=Europe/Brussels:20261102T180000\r
RRULE:FREQ=WEEKLY;BYDAY=MO\r
EXDATE;TZID=Europe/Brussels:20261116T180000\r
SUMMARY:Ophalen Rebul\r
LOCATION:Bosstraat 69\\, Lummen\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:rebul@x\r
RECURRENCE-ID;TZID=Europe/Brussels:20261123T180000\r
DTSTART;TZID=Europe/Brussels:20261124T090000\r
SUMMARY:Ophalen Rebul (verzet)\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:tor@x\r
DTSTART;TZID=Europe/Brussels:20261108T200000\r
RRULE:FREQ=WEEKLY;INTERVAL=2;COUNT=3\r
SUMMARY:TOR waszakken\r
DESCRIPTION:Sleutel via\\nBart\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:een@x\r
DTSTART;VALUE=DATE:20261110\r
SUMMARY:Eenmalig\r
END:VEVENT\r
END:VCALENDAR\r
`;

test('agenda: herhalingen, uitzonderingen en verzette afspraak', () => {
  const lijst = komendeAfspraken(leesAgenda(ICS), new Date(2026, 10, 7), 28);
  const kort = lijst.map((a) => `${a.datum} ${a.tijd} ${a.titel}`);
  assert.deepEqual(kort, [
    '2026-11-08 20:00 TOR waszakken',
    '2026-11-09 18:00 Ophalen Rebul',
    '2026-11-10  Eenmalig',
    '2026-11-22 20:00 TOR waszakken',
    '2026-11-24 09:00 Ophalen Rebul (verzet)',
    '2026-11-30 18:00 Ophalen Rebul',
  ]);
  assert.equal(lijst[1].plaats, 'Bosstraat 69, Lummen');
  assert.equal(lijst[0].notitie, 'Sleutel via\nBart');
});

test('agenda: adres', () => {
  assert.equal(agendaAdres('webcal://calendar.google.com/x.ics'), 'https://calendar.google.com/x.ics');
  assert.equal(agendaAdres('http://a.b/c'), null);
  assert.equal(agendaAdres(''), '');
});
