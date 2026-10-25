// Crystal Winkel: bonnen voor strijk, was en droogkuis bijhouden.
(function () {
  const WINKEL = {
    naam: 'Crystal Services',
    adres: 'Lodewijk van Berckenlaan 189, 2140 Borgerhout',
    telefoon: '0494 40 38 41',
    uren: 'ma–vr van 8 tot 18 uur',
  };

  // In het Windows-programma (Electron) staat alles op de pc: geen klantenportaal, en afdrukken
  // gaat rechtstreeks naar de gekozen printer.
  const DESKTOP = Boolean(window.crystal && window.crystal.desktop);

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = (v) => '€ ' + Number(v || 0).toFixed(2).replace('.', ',');
  // Zoeken zonder hoofdletters en accenten: "rene" vindt ook "René".
  const zoekVorm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  let pin = '';
  try { pin = localStorage.getItem('winkel-pin') || ''; } catch (e) {}
  let staat = { bonnen: [], instellingen: { bewaarMaanden: 12 }, prijslijst: null };
  let tab = 'binnen';
  let bewerkId = null;
  let regels = [];
  let soorten = new Set(['Strijk']);
  let autoPrint = true;
  try { autoPrint = localStorage.getItem('winkel-autoprint') !== 'nee'; } catch (e) {}
  // Aanraakscherm: grotere knoppen en een cijferklavier. Automatisch als het toestel een aanraakscherm heeft.
  let aanraak = 'auto';
  try { aanraak = localStorage.getItem('winkel-aanraak') || 'auto'; } catch (e) {}
  function zetAanraak(keuze) {
    aanraak = keuze;
    const aan = keuze === 'aan' || (keuze === 'auto' && matchMedia('(any-pointer: coarse)').matches);
    document.documentElement.classList.toggle('aanraak', aan);
    // Met het cijferklavier op het scherm hoeft het klavier van Windows of de tablet niet open te springen.
    document.querySelectorAll('.cijferpad-veld').forEach((i) => { i.inputMode = aan ? 'none' : 'decimal'; });
    try { localStorage.setItem('winkel-aanraak', keuze); } catch (e) {}
  }

  const BEHANDELING = { strijk: 'Strijk', was: 'Was', droogkuis: 'Droogkuis', ander: 'Overige' };
  const VOLGORDE = ['strijk', 'was', 'droogkuis', 'ander'];
  // Nieuwkuis (droogkuis): prijs per stuk voor luxe, zijde en linnen (uit prijzen.js).
  const DROOGKUIS = window.DROOGKUIS || [];
  const DROOG_KOL = [['luxe', 'Luxe'], ['zijde', 'Zijde'], ['linne', 'Linnen']];
  const droogStuk = (d) => (typeof d === 'string' ? { naam: d } : d);
  // De testbon heeft nummer 00-000: scannen toont dan enkel dat de scanner werkt.
  const TEST_NR = '00-000';

  const bedragOfVolgt = (s) => (s.prijs == null ? '<span class="volgt">prijs volgt</span>' : eur(s.aantal * s.prijs));
  function groepen(stukken) {
    return VOLGORDE.map((beh) => [beh, stukken.filter((s) => (s.behandeling || 'ander') === beh)]).filter(([, l]) => l.length);
  }

  // ---------- Server ----------
  async function api(methode, body) {
    const res = await fetch('/api/bonnen', {
      method: methode,
      headers: { 'Content-Type': 'application/json', 'x-pin': pin },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) { vergrendel(data.error || 'Verkeerde pincode'); throw new Error('pin'); }
    if (!res.ok) throw new Error(data.error || 'Er ging iets mis');
    return data;
  }

  function zetStaat(data) {
    staat = {
      bonnen: data.bonnen || [],
      teller: data.teller || {},
      klanten: data.klanten || {},
      instellingen: data.instellingen || { bewaarMaanden: 12, formaat: 'klein' },
      prijslijst: data.prijslijst || null,
      klantenboek: data.klantenboek || {},
      betalingen: data.betalingen || [],
      kassa: data.kassa || {},
    };
  }

  async function laad(stil) {
    try {
      zetStaat(await api('GET'));
      melding('');
      toon();
    } catch (e) {
      if (e.message !== 'pin' && !stil) melding('Kon de bonnen niet laden. Controleer de internetverbinding.');
    }
  }

  async function doe(actie) {
    const data = await api('POST', actie);
    zetStaat(data);
    toon();
    return data;
  }

  function melding(t) {
    const el = $('#melding');
    el.textContent = t;
    el.hidden = !t;
  }

  let toastKlok;
  function toast(t) {
    const el = $('#toast');
    el.textContent = t;
    el.hidden = false;
    clearTimeout(toastKlok);
    toastKlok = setTimeout(() => { el.hidden = true; }, 5000);
  }
  // Het Windows-programma meldt zo dat er een nieuwe versie gedownload wordt.
  window.toastExtern = toast;

  // ---------- Pincode ----------
  function vergrendel(fout) {
    if (DESKTOP) {
      window.crystal.eersteKeer().then((eerste) => {
        if (!eerste) return;
        $('#slot p').textContent = 'Welkom! Kies een pincode van 4 tot 8 cijfers. Die vraagt het programma voortaan bij het openen.';
        $('#slot-form button').textContent = 'Pincode instellen';
      });
    }
    pin = '';
    try { localStorage.removeItem('winkel-pin'); } catch (e) {}
    $('#app').hidden = true;
    $('#slot').hidden = false;
    $('#slot-fout').textContent = fout || '';
    $('#slot-pin').value = '';
    $('#slot-pin').focus();
  }

  $('#slot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    pin = $('#slot-pin').value.trim();
    $('#slot-fout').textContent = '';
    try {
      zetStaat(await api('GET'));
      try { localStorage.setItem('winkel-pin', pin); } catch (e2) {}
      $('#slot').hidden = true;
      $('#app').hidden = false;
      toon();
    } catch (err) {
      if (err.message !== 'pin') $('#slot-fout').textContent = err.message;
    }
  });

  // ---------- Datums ----------
  function vandaagIso() {
    const d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  function plusDagen(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    // Geen zaterdag of zondag als klaardatum.
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  function mooiDatum(iso, metUur) {
    if (!iso) return '';
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    const opties = { weekday: 'short', day: 'numeric', month: 'short' };
    if (metUur) Object.assign(opties, { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleString('nl-BE', opties);
  }
  function dagenGeleden(iso) {
    return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  }

  // ---------- Klanten en zoeken ----------
  function telefoonIntl(tel) {
    let d = String(tel || '').replace(/[^\d+]/g, '');
    if (d.startsWith('+')) d = d.slice(1);
    else if (d.startsWith('00')) d = d.slice(2);
    else if (d.startsWith('0')) d = '32' + d.slice(1);
    return d.length >= 8 ? d : '';
  }
  // Wat in de streepjescode staat: het bonnummer zonder streepje (26-001 wordt 26001).
  const scanCode = (nr) => String(nr || '').replace(/\D/g, '');
  // Tickets: één per zak, mand of hanger, elk met een eigen locatie. Oude bonnen hebben er geen.
  const ticketsVan = (b) => (Array.isArray(b.tickets) ? b.tickets : []);
  // Elk ticket heeft een eigen streepjescode: het bonnummer met het ticketnummer erachter (bv. 482913 02).
  const ticketCode = (b, i) => scanCode(b.nr) + String(i + 1).padStart(2, '0');
  // Welke tickets bij het teruggeven al gescand zijn (op dit toestel): bon-id → nummers.
  // Blijft bewaard als het programma tussendoor sluit.
  const gescandeTickets = new Map();
  try { for (const [id, l] of Object.entries(JSON.parse(localStorage.getItem('winkel-gescand') || '{}'))) gescandeTickets.set(id, new Set(l)); } catch (e) {}
  const bewaarGescand = () => {
    try { localStorage.setItem('winkel-gescand', JSON.stringify(Object.fromEntries([...gescandeTickets].map(([id, set]) => [id, [...set]])))); } catch (e) {}
  };
  const nietGescand = (b) => ticketsVan(b).map((t, i) => ({ ...t, i })).filter((t) => !gescandeTickets.get(b.id)?.has(t.i));
  const ticketNaam = (t) => `ticket ${t.i + 1}${t.locatie ? ' (' + t.locatie + ')' : ''}`;
  const klantSleutel = (k) => telefoonIntl(k.telefoon) || 'naam:' + zoekVorm(k.naam).trim();
  /** Krijgt deze klant de aparte A4-bon met vlekkencontrole? (op sleutel, of anders op naam) */
  function vlekkenKlant(k) {
    if (!k) return false;
    const sleutel = klantSleutel(k);
    const naam = zoekVorm(k.naam).trim();
    return Object.values(staat.klantenboek || {}).some((x) => x.vlekkenrapport && (x.sleutel === sleutel || zoekVorm(x.naam).trim() === naam));
  }
  /** Moet bij deze klant het vliegtuig op de bon? (vinkje in Klanten, anders op naam: Flying Group, ASL/ISL) */
  function vliegtuigKlant(k) {
    if (!k) return false;
    const x = (staat.klantenboek || {})[klantSleutel(k)];
    if (x && typeof x.vliegtuig === 'boolean') return x.vliegtuig;
    return /flying|\basl\b|\bisl\b/i.test(k.naam || '');
  }
  const vlekTag = (s) => (s.vlek ? '<span class="vlek-tag">⚠ met vlek</span>' : '');
  /** Hoeveel stukken van een regel een vlek hebben (oudere bonnen: allemaal). */
  const vlekAantalVan = (s) => (s.vlek ? Math.min(s.aantal, Number(s.vlekAantal) || s.aantal) : 0);
  /**
   * Voor op papier en op het scherm: een regel waarvan maar een deel een vlek heeft, wordt
   * twee regels, bv. "3 Servet, vlek" en "7 Servet, geen vlek".
   */
  const splitsVlekken = (stukken) => stukken.flatMap((s) => {
    const n = vlekAantalVan(s);
    if (!n || n >= s.aantal) return [s];
    const { vlek, vlekAantal, ...zonder } = s;
    return [{ ...s, aantal: n }, { ...zonder, aantal: s.aantal - n }];
  });

  function zoekTekst(b) {
    const intl = telefoonIntl(b.klant.telefoon);
    return zoekVorm([
      b.nr, scanCode(b.nr), b.klant.naam, b.klant.email, b.locatie, b.vliegtuig || '', b.factuur && !b.factuur.gemaaktOp ? 'factuur' : '',
      // Het nummer in elke schrijfwijze: 0470123456, 32470123456
      b.klant.telefoon.replace(/\D/g, ''), intl, intl.startsWith('32') ? '0' + intl.slice(2) : '',
    ].join(' '));
  }

  function past(b, q) {
    if (!q) return true;
    const t = zoekTekst(b);
    // Enkel cijfers (en spaties, +, /, punten): een telefoon- of bonnummer, in welke schrijfwijze ook.
    if (/^[\d\s+()./-]+$/.test(q) && q.replace(/\D/g, '').length >= 4) {
      const cijfers = q.replace(/\D/g, '');
      const intl = telefoonIntl(q);
      return t.includes(cijfers) || Boolean(intl && t.includes(intl));
    }
    return zoekVorm(q).split(/\s+/).every((w) => t.includes(w));
  }

  /** De klanten in Klanten (enkel wie bewaard is; ook als hun bonnen gewist zijn), met hun bonnen. */
  function klanten() {
    const per = new Map();
    for (const k of Object.values(staat.klantenboek || {})) {
      per.set(k.sleutel, { ...k, bonnen: 0, open: 0 });
    }
    const opDatum = [...(staat.bonnen || [])].sort((a, b) => a.binnenOp.localeCompare(b.binnenOp));
    for (const b of opDatum) {
      const sleutel = klantSleutel(b.klant);
      const k = per.get(sleutel);
      if (!k) continue;
      k.telefoon = b.klant.telefoon || k.telefoon;
      k.email = b.klant.email || k.email;
      k.bonnen += 1;
      if (b.status !== 'opgehaald') k.open += 1;
      per.set(sleutel, k);
    }
    return [...per.values()];
  }

  // ---------- Lijst ----------
  function toon() {
    const q = $('#zoek').value.trim();
    const bonnen = staat.bonnen || [];
    $('#n-binnen').textContent = bonnen.filter((b) => b.status === 'binnen').length;
    $('#n-klaar').textContent = bonnen.filter((b) => b.status === 'klaar').length;

    // Bij zoeken: alle statussen tonen.
    let lijst = q ? bonnen.filter((b) => past(b, q)) : bonnen.filter((b) => b.status === tab);
    if (!q && tab === 'opgehaald') lijst = lijst.filter((b) => dagenGeleden(b.opgehaaldOp) <= 60);
    const sleutel = (b) =>
      q ? b.binnenOp
      : b.status === 'binnen' ? (b.klaarTegen || '9999') + b.binnenOp
      : b.status === 'klaar' ? b.klaarOp
      : b.opgehaaldOp;
    lijst.sort((a, b) => (tab === 'opgehaald' || q ? -1 : 1) * sleutel(a).localeCompare(sleutel(b)));

    $('#lijst').innerHTML = (q && lijst.length ? zoekKop(lijst) : '') + lijst.map(kaart).join('');
    $('#leeg').hidden = lijst.length > 0;
    $('#leeg').textContent = q ? 'Geen bonnen gevonden.' : { binnen: 'Geen bonnen in behandeling.', klaar: 'Niets klaar om op te halen.', opgehaald: 'Nog niets opgehaald de laatste 60 dagen.' }[tab];
    const maanden = staat.instellingen?.bewaarMaanden || 12;
    $('#voetnoot').hidden = Boolean(q) || tab !== 'opgehaald';
    $('#voetnoot').textContent = `Hier staan de laatste 60 dagen; oudere bonnen vind je via zoeken. Opgehaalde bonnen worden na ${maanden} ${maanden === 1 ? 'maand' : 'maanden'} gewist (⚙ Instellingen).`;
    toonLocaties();
    controleerKassa();
  }

  /** Boven de zoekresultaten: de klant, als alle gevonden bonnen van dezelfde klant zijn. */
  function zoekKop(lijst) {
    const sleutels = new Set(lijst.map((b) => klantSleutel(b.klant)));
    if (sleutels.size !== 1) return `<li class="zoek-kop">${lijst.length} bonnen gevonden</li>`;
    const k = klanten().find((x) => x.sleutel === [...sleutels][0]);
    if (!k) return '';
    return `<li class="zoek-kop klant-kaart">
      <div><strong>${esc(k.naam)}</strong>${k.telefoon ? ' · ' + esc(k.telefoon) : ''}${k.email ? ' · ' + esc(k.email) : ''}
        <div class="tijdlijn">${k.bonnen} bon${k.bonnen === 1 ? '' : 'nen'}${k.open ? `, waarvan ${k.open} nog niet opgehaald` : ', alles opgehaald'}</div></div>
      <button class="knop goud" data-nieuw-voor="${esc(k.sleutel)}">+ Nieuwe bon</button>
    </li>`;
  }

  function kaart(b) {
    const vandaag = vandaagIso();
    let label = '';
    if (b.status === 'binnen' && b.klaarTegen) {
      const cls = b.klaarTegen < vandaag ? 'laat' : b.klaarTegen === vandaag ? 'vandaag' : '';
      label = `<span class="label ${cls}">${b.klaarTegen === vandaag ? 'Vandaag klaar' : 'Klaar ' + esc(mooiDatum(b.klaarTegen))}</span>`;
    } else if (b.status === 'klaar') {
      const d = dagenGeleden(b.klaarOp);
      label = b.verwittigdOp
        ? `<span class="label ${d >= 14 ? 'laat' : 'ok'}">Verwittigd${d >= 1 ? ' · ' + d + ' d' : ''}</span>`
        : '<span class="label vandaag">Nog verwittigen</span>';
    } else if (b.status === 'opgehaald') {
      label = `<span class="label">Opgehaald ${esc(mooiDatum(b.opgehaaldOp))}</span>`;
    }
    const aantal = b.stukken.reduce((n, s) => n + s.aantal, 0);
    const locatie = (b.locatie && b.status !== 'opgehaald' ? ` · <b class="loc">📍 ${esc(b.locatie)}</b>` : '')
      + (b.factuur && !b.factuur.gemaaktOp ? ' · <b class="loc">🧾 factuur</b>' : '');
    return `<li class="bon" data-id="${esc(b.id)}" tabindex="0">
      <div class="nr">${esc(b.nr)}</div>
      <div class="naam">${esc(b.klant.naam)}${b.klant.telefoon ? ` <span class="tel">${esc(b.klant.telefoon)}</span>` : ''}</div>
      <div class="rechts">${label}<span>${b.totaal ? eur(b.totaal) : ''}${b.betaald ? ' · betaald' : ''}</span></div>
      <div class="info">${esc(b.soort)}${aantal ? ' · ' + aantal + ' stuk' + (aantal > 1 ? 's' : '') : ''}${locatie}</div>
    </li>`;
  }

  const vasteLocaties = () => staat.instellingen?.locaties || [];
  /** Locaties waar nu nog iets ligt of hangt (bonnen die nog niet opgehaald zijn), met hoeveel tickets. */
  function bezetteLocaties() {
    const bezet = new Map();
    for (const b of staat.bonnen || []) {
      if (b.status === 'opgehaald') continue;
      for (const l of ticketsVan(b).length ? ticketsVan(b).map((t) => t.locatie) : [b.locatie]) {
        if (l) bezet.set(zoekVorm(l), (bezet.get(zoekVorm(l)) || 0) + 1);
      }
    }
    return bezet;
  }
  function toonLocaties() {
    // Voorstellen voor het locatieveld: eerst de vaste locaties, dan wat nu in gebruik is.
    const gebruikt = (staat.bonnen || []).slice().sort((a, b) => (a.status === 'opgehaald') - (b.status === 'opgehaald'))
      .flatMap((b) => (ticketsVan(b).length ? ticketsVan(b).map((t) => t.locatie) : [b.locatie])).filter(Boolean);
    $('#locaties').innerHTML = [...new Set([...vasteLocaties(), ...gebruikt])].slice(0, 200).map((l) => `<option value="${esc(l)}"></option>`).join('');
  }

  $('#lijst').addEventListener('click', (e) => {
    const nieuwVoor = e.target.closest('[data-nieuw-voor]');
    if (nieuwVoor) {
      const k = klanten().find((x) => x.sleutel === nieuwVoor.dataset.nieuwVoor);
      openFormulier(null, k);
      return;
    }
    const li = e.target.closest('.bon');
    if (li) openDetail(li.dataset.id);
  });
  $('#lijst').addEventListener('keydown', (e) => {
    const li = e.target.closest('.bon');
    if (li && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openDetail(li.dataset.id); }
  });
  $$('.tabs button').forEach((knop) => knop.addEventListener('click', () => {
    tab = knop.dataset.tab;
    $$('.tabs button').forEach((k) => k.setAttribute('aria-selected', String(k === knop)));
    $('#zoek').value = '';
    toon();
  }));
  $('#zoek').addEventListener('input', toon);
  // Enter in het zoekveld: is er precies één bon, dan gaat die open (handig met een bonnummer).
  $('#zoek').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const ids = $$('#lijst .bon').map((li) => li.dataset.id);
    if (ids.length === 1) { e.preventDefault(); openDetail(ids[0]); }
  });

  function zoekKlant(b) {
    $('#zoek').value = b.klant.telefoon || b.klant.naam;
    toon();
    window.scrollTo(0, 0);
  }

  // ---------- Klant verwittigen ----------
  function bericht(b) {
    const voornaam = b.klant.naam.split(' ')[0];
    const woorden = { Strijk: 'strijkwerk', Was: 'was', Droogkuis: 'droogkuis', Schoenen: 'schoenen', Motorkleding: 'motorkleding', Ander: 'bestelling' };
    const lijst = (b.soorten || [b.soort]).map((x) => woorden[x] || 'bestelling');
    const meer = lijst.length > 1 || lijst[0] === 'schoenen';
    const wat = 'uw ' + (lijst.length > 1 ? lijst.slice(0, -1).join(', ') + ' en ' + lijst[lijst.length - 1] : lijst[0]) + (meer ? ' zijn' : ' is');
    const teBetalen = !b.betaald && b.totaal && !b.prijsOpen ? ` Te betalen: ${eur(b.totaal)}.` : '';
    const portaal = heeftToegang(b) ? ` Al uw bonnen: ${PORTAAL}` : '';
    return `Dag ${voornaam}, ${wat} klaar bij ${WINKEL.naam} (bon ${b.nr}). U kan het ophalen aan de ${WINKEL.adres}, ${WINKEL.uren}.${teBetalen}${portaal} Tot binnenkort!`;
  }

  // ---------- Klantenportaal ----------
  const PORTAAL = location.origin + '/klant/';
  function heeftToegang(b) {
    if (DESKTOP) return false;
    const sleutel = telefoonIntl(b.klant.telefoon);
    return Boolean(sleutel && staat.klanten && staat.klanten[sleutel]);
  }
  function uitnodiging(b, pin) {
    const voornaam = b.klant.naam.split(' ')[0];
    return `Dag ${voornaam}, via ${PORTAAL} kan u voortaan al uw bonnen bij ${WINKEL.naam} volgen: wat er klaar is en wat u nog moet ophalen. Meld u aan met uw gsm-nummer en deze code: ${pin}`;
  }
  function portaalBlok(b, nieuwePin) {
    const tel = telefoonIntl(b.klant.telefoon);
    if (!tel) return '<p class="tijdlijn">Vul een gsm-nummer in (via Wijzigen) om de klant toegang te geven.</p>';
    if (nieuwePin) {
      const tekst = encodeURIComponent(uitnodiging(b, nieuwePin));
      return `<p>Code voor ${esc(b.klant.naam)}: <strong style="font-size:1.4rem;letter-spacing:.15em">${esc(nieuwePin)}</strong></p>
        <p class="tijdlijn">Stuur ze nu door. De code wordt maar één keer getoond; kwijt is een nieuwe maken.</p>
        <div class="d-knoppen">
          <a class="knop wa" href="https://wa.me/${tel}?text=${tekst}" target="_blank" rel="noopener">WhatsApp</a>
          <a class="knop" href="sms:+${tel}?&body=${tekst}">SMS</a>
        </div>`;
    }
    const k = staat.klanten && staat.klanten[tel];
    if (k) {
      return `<p class="tijdlijn">Heeft toegang sinds ${esc(mooiDatum(k.sinds))}${k.laatsteLogin ? ', laatst gekeken ' + esc(mooiDatum(k.laatsteLogin, true)) : ', nog niet aangemeld'}.</p>
        <div class="d-knoppen"><button class="knop" data-actie="klantcode" data-opnieuw="1">Nieuwe code</button></div>`;
    }
    return `<p class="tijdlijn">De klant kan met gsm-nummer en een code al zijn bonnen online volgen.</p>
      <div class="d-knoppen"><button class="knop goud" data-actie="klantcode">Toegang geven</button></div>`;
  }

  // ---------- Detail ----------
  function bonVan(id) { return (staat.bonnen || []).find((b) => b.id === id); }

  function openDetail(id, nieuwePin, boodschap) {
    const b = bonVan(id);
    if (!b) return;
    $('#d-titel').textContent = `Bon ${b.nr} · ${b.klant.naam}`;
    const tel = telefoonIntl(b.klant.telefoon);
    const tekst = encodeURIComponent(bericht(b));
    const stukken = b.stukken.length
      ? `<table class="stukken"><tbody>${groepen(splitsVlekken(b.stukken)).map(([beh, lijst]) =>
          `<tr class="groep"><td colspan="3">${BEHANDELING[beh]}</td></tr>` +
          lijst.map((s) => `<tr><td>${s.aantal} ×</td><td>${esc(s.naam)}${s.vlek ? '<br>' + vlekTag(s) : ''}</td><td class="bedrag">${bedragOfVolgt(s)}</td></tr>`).join('')).join('')}</tbody>
         <tfoot><tr><td colspan="2">Totaal</td><td class="bedrag">${eur(b.totaal)}${b.prijsOpen ? ' <span class="volgt">+ prijs volgt</span>' : ''}</td></tr></tfoot></table>`
      : '<p class="tijdlijn">Nog geen stukken ingevuld.</p>';

    // Ophalen kan ook rechtstreeks vanuit "in behandeling", bijvoorbeeld na het scannen van de bon.
    const ophalen = (stijl, extra = '') => `
      <div class="d-blok" id="d-ophalen">
        <h3>Opgehaald${b.betaald ? '' : ' en betaald met'}</h3>
        <div class="d-knoppen">
          ${b.betaald
            ? `<button class="knop ${stijl}" data-actie="opgehaald">Opgehaald</button>`
            : ['cash', 'kaart', 'dienstencheques'].map((w) => `<button class="knop ${stijl}" data-actie="opgehaald" data-betaal="${w}">${w[0].toUpperCase() + w.slice(1)}</button>`).join('')
              + '<button class="knop" data-actie="opgehaald" data-betaal="">Nog niet betaald</button>'}
          ${extra}
        </div>
      </div>`;
    let status;
    if (b.status === 'binnen') {
      status = `<div class="d-blok"><h3>Status</h3><div class="d-knoppen"><button class="knop hoofd" data-actie="klaar">Klaar ✓</button></div></div>${ophalen('')}`;
    } else if (b.status === 'klaar') {
      status = `
        <div class="d-blok">
          <h3>Klant verwittigen</h3>
          <div class="d-knoppen">
            ${tel ? `<a class="knop wa" data-verwittig href="https://wa.me/${tel}?text=${tekst}" target="_blank" rel="noopener">WhatsApp</a>
                     <a class="knop" data-verwittig href="sms:+${tel}?&body=${tekst}">SMS</a>` : ''}
            ${b.klant.email ? `<a class="knop" data-verwittig href="mailto:${esc(b.klant.email)}?subject=${encodeURIComponent('Uw bestelling is klaar')}&body=${tekst}">E-mail</a>` : ''}
            ${!tel && !b.klant.email ? '<p class="tijdlijn">Geen telefoon of e-mail ingevuld: bel of laat de klant zelf langskomen.</p>' : ''}
          </div>
        </div>
        ${ophalen('hoofd', '<button class="knop" data-actie="binnen">Terug naar in behandeling</button>')}`;
    } else {
      status = `<div class="d-blok"><h3>Status</h3><div class="d-knoppen"><button class="knop" data-actie="klaar">Toch niet opgehaald</button></div></div>`;
    }

    $('#d-inhoud').innerHTML = `
      ${boodschap ? `<p class="d-melding">${esc(boodschap)}</p>` : ''}
      <div class="d-blok">
        <h3>Klant</h3>
        <p><strong>${esc(b.klant.naam)}</strong></p>
        ${b.klant.telefoon ? `<p><a href="tel:${esc(b.klant.telefoon.replace(/\s/g, ''))}">${esc(b.klant.telefoon)}</a></p>` : ''}
        ${b.klant.email ? `<p>${esc(b.klant.email)}</p>` : ''}
        <div class="d-knoppen" style="margin-top:6px"><button class="knop klein" data-actie="klant">Alle bonnen van deze klant</button></div>
      </div>
      ${ticketsVan(b).length ? ticketBlok(b) : `<div class="d-blok">
        <h3>Locatie in de winkel</h3>
        <form class="d-locatie" data-locatie>
          <input name="locatie" list="locaties" maxlength="40" value="${esc(b.locatie || '')}" placeholder="Waar liggen de kleren? Bv. rek 3" aria-label="Locatie" autocomplete="off">
          <button class="knop" type="submit">Opslaan</button>
        </form>
      </div>`}
      <div class="d-blok">
        <h3>${esc(b.soort)}${b.klaarTegen ? ' · klaar tegen ' + esc(mooiDatum(b.klaarTegen)) : ''}</h3>
        ${stukken}
        ${b.vliegtuig ? `<p style="margin-top:8px">✈ Vliegtuig: <b>${esc(b.vliegtuig)}</b></p>` : ''}
        ${b.opmerking ? `<p style="margin-top:8px">📝 ${esc(b.opmerking)}</p>` : ''}
        <p class="tijdlijn" style="margin-top:8px">${b.betaald ? 'Betaald' + (b.betaalwijze ? ' (' + esc(b.betaalwijze) + ')' : '') : 'Nog niet betaald'}</p>
      </div>
      ${status}
      ${DESKTOP ? '' : `<div class="d-blok">
        <h3>Klantenportaal</h3>
        ${portaalBlok(b, nieuwePin)}
      </div>`}
      <div class="d-blok tijdlijn">
        Binnen: ${esc(mooiDatum(b.binnenOp, true))}
        ${b.klaarOp ? '<br>Klaar: ' + esc(mooiDatum(b.klaarOp, true)) : ''}
        ${b.verwittigdOp ? '<br>Verwittigd: ' + esc(mooiDatum(b.verwittigdOp, true)) : ''}
        ${b.opgehaaldOp ? '<br>Opgehaald: ' + esc(mooiDatum(b.opgehaaldOp, true)) : ''}
      </div>
      <div class="d-blok">
        <h3>Factuur</h3>
        ${b.factuur ? `
          <p class="d-factuur ${b.factuur.gemaaktOp ? 'ok' : ''}">${b.factuur.gemaaktOp ? '✓ Factuur gemaakt op ' + esc(mooiDatum(b.factuur.gemaaktOp)) : '🧾 Factuur gevraagd op ' + esc(mooiDatum(b.factuur.gevraagdOp, true))}</p>
          <form class="d-factuurgegevens" data-factuur>
            <p class="tijdlijn">Niet verplicht: vraag de klant gerust naar de gegevens voor de factuur.</p>
            <input name="naam" maxlength="80" value="${esc(b.factuur.naam)}" placeholder="Naam op de factuur (bv. bedrijfsnaam)" autocomplete="off">
            <input name="adres" maxlength="160" value="${esc(b.factuur.adres)}" placeholder="Adres" autocomplete="off">
            <div class="rij">
              <input name="btw" maxlength="30" value="${esc(b.factuur.btw)}" placeholder="Btw-nummer" autocomplete="off">
              <input name="email" type="email" maxlength="120" value="${esc(b.factuur.email)}" placeholder="E-mail" autocomplete="off">
            </div>
            <div class="d-knoppen">
              <button class="knop" type="submit">Gegevens opslaan</button>
              <button class="knop" type="button" data-actie="factuurGemaakt">${b.factuur.gemaaktOp ? 'Toch nog niet gemaakt' : 'Factuur gemaakt ✓'}</button>
              <button class="knop gevaar" type="button" data-actie="factuurIntrekken">Aanvraag intrekken</button>
            </div>
          </form>`
        : `<div class="d-knoppen"><button class="knop goud" data-actie="factuurVraag">🧾 Factuur aanvragen</button></div>`}
      </div>
      <div class="d-blok">
        <h3>Afdrukken</h3>
        <div class="d-knoppen">
          <select id="d-formaat" aria-label="Formaat">
            <option value="klein"${standaardFormaat() === 'klein' ? ' selected' : ''}>Klein bonnetje</option>
            <option value="a4"${standaardFormaat() === 'a4' ? ' selected' : ''}>Groot op A4</option>
          </select>
          <button class="knop" data-actie="print" data-soort="klant">Klantenbon</button>
          <button class="knop" data-actie="print" data-soort="mand">Tickets</button>
          <button class="knop" data-actie="print" data-soort="afhaal">Afhaalbon</button>
        </div>
      </div>
      <div class="d-knoppen">
        <button class="knop" data-actie="wijzig">Wijzigen</button>
        <button class="knop gevaar" data-actie="verwijder">Verwijderen</button>
      </div>`;
    $('#detail').dataset.id = id;
    if (!$('#detail').open) $('#detail').showModal();
    if (boodschap && $('#d-ophalen')) {
      $('#d-ophalen').classList.add('licht');
      $('#d-ophalen').scrollIntoView({ block: 'nearest' });
    }
  }

  /** De tickets van een bon in het detail: locatie aanpassen, en zien welke al gescand zijn. */
  const ticketRij = (t, i, ok) => `<div class="t-rij${ok ? ' ok' : ''}">
      <span class="t-nr">${i + 1}</span>
      <input name="ticket" list="locaties" maxlength="40" value="${esc(t.locatie)}" placeholder="Locatie, bv. rek 3" aria-label="Locatie van ticket ${i + 1}" autocomplete="off">
      <span class="t-status">${ok ? '✓ gescand' : 'nog scannen'}</span>
      <button type="button" class="weg" data-ticket-weg aria-label="Ticket weghalen">✕</button>
    </div>`;
  function ticketBlok(b) {
    const tickets = ticketsVan(b);
    const ok = gescandeTickets.get(b.id) || new Set();
    const klaar = b.status !== 'opgehaald';
    return `<div class="d-blok">
        <h3>Tickets <small>(${ok.size} van ${tickets.length} gescand${klaar ? ': scan elk ticket bij het teruggeven' : ''})</small></h3>
        <form class="d-tickets" data-tickets>
          <div class="t-rijen">${tickets.map((t, i) => ticketRij(t, i, ok.has(i))).join('')}</div>
          <div class="d-knoppen">
            <button class="knop klein" type="button" data-ticket-plus>+ Ticket</button>
            <button class="knop" type="submit">Opslaan</button>
            <button class="knop" type="button" data-actie="print" data-soort="mand">Tickets afdrukken</button>
          </div>
        </form>
      </div>`;
  }
  $('#detail').addEventListener('click', (e) => {
    if (e.target.closest('[data-ticket-plus]')) {
      const rijen = $('#detail .t-rijen');
      rijen.insertAdjacentHTML('beforeend', ticketRij({ locatie: '' }, rijen.children.length, false));
      rijen.lastElementChild.querySelector('input').focus();
    } else if (e.target.closest('[data-ticket-weg]')) {
      const rijen = $('#detail .t-rijen');
      if (rijen.children.length > 1) e.target.closest('.t-rij').remove();
      [...rijen.children].forEach((r, i) => { r.querySelector('.t-nr').textContent = i + 1; });
    }
  });
  $('#detail').addEventListener('submit', async (e) => {
    if (!e.target.matches('[data-tickets]')) return;
    e.preventDefault();
    const id = $('#detail').dataset.id;
    const voor = ticketsVan(bonVan(id)).length;
    const tickets = $$('input[name=ticket]', e.target).map((i) => ({ locatie: i.value }));
    try {
      await doe({ op: 'locatie', id, tickets });
      // Andere tickets: wat al gescand was, telt niet meer.
      if (tickets.length !== voor) { gescandeTickets.delete(id); bewaarGescand(); }
      openDetail(id);
      toast(tickets.length !== voor ? 'Opgeslagen ✓ Druk de tickets opnieuw af.' : 'Opgeslagen ✓');
    } catch (err) {
      if (err.message !== 'pin') alert(err.message);
    }
  });

  $('#detail').addEventListener('click', async (e) => {
    const id = $('#detail').dataset.id;
    const b = bonVan(id);
    if (!b) return;
    if (e.target.closest('[data-verwittig]')) {
      // De link opent WhatsApp/SMS/mail; wij noteren dat de klant verwittigd is.
      doe({ op: 'verwittigd', id }).then(() => openDetail(id)).catch((err) => alert(err.message));
      return;
    }
    const knop = e.target.closest('[data-actie]');
    if (!knop) return;
    const actie = knop.dataset.actie;
    try {
      if (actie === 'klaar' || actie === 'binnen') {
        await doe({ op: 'status', id, status: actie });
        openDetail(id);
      } else if (actie === 'opgehaald') {
        if (b.prijsOpen) {
          // Bij het ophalen moet alles een prijs hebben, anders klopt de afhaalbon niet.
          if (confirm('Er staan nog stukken zonder prijs (bv. droogkuis). Nu de prijzen invullen?')) {
            $('#detail').close();
            openFormulier(b);
          }
          return;
        }
        // Elk ticket hoort gescand te zijn, zodat er geen zak of hanger achterblijft.
        const missen = nietGescand(b);
        if (missen.length && !confirm(`${missen.length} van de ${ticketsVan(b).length} tickets ${missen.length === 1 ? 'is' : 'zijn'} niet gescand: ${missen.map(ticketNaam).join(', ')}.\n\nToch afgeven?`)) return;
        // data-betaal="" betekent opgehaald maar nog niet betaald.
        const betaal = knop.dataset.betaal;
        const { bon: na } = await doe({ op: 'status', id, status: 'opgehaald', betaalwijze: betaal || undefined });
        gescandeTickets.delete(id);
        bewaarGescand();
        $('#detail').close();
        if (autoPrint) drukAf(na, 'afhaal', standaardFormaat());
      } else if (actie === 'klantcode') {
        if (knop.dataset.opnieuw && !confirm('Een nieuwe code maken? De oude code werkt dan niet meer.')) return;
        const data = await doe({ op: 'klantcode', telefoon: b.klant.telefoon, naam: b.klant.naam });
        openDetail(id, data.pin);
      } else if (actie === 'print') {
        if (knop.dataset.soort === 'afhaal' && b.prijsOpen && !confirm('Er staan nog stukken zonder prijs. Toch een afhaalbon afdrukken?')) return;
        drukAf(b, knop.dataset.soort, $('#d-formaat').value);
      } else if (actie === 'factuurVraag') {
        await doe({ op: 'factuurVraag', id });
        openDetail(id);
        toast('Factuur aangevraagd ✓ Ze staat op het dagoverzicht.');
      } else if (actie === 'factuurIntrekken') {
        if (!confirm('De factuuraanvraag voor deze bon intrekken?')) return;
        await doe({ op: 'factuurVraag', id, aan: false });
        openDetail(id);
      } else if (actie === 'factuurGemaakt') {
        await doe({ op: 'factuurGemaakt', id, gemaakt: !b.factuur?.gemaaktOp });
        openDetail(id);
      } else if (actie === 'klant') {
        $('#detail').close();
        zoekKlant(b);
      } else if (actie === 'wijzig') {
        $('#detail').close();
        openFormulier(b);
      } else if (actie === 'verwijder') {
        if (!confirm(`Bon ${b.nr} van ${b.klant.naam} verwijderen?`)) return;
        await doe({ op: 'verwijder', id });
        $('#detail').close();
      }
    } catch (err) {
      if (err.message !== 'pin') alert(err.message);
    }
  });

  // Factuurgegevens bewaren.
  $('#detail').addEventListener('submit', async (e) => {
    if (!e.target.matches('[data-factuur]')) return;
    e.preventDefault();
    const id = $('#detail').dataset.id;
    const f = e.target;
    try {
      await doe({ op: 'factuurVraag', id, gegevens: { naam: f.naam.value, adres: f.adres.value, btw: f.btw.value, email: f.email.value } });
      openDetail(id);
      toast('Factuurgegevens opgeslagen ✓');
    } catch (err) {
      if (err.message !== 'pin') alert(err.message);
    }
  });

  // Locatie bewaren zonder de hele bon te openen.
  $('#detail').addEventListener('submit', async (e) => {
    if (!e.target.matches('[data-locatie]')) return;
    e.preventDefault();
    const id = $('#detail').dataset.id;
    const knop = e.target.querySelector('button');
    knop.disabled = true;
    try {
      await doe({ op: 'locatie', id, locatie: e.target.locatie.value });
      knop.textContent = 'Opgeslagen ✓';
      setTimeout(() => { knop.textContent = 'Opslaan'; knop.disabled = false; }, 1500);
    } catch (err) {
      knop.disabled = false;
      if (err.message !== 'pin') alert(err.message);
    }
  });

  // ---------- Streepjescode (Code 128) ----------
  // Elk teken bestaat uit 3 strepen en 3 spaties; de cijfers zijn hun breedtes. De laatste is het stopteken.
  const CODE128 = ('212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 ' +
    '123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 ' +
    '131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 ' +
    '213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 ' +
    '112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 ' +
    '421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 ' +
    '2331112').split(' ');

  /** Een streepjescode als SVG; module = breedte van de dunste streep in mm. */
  function streepjescode(tekst, module = 0.5) {
    const waarden = [...tekst].map((c) => c.charCodeAt(0) - 32); // Code 128B
    const controle = waarden.reduce((som, w, i) => som + w * (i + 1), 104) % 103;
    const patroon = [104, ...waarden, controle, 106].map((w) => CODE128[w]).join('');
    const stilte = 10; // witte rand links en rechts, nodig om te kunnen scannen
    let x = stilte;
    let strepen = '';
    [...patroon].forEach((cijfer, i) => {
      if (i % 2 === 0) strepen += `<rect x="${x}" y="0" width="${cijfer}" height="1"/>`;
      x += Number(cijfer);
    });
    const breed = x + stilte;
    return `<svg class="pr-streepjes" viewBox="0 0 ${breed} 1" preserveAspectRatio="none" style="width:${(breed * module).toFixed(1)}mm" shape-rendering="crispEdges" aria-hidden="true">${strepen}</svg>`;
  }

  // ---------- Streepjescode scannen ----------
  // Een USB-scanner werkt als een toetsenbord: hij "typt" razendsnel de cijfers en drukt op Enter.
  // We kijken naar de toets zelf (e.code), zodat het ook werkt met een AZERTY-toetsenbord.
  let scan = [];
  let vorigeToets = 0;
  window.addEventListener('keydown', (e) => {
    const nu = performance.now();
    const snel = nu - vorigeToets < 80;
    vorigeToets = nu;
    if (/^Shift/.test(e.code)) return;
    const cijfer = /^(?:Digit|Numpad)(\d)$/.exec(e.code);
    if (cijfer && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (!snel) scan = [];
      scan.push({ cijfer: cijfer[1], teken: e.key });
      return;
    }
    const reeks = scan;
    scan = [];
    const enter = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter';
    if (!enter || !snel || reeks.length < 5) return;
    if ($('#app').hidden || $('#formulier').open || $('#prijslijst').open || $('#indeling').open || $('#kassa-open').open) return;
    e.preventDefault();
    e.stopPropagation();
    // De cijfers zijn ook in een invulveld beland: daar weer weghalen.
    const veld = document.activeElement;
    const getypt = reeks.map((x) => x.teken).join('');
    if (veld && typeof veld.value === 'string' && veld.value.endsWith(getypt)) {
      veld.value = veld.value.slice(0, -getypt.length);
      if (veld === $('#zoek')) toon();
    }
    gescand(reeks.map((x) => x.cijfer).join(''));
  }, true);

  async function gescand(code) {
    $$('dialog[open]').forEach((d) => { if (d.id !== 'kassa-open') d.close(); });
    if (code === scanCode(TEST_NR)) { toast('De scanner werkt ✓'); return; }
    // Een bon (klantenbon) of een ticket: het bonnummer met 2 cijfers voor het ticket erachter.
    const zoek = () => {
      const bonnen = staat.bonnen || [];
      const bon = bonnen.find((b) => scanCode(b.nr) === code);
      if (bon) return { b: bon, ticket: -1 };
      const ticket = Number(code.slice(-2)) - 1;
      const b = bonnen.find((x) => ticketsVan(x).length > ticket && ticket >= 0 && ticketCode(x, ticket) === code);
      return b ? { b, ticket } : {};
    };
    let { b, ticket } = zoek();
    if (!b && !DESKTOP) { await laad(true); ({ b, ticket } = zoek()); }
    if (!b) { toast(`Bon ${code} niet gevonden. Misschien al gewist?`); return; }
    if (ticket >= 0 && b.status !== 'opgehaald') {
      if (!gescandeTickets.has(b.id)) gescandeTickets.set(b.id, new Set());
      gescandeTickets.get(b.id).add(ticket);
      bewaarGescand();
    }
    const missen = nietGescand(b);
    const n = ticketsVan(b).length;
    const tickets = !n ? ''
      : ticket >= 0 ? `Ticket ${ticket + 1} van ${n} gescand ✓ ` + (missen.length ? `Nog scannen: ${missen.map(ticketNaam).join(', ')}.` : 'Alle tickets gescand. ')
      : missen.length ? `Haal ${missen.length === n ? `de ${n} ticket${n > 1 ? 's' : ''}` : `nog ${missen.length} ticket${missen.length > 1 ? 's' : ''}`} op en scan ze: ${missen.map(ticketNaam).join(', ')}. ` : 'Alle tickets gescand. ';
    const betalen = b.prijsOpen ? 'Er staan nog stukken zonder prijs: vul die eerst in via Wijzigen.'
      : b.betaald ? 'Al betaald: tik op Opgehaald.'
      : `Te betalen: ${eur(b.totaal)}. Kies hoe de klant betaalt${autoPrint ? '; daarna komt de afhaalbon uit de printer' : ''}.`;
    const boodschap = b.status === 'opgehaald' ? `Deze bon is al opgehaald (${mooiDatum(b.opgehaaldOp, true)}).`
      : tickets ? tickets + (missen.length ? '' : betalen)
      : 'Gescand. ' + betalen;
    openDetail(b.id, null, boodschap);
  }

  // ---------- Afdrukken ----------
  // Afgiftebon: bij het binnenbrengen, wat er binnenkwam, zonder prijzen, met een label voor de mand.
  // Afhaalbon: bij het ophalen, alle stukken met prijs, totaal en betaling.
  // Klein: voor de bonprinter (72 mm, zwart-wit). A4: een volle pagina, met onderaan onze prijslijst.
  const WEBSITE = 'crystal-services.be';
  const kaleNaam = (s) => s.naam.replace(/ \((strijken|wassen[^)]*)\)$/, '');
  const BETAALWIJZE = { cash: 'cash', kaart: 'kaart', dienstencheques: 'dienstencheques', overschrijving: 'overschrijving' };
  const betaaldTekst = (b) => 'Betaald' + (b.betaalwijze ? ' met ' + esc(BETAALWIJZE[b.betaalwijze] || b.betaalwijze) : '');

  /** Wat binnenkwam, per soort. Strijk of was zonder stukken: de mand wordt later geteld. */
  function blokkenVan(b) {
    const gekozen = b.soorten || [b.soort];
    const blokken = ['Strijk', 'Was', 'Droogkuis'].filter((x) => gekozen.includes(x))
      .map((soort) => [soort, b.stukken.filter((s) => s.behandeling === soort.toLowerCase())]);
    const overig = b.stukken.filter((s) => !['strijk', 'was', 'droogkuis'].includes(s.behandeling));
    const andere = gekozen.filter((x) => !['Strijk', 'Was', 'Droogkuis'].includes(x));
    if (overig.length || andere.length) blokken.push([andere.join(', ') || 'Overige', overig]);
    return blokken;
  }
  const mandTekst = (titel) => (titel === 'Strijk' ? 'Strijkmand: de stukken worden geteld bij het strijken'
    : titel === 'Was' ? 'Was: de stukken worden geteld bij het wassen' : 'De stukken worden nog geteld');

  // Welke bonnen komen uit de printer:
  // afgifte = klantenbon + mandticket, klant = enkel de klantenbon, mand = enkel het mandticket, afhaal = afhaalbon.
  // Het mandticket gaat altijd naar de bonprinter (klein formaat), ook als de klant een A4 krijgt.
  function drukAf(b, soortBon = 'afgifte', formaat = 'klein') {
    // Klanten met vlekkencontrole krijgen altijd hun aparte A4-bon.
    const rapport = vlekkenKlant(b.klant);
    const a4 = rapport || formaat === 'a4';
    const klantBon = (afhaal) => (rapport ? vlekkenA4(b, afhaal) : a4 ? bonA4(b, afhaal) : bonKlein(b, afhaal));
    const delen = [];
    if (soortBon === 'afhaal') delen.push({ html: klantBon(true), a4, soort: 'afhaal' });
    if (soortBon === 'afgifte' || soortBon === 'klant') delen.push({ html: klantBon(false), a4, soort: 'klant' });
    if (soortBon === 'afgifte' || soortBon === 'mand') {
      const n = Math.max(1, ticketsVan(b).length);
      for (let i = 0; i < n; i++) delen.push({ html: mandTicket(b, ticketsVan(b).length ? i : -1), a4: false, soort: 'ticket' });
    }
    drukDelen(delen);
  }

  /**
   * In het Windows-programma: elk deel apart naar de printer, zodat de bonprinter ertussen snijdt.
   * In de browser: alles in één keer, met een nieuwe pagina per deel.
   */
  async function drukDelen(delen) {
    if (DESKTOP) {
      for (const d of delen) {
        $('#afdruk').innerHTML = d.html;
        $('#afdruk').className = d.a4 ? 'a4' : '';
        await logoGeladen();
        // Een A4 gaat naar de printer voor grote bonnen, ook als het een klantenbon is.
        await afdrukken(d.a4 ? 'a4' : 'klein', d.a4 ? 'a4' : d.soort);
      }
      return;
    }
    const a4 = delen.some((d) => d.a4);
    $('#afdruk').innerHTML = delen.map((d, i) => `<div class="pr-deel${i ? ' pr-nieuwe-pagina' : ''}">${d.html}</div>`).join('');
    $('#afdruk').className = a4 ? 'a4' : '';
    await logoGeladen();
    afdrukken(a4 ? 'a4' : 'klein');
  }

  // ---------- Indeling van de winkel ----------
  // Op het mandticket staan de stukken per plaats in de winkel, zodat je weet wat waar moet.
  // Een stuk komt bij de eerste plaats waarvan een woord in de naam staat; de volgorde telt dus.
  const STANDAARD_INDELING = [
    { plaats: 'Kast lingerie & ondergoed', woorden: ['lingerie', 'bh', 'slip', 'string', 'onderbroek', 'ondergoed', 'boxer', 'body', 'sokken', 'kousen', 'panty', 'nachtkleed', 'pyjama', 'nachtkleding'] },
    { plaats: 'Kast bedlinnen & handdoeken', woorden: ['laken', 'dekbed', 'kussen', 'sloop', 'tafelkleed', 'servet', 'theenap', 'handdoek', 'vaatdoek', 'washandje', 'badmat', 'donsdeken', 'deken', 'gordijn', 'zakdoek'] },
    { plaats: 'Rek hemden & bloezen', woorden: ['hemd', 'bloes', 'polo', 'koksvest'] },
    { plaats: 'Rek broeken', woorden: ['broek', 'bermuda', 'jogging', 'short'] },
    { plaats: 'Rek kleedjes & rokken', woorden: ['kleed', 'rok', 'bolero'] },
    { plaats: 'Rek jassen & kostuums', woorden: ['mantel', 'jas', 'colbert', 'kostuum', 'anorak', 'overall', 'vest', 'pak'] },
    { plaats: 'Plank truien & T-shirts', woorden: ['trui', 'sweater', 'golf', 't-shirt', 'topje', 'sjaal'] },
    { plaats: 'Schoenen', woorden: ['schoen', 'sneaker', 'laars', 'handschoen'] },
  ];
  const indeling = () => (Array.isArray(staat.instellingen?.indeling) ? staat.instellingen.indeling : STANDAARD_INDELING);
  const ANDERE_PLAATS = 'Andere stukken';
  function plaatsVan(naam) {
    const n = zoekVorm(naam);
    const r = indeling().find((x) => (x.woorden || []).some((w) => w && n.includes(zoekVorm(w))));
    return r ? r.plaats : ANDERE_PLAATS;
  }

  function bonKlein(b, afhaal) {
    const aantal = b.stukken.reduce((n, s) => n + s.aantal, 0);
    const uren = esc(WINKEL.uren[0].toUpperCase() + WINKEL.uren.slice(1));
    if (!afhaal) {
      // Kort: wat de klant nodig heeft om terug te komen.
      const code = scanCode(b.nr);
      const lijst = blokkenVan(b).map(([titel, stukken]) => `<tr><th>${esc(titel)}</th><td>${stukken.length
        ? splitsVlekken(stukken).map((s) => `<b>${s.aantal}×</b> ${esc(kaleNaam(s))}${s.vlek ? ' <span class="pr-vlek">⚠ met vlek</span>' : ''}`).join(', ')
        : (titel === 'Strijk' ? 'strijkmand, wordt nog geteld' : titel === 'Was' ? 'was, wordt nog geteld' : 'wordt nog geteld')}</td></tr>`).join('');
      return `<section class="pr-bon pr-kort">
        <header class="pr-kop-kort">
          <img src="/apple-touch-icon.png" alt="">
          <div><div class="pr-merk">${esc(WINKEL.naam)}</div><div class="pr-adres">Tel. ${esc(WINKEL.telefoon)} · ${WEBSITE}</div></div>
        </header>
        <div class="pr-nr"><span>Afgiftebon</span>${esc(b.nr)}</div>
        ${code ? streepjescode(code) : ''}
        <table class="pr-info">
          <tr><th>Klant</th><td><b>${esc(b.klant.naam)}</b></td></tr>
          ${b.vliegtuig ? `<tr><th>Vliegtuig</th><td><b>${esc(b.vliegtuig)}</b></td></tr>` : ''}
          <tr><th>Binnen</th><td>${esc(mooiDatum(b.binnenOp, true))}</td></tr>
          <tr class="pr-klaar-rij"><th>Klaar</th><td><b>${b.klaarTegen ? esc(mooiDatum(b.klaarTegen)) : 'wij laten het u weten'}</b></td></tr>
          ${lijst}
        </table>
        <div class="pr-betaling">${b.betaald ? betaaldTekst(b) : 'U betaalt bij het ophalen'}</div>
        ${heeftToegang(b) ? `<div class="pr-portaal">Volg uw bonnen online: <b>${esc(PORTAAL.replace(/^https?:\/\//, ''))}</b></div>` : ''}
        <footer class="pr-voet">Breng deze bon mee bij het ophalen.<br>${uren} · ${esc(WINKEL.adres)}</footer>
      </section>`;
    }

    const rijen = groepen(splitsVlekken(b.stukken)).map(([beh, lijst]) =>
      `<tr class="pr-groep"><td colspan="2">${BEHANDELING[beh]}</td></tr>` +
      lijst.map((s) => `<tr><td>${s.aantal} × ${esc(kaleNaam(s))}${s.aantal > 1 && s.prijs != null ? `<div class="pr-stukprijs">${eur(s.prijs)} per stuk</div>` : ''}${s.vlek ? '<div class="pr-vlek">⚠ met vlek</div>' : ''}</td><td class="r">${s.prijs == null ? 'volgt' : eur(s.aantal * s.prijs)}</td></tr>`).join('')
    ).join('');
    return `<section class="pr-bon">
        <header class="pr-kop">
          <img src="/apple-touch-icon.png" alt="">
          <div class="pr-merk">${esc(WINKEL.naam)}</div>
          <div class="pr-slogan">Strijkatelier · Wasserij · Droogkuis</div>
          <div class="pr-adres">${esc(WINKEL.adres)}<br>Tel. ${esc(WINKEL.telefoon)} · ${WEBSITE}</div>
        </header>
        <div class="pr-titel"><span>Afhaalbon</span></div>
        <div class="pr-nr"><span>Bonnummer</span>${esc(b.nr)}</div>
        <table class="pr-info">
          <tr><th>Klant</th><td><b>${esc(b.klant.naam)}</b></td></tr>
          ${b.vliegtuig ? `<tr><th>Vliegtuig</th><td><b>${esc(b.vliegtuig)}</b></td></tr>` : ''}
          <tr><th>Binnen</th><td>${esc(mooiDatum(b.binnenOp))}</td></tr>
          <tr><th>Opgehaald</th><td>${esc(mooiDatum(b.opgehaaldOp || new Date().toISOString(), true))}</td></tr>
        </table>
        ${b.stukken.length ? `<table class="pr-stukken"><tbody>${rijen}</tbody></table>` : ''}
        <div class="pr-totaal"><span>Totaal${aantal ? ` · ${aantal} stuk${aantal > 1 ? 's' : ''}` : ''}</span><b>${eur(b.totaal)}</b></div>
        <div class="pr-betaling">${b.betaald ? betaaldTekst(b) : `Te betalen: <b>${eur(b.totaal)}</b>`}</div>
        ${b.factuur ? '<div class="pr-portaal">U krijgt een factuur voor deze bon.</div>' : ''}
        <footer class="pr-voet"><b>Bedankt voor uw vertrouwen!</b><br>${uren}<br>${WEBSITE}</footer>
      </section>`;
  }

  /** Het mandticket blijft in de winkel: op de mand plakken en de stukken per plaats indelen. */
  // Met tickets: één per zak, mand of hanger, elk met zijn eigen locatie en code; de indeling staat op het eerste.
  function mandTicket(b, nr = -1) {
    const aantal = b.stukken.reduce((n, s) => n + s.aantal, 0);
    const tickets = ticketsVan(b);
    const code = nr >= 0 ? ticketCode(b, nr) : scanCode(b.nr);
    const locatie = nr >= 0 ? tickets[nr].locatie : b.locatie;
    const perPlaats = new Map([...indeling().map((r) => [r.plaats, []]), [ANDERE_PLAATS, []]]);
    splitsVlekken(b.stukken).forEach((s) => perPlaats.get(plaatsVan(kaleNaam(s)))?.push(s));
    const plaatsen = [...perPlaats].filter(([, l]) => l.length).map(([plaats, lijst]) => `
        <div class="pr-plaats">
          <div class="pr-plaats-kop">${esc(plaats)}<span>${lijst.reduce((n, s) => n + s.aantal, 0)} st.</span></div>
          ${lijst.map((s) => `<div class="pr-plaats-rij"><i></i><b>${s.aantal}×</b><span>${esc(kaleNaam(s))}${s.vlek ? '<em class="pr-vlek">⚠ met vlek</em>' : ''}</span><small>${esc((BEHANDELING[s.behandeling] || '').toLowerCase())}</small></div>`).join('')}
        </div>`).join('');
    // Strijk of was zonder getelde stukken: dat moet nog geteld en ingedeeld worden.
    const teTellen = blokkenVan(b).filter(([, l]) => !l.length).map(([titel]) => `<div class="pr-plaats-rij"><i></i><span>${esc(mandTekst(titel))}</span></div>`).join('');
    return `<section class="pr-ticket">
        <div class="pr-ticket-kop"><span>${nr >= 0 ? `Ticket ${nr + 1} van ${tickets.length}` : 'Mandticket'}</span><span>${esc(b.soort)}</span></div>
        <div class="pr-ticket-nr">${esc(b.nr)}</div>
        <div class="pr-label-naam">${esc(b.klant.naam)}</div>
        <div class="pr-ticket-info">${b.klant.telefoon ? esc(b.klant.telefoon) + ' · ' : ''}klaar <b>${b.klaarTegen ? esc(mooiDatum(b.klaarTegen)) : '?'}</b>${aantal ? ` · ${aantal} st.` : ''}${b.betaald ? ' · betaald' : ''}</div>
        ${b.vliegtuig ? `<div class="pr-label-loc">✈ Vliegtuig: ${esc(b.vliegtuig)}</div>` : ''}
        ${locatie ? `<div class="pr-label-loc">Locatie: ${esc(locatie)}</div>` : ''}
        ${b.opmerking && nr <= 0 ? `<div class="pr-ticket-opm">${esc(b.opmerking)}</div>` : ''}
        ${(plaatsen || teTellen) && nr <= 0 ? `<div class="pr-ticket-titel">Indeling</div>${plaatsen}${teTellen ? `<div class="pr-plaats">${teTellen}</div>` : ''}` : ''}
        ${code ? streepjescode(code, 0.4) : ''}
      </section>`;
  }

  function bonA4(b, afhaal) {
    const aantal = b.stukken.reduce((n, s) => n + s.aantal, 0);
    const code = scanCode(b.nr);
    const k = b.klant || {};
    const kop = `${a4Kop()}
      <div class="a4-titelrij">
        <div>
          <div class="a4-soort">${afhaal ? 'Afhaalbon' : 'Afgiftebon'}</div>
          <div class="a4-nr">Bon ${esc(b.nr)}</div>
        </div>
        ${!afhaal && code ? `<div class="a4-code">${streepjescode(code, 0.45)}</div>` : ''}
      </div>
      <div class="a4-vakken">
        <div class="a4-vak"><h4>Klant</h4><b>${esc(k.naam)}</b>${k.telefoon ? '<br>' + esc(k.telefoon) : ''}${k.email ? '<br>' + esc(k.email) : ''}</div>
        ${b.vliegtuig ? `<div class="a4-vak a4-accent"><h4>Vliegtuig</h4><b>${esc(b.vliegtuig)}</b></div>` : ''}
        <div class="a4-vak"><h4>Binnengebracht</h4>${esc(mooiDatum(b.binnenOp, true))}</div>
        ${afhaal
          ? `<div class="a4-vak"><h4>Opgehaald</h4>${esc(mooiDatum(b.opgehaaldOp || new Date().toISOString(), true))}</div>`
          : `<div class="a4-vak a4-accent"><h4>Klaar vanaf</h4><b>${b.klaarTegen ? esc(mooiDatum(b.klaarTegen)) : 'Wij laten het u weten'}</b></div>`}
      </div>`;

    let tabel;
    if (!afhaal) {
      const rijen = blokkenVan(b).map(([titel, stukken]) => `
        <tr class="a4-groep"><td colspan="2">${esc(titel)}</td></tr>
        ${stukken.length
          ? splitsVlekken(stukken).map((s) => `<tr><td class="a4-n">${s.aantal}</td><td>${esc(kaleNaam(s))}${s.vlek ? ' <span class="a4-vlek">⚠ met vlek</span>' : ''}</td></tr>`).join('')
          : `<tr><td class="a4-n"></td><td class="a4-zacht">${mandTekst(titel)}</td></tr>`}`).join('');
      tabel = `<table class="a4-tabel">
        <thead><tr><th class="a4-n">Aantal</th><th>Wat u binnenbracht</th></tr></thead>
        <tbody>${rijen}</tbody>
        ${aantal ? `<tfoot><tr><td class="a4-n">${aantal}</td><td>stuk${aantal > 1 ? 's' : ''} in totaal</td></tr></tfoot>` : ''}
      </table>`;
    } else {
      const rijen = groepen(splitsVlekken(b.stukken)).map(([beh, lijst]) =>
        `<tr class="a4-groep"><td colspan="4">${BEHANDELING[beh]}</td></tr>` +
        lijst.map((s) => `<tr><td class="a4-n">${s.aantal}</td><td>${esc(kaleNaam(s))}${s.vlek ? ' <span class="a4-vlek">⚠ met vlek</span>' : ''}</td><td class="r">${s.prijs == null ? '' : eur(s.prijs)}</td><td class="r">${s.prijs == null ? 'volgt' : eur(s.aantal * s.prijs)}</td></tr>`).join('')
      ).join('');
      tabel = `<table class="a4-tabel">
        <thead><tr><th class="a4-n">Aantal</th><th>Omschrijving</th><th class="r">Per stuk</th><th class="r">Bedrag</th></tr></thead>
        <tbody>${rijen}</tbody>
      </table>
      <div class="a4-totaal"><span>Totaal${aantal ? ` · ${aantal} stuk${aantal > 1 ? 's' : ''}` : ''}</span><b>${eur(b.totaal)}</b></div>`;
    }

    const betaling = b.betaald ? `<span class="a4-betaald">✓ ${betaaldTekst(b)}</span>`
      : afhaal ? `Te betalen: <b>${eur(b.totaal)}</b>` : 'U betaalt bij het ophalen.';
    const slot = `
      <div class="a4-onder">
        <div class="a4-betaling">${betaling}${b.factuur ? '<br><small>U krijgt een factuur voor deze bon.</small>' : ''}${afhaal ? '' : '<br><small>Breng deze bon mee bij het ophalen. Bedankt en tot binnenkort!</small>'}</div>
        ${b.opmerking ? `<div class="a4-opm"><h4>Opmerking</h4>${esc(b.opmerking)}</div>` : ''}
      </div>
      ${!afhaal && heeftToegang(b) ? `<p class="a4-portaal">Volg uw bonnen online: <b>${esc(PORTAAL.replace(/^https?:\/\//, ''))}</b></p>` : ''}
      ${afhaal ? '<p class="a4-dank">Bedankt voor uw vertrouwen!</p>' : ''}`;

    return `<section class="a4-blad">${kop}${tabel}${slot}</section>`;
  }

  const a4Kop = () => `
      <header class="a4-kop">
        <div class="a4-merk">
          <img src="/apple-touch-icon.png" alt="">
          <div><div class="a4-naam">${esc(WINKEL.naam)}</div><div class="a4-slogan">Strijkatelier · Wasserij · Droogkuis</div></div>
        </div>
        <div class="a4-zaak">${esc(WINKEL.adres)}<br>Tel. ${esc(WINKEL.telefoon)} · ${WEBSITE}<br>Open ${esc(WINKEL.uren)}</div>
      </header>`;

  /**
   * Aparte A4-bon met vlekkencontrole, voor klanten die dat vragen (bv. een bedrijf):
   * bovenaan meteen of er vlekken zijn, daarna per stuk vlek ja/nee.
   */
  function vlekkenA4(b, afhaal) {
    const aantal = b.stukken.reduce((n, s) => n + s.aantal, 0);
    const code = scanCode(b.nr);
    const k = { ...(Object.values(staat.klantenboek || {}).find((x) => x.sleutel === klantSleutel(b.klant)) || {}), ...b.klant };
    const nVlek = b.stukken.reduce((n, s) => n + vlekAantalVan(s), 0);
    const teTellen = blokkenVan(b).filter(([, l]) => !l.length);
    const status = nVlek
      ? `<div class="vr-status vr-ja"><b>⚠ Vlekken vastgesteld</b><span>${nVlek} van de ${aantal} stuk${aantal === 1 ? '' : 's'} met een vlek · zie de rood gemarkeerde regels hieronder</span></div>`
      : b.stukken.length
        ? '<div class="vr-status vr-nee"><b>✓ Geen vlekken vastgesteld</b><span>Alle stukken zijn bij het binnenbrengen nagekeken</span></div>'
        : '<div class="vr-status"><b>Stukken nog niet geteld</b><span>De vlekkencontrole volgt bij het tellen</span></div>';
    const kolommen = afhaal ? 5 : 3;
    const rijen = groepen(splitsVlekken(b.stukken)).map(([beh, lijst]) =>
      `<tr class="a4-groep"><td colspan="${kolommen}">${BEHANDELING[beh]}</td></tr>` +
      lijst.map((s) => `<tr class="${s.vlek ? 'vr-rij-vlek' : ''}">
        <td class="a4-n">${s.aantal}</td>
        <td>${esc(kaleNaam(s))}</td>
        <td class="vr-jn">${s.vlek ? '<b>JA</b>' : 'nee'}</td>
        ${afhaal ? `<td class="r">${s.prijs == null ? '' : eur(s.prijs)}</td><td class="r">${s.prijs == null ? 'volgt' : eur(s.aantal * s.prijs)}</td>` : ''}
      </tr>`).join('')
    ).join('') + teTellen.map(([titel]) => `<tr><td class="a4-n"></td><td colspan="${kolommen - 1}" class="a4-zacht">${esc(mandTekst(titel))}</td></tr>`).join('');

    return `<section class="a4-blad vr">
      ${a4Kop()}
      <div class="a4-titelrij">
        <div>
          <div class="a4-soort">${afhaal ? 'Afhaalbon' : 'Afgiftebon'} · vlekkencontrole</div>
          <div class="a4-nr">Bon ${esc(b.nr)}</div>
        </div>
        ${!afhaal && code ? `<div class="a4-code">${streepjescode(code, 0.45)}</div>` : ''}
      </div>
      <div class="a4-vakken">
        <div class="a4-vak"><h4>Klant</h4><b>${esc(k.naam)}</b>${k.adres ? '<br>' + esc(k.adres) : ''}${k.btw ? '<br>' + esc(k.btw) : ''}</div>
        ${b.vliegtuig ? `<div class="a4-vak a4-accent"><h4>Vliegtuig</h4><b>${esc(b.vliegtuig)}</b></div>` : ''}
        <div class="a4-vak"><h4>Binnengebracht</h4>${esc(mooiDatum(b.binnenOp, true))}</div>
        ${afhaal
          ? `<div class="a4-vak"><h4>Opgehaald</h4>${esc(mooiDatum(b.opgehaaldOp || new Date().toISOString(), true))}</div>`
          : `<div class="a4-vak a4-accent"><h4>Klaar vanaf</h4><b>${b.klaarTegen ? esc(mooiDatum(b.klaarTegen)) : 'Wij laten het u weten'}</b></div>`}
      </div>
      ${status}
      <table class="a4-tabel vr-tabel">
        <thead><tr><th class="a4-n">Aantal</th><th>Stuk</th><th>Vlek</th>${afhaal ? '<th class="r">Per stuk</th><th class="r">Bedrag</th>' : ''}</tr></thead>
        <tbody>${rijen}</tbody>
        <tfoot><tr><td class="a4-n">${aantal}</td><td>stuk${aantal === 1 ? '' : 's'} in totaal</td><td class="vr-jn">${nVlek ? `<b>${nVlek}</b> met vlek` : 'geen'}</td>${afhaal ? `<td></td><td class="r">${eur(b.totaal)}</td>` : ''}</tr></tfoot>
      </table>
      ${b.opmerking ? `<div class="a4-opm vr-opm"><h4>Opmerking</h4>${esc(b.opmerking)}</div>` : ''}
      ${afhaal ? `<div class="a4-onder"><div class="a4-betaling">${b.betaald ? `<span class="a4-betaald">✓ ${betaaldTekst(b)}</span>` : `Te betalen: <b>${eur(b.totaal)}</b>`}${b.factuur ? '<br><small>U krijgt een factuur voor deze bon.</small>' : ''}</div></div>` : ''}
    </section>`;
  }

  // Wachten tot het logo geladen is, anders ontbreekt het soms op papier.
  function logoGeladen() {
    const logo = $('#afdruk img');
    if (!logo || logo.complete) return Promise.resolve();
    return new Promise((klaar) => { logo.onload = logo.onerror = () => klaar(); });
  }

  const standaardFormaat = () => (staat.instellingen?.formaat === 'a4' ? 'a4' : 'klein');

  function afdrukken(formaat = 'klein', soort = '') {
    // Paginaformaat: A4 of een smalle rol voor de bonprinter. De marge zit in #afdruk (zie app.css).
    $('#pagina-stijl').textContent = formaat.startsWith('a4') ? '@media print{@page{size:A4 portrait;margin:0}}' : '@media print{@page{margin:0}}';
    if (!DESKTOP) return Promise.resolve(window.print());
    return window.crystal.afdrukken(formaat, soort).then((r) => {
      if (r && !r.ok && !/cancel/i.test(r.fout || '')) {
        alert('Afdrukken lukte niet' + (r.fout ? ' (' + r.fout + ')' : '') + '. Kies de printer via ⚙ Instellingen.');
      }
    });
  }

  /** Een voorbeeldbon om de printer en de scanner te testen; hij wordt nergens bewaard. */
  function testBon() {
    const nu = new Date().toISOString();
    return {
      id: 'test', nr: TEST_NR, klant: { naam: 'Testbon', telefoon: '', email: '' },
      soorten: ['Strijk', 'Droogkuis'], soort: 'Strijk + Droogkuis',
      stukken: [
        { naam: 'Hemd (strijken)', aantal: 2, prijs: 2.3, behandeling: 'strijk' },
        { naam: 'Mantel', aantal: 1, prijs: null, behandeling: 'droogkuis' },
      ],
      totaal: 4.6, prijsOpen: true, locatie: 'Rek 1',
      opmerking: 'Dit is een testafdruk. Scan de streepjescode om de scanner te proberen.',
      klaarTegen: vandaagIso(), betaald: false, betaalwijze: '',
      status: 'binnen', binnenOp: nu, klaarOp: '', opgehaaldOp: '', verwittigdOp: '',
    };
  }

  // ---------- Prijslijst ----------
  // De standaardprijzen komen uit prijzen.js. Past de winkel ze aan (⚙ Instellingen),
  // dan worden ze samen met de bonnen bewaard en gelden ze voor nieuwe bonnen.
  const STANDAARD_PRIJSLIJST = { versie: 2, groepen: window.PRIJSLIJST || [], droogkuis: DROOGKUIS };
  // Een eigen lijst van vóór de nieuwe prijslijsten (zonder versie) telt niet meer.
  const prijslijst = () => (staat.prijslijst?.versie >= 2 ? staat.prijslijst : STANDAARD_PRIJSLIJST);

  let artikelBron = null;
  let artikelLijst = [];
  /** Alle gekende stukken, plat: één regel per behandeling met de prijs. */
  /** De actie die vandaag loopt (bv. oktoberactie op strijken), of niets. */
  const actieVandaag = () => (window.ACTIES || []).find((a) => a.van <= vandaagIso() && vandaagIso() <= a.tot) || null;
  let artikelDag = '';
  /** De strijkprijs met de korting van een actie, afgerond op 5 cent. */
  const actiePrijs = (actie, prijs) => (actie?.korting ? Math.round(prijs * (100 - actie.korting) / 5) * 5 / 100 : prijs);
  function artikelen() {
    const p = prijslijst();
    if (artikelBron === p && artikelDag === vandaagIso()) return artikelLijst;
    const actie = actieVandaag();
    const lijst = [];
    for (const g of p.groepen || []) {
      for (const s of g.stukken) {
        const groep = g.titel;
        if (s.prijs != null) lijst.push({ groep, naam: s.naam, kort: s.naam, soort: '', prijs: s.prijs, behandeling: 'ander' });
        if (s.strijken != null) lijst.push({ groep, naam: `${s.naam} (strijken)`, kort: s.naam, soort: 'strijken', prijs: actiePrijs(actie, s.strijken), behandeling: 'strijk' });
        if (s.wassen != null) lijst.push({ groep, naam: `${s.naam} (${g.wassenLabel || 'wassen'})`, kort: s.naam, soort: g.wassenLabel || 'wassen', prijs: s.wassen, behandeling: 'was' });
        if (s.prijs == null && s.strijken == null && s.wassen == null) lijst.push({ groep, naam: s.naam, kort: s.naam, soort: '', prijs: null, behandeling: 'ander' });
      }
    }
    for (const d of (p.droogkuis || []).map(droogStuk)) {
      const prijzen = DROOG_KOL.filter(([k]) => d[k] != null);
      if (!prijzen.length) lijst.push({ groep: 'Droogkuis', naam: d.naam, kort: d.naam, soort: 'droogkuis', prijs: null, behandeling: 'droogkuis' });
      for (const [k, label] of prijzen) {
        const soort = k === 'luxe' ? 'droogkuis' : 'droogkuis ' + label.toLowerCase();
        lijst.push({ groep: 'Droogkuis', naam: `${d.naam} (${soort})`, kort: d.naam, soort, prijs: d[k], behandeling: 'droogkuis' });
      }
    }
    for (const a of lijst) a.zoek = zoekVorm(a.kort + ' ' + a.soort);
    artikelBron = p;
    artikelDag = vandaagIso();
    artikelLijst = lijst;
    return lijst;
  }
  const artikelSleutel = (a) => a.behandeling + '|' + a.naam;

  // Snelknoppen: wat de winkel het vaakst gebruikt, aangevuld met de klassiekers.
  const KLASSIEKERS = ['strijk|Hemd (strijken)', 'strijk|Broek (strijken)', 'strijk|T-shirt/topje (strijken)', 'strijk|Bloes (strijken)',
    'strijk|Trui (strijken)', 'strijk|Kleed (strijken)', 'was|Hemd (wassen + strijken)', 'droogkuis|Mantel (droogkuis)', 'droogkuis|Kostuum 2 stuks (droogkuis)', 'droogkuis|Kleed (droogkuis)'];
  function veelgebruikt() {
    const tel = new Map();
    for (const b of (staat.bonnen || []).slice(-300)) {
      for (const s of b.stukken) tel.set(s.behandeling + '|' + s.naam, (tel.get(s.behandeling + '|' + s.naam) || 0) + s.aantal);
    }
    const sleutels = [...[...tel.entries()].sort((a, b) => b[1] - a[1]).map(([k]) => k), ...KLASSIEKERS];
    const per = new Map(artikelen().map((a) => [artikelSleutel(a), a]));
    return [...new Set(sleutels)].map((k) => per.get(k)).filter(Boolean).slice(0, 10);
  }

  // ---------- Formulier: stukken ----------
  const tegel = (a) => `<button type="button" class="tegel" data-artikel="${esc(artikelSleutel(a))}">
      <span>${esc(a.kort)}</span><small>${esc(a.soort || 'per stuk')} · ${a.prijs == null ? 'prijs volgt' : (a.behandeling === 'droogkuis' ? 'vanaf ' : '') + eur(a.prijs)}</small></button>`;

  function treffers(q) {
    const woorden = zoekVorm(q).split(/\s+/).filter(Boolean);
    return artikelen()
      .filter((a) => woorden.every((w) => a.zoek.includes(w)))
      .sort((a, b) => b.zoek.startsWith(woorden[0]) - a.zoek.startsWith(woorden[0]))
      .slice(0, 12);
  }

  let open = '';
  function toonSuggesties() {
    const tekst = $('#f-stuk').value.trim();
    if (!tekst) {
      const snel = veelgebruikt();
      const actie = actieVandaag();
      // Zonder typen: kies een groep en tik het stuk aan.
      const groepNamen = [...new Set(artikelen().map((a) => a.groep))];
      const gekozen = groepNamen.includes(open) ? open : '';
      $('#f-suggesties').innerHTML = (actie ? `<p class="actie-melding">🏷 ${esc(actie.naam)} · t.e.m. ${esc(new Date(actie.tot + 'T12:00').toLocaleDateString('nl-BE', { day: 'numeric', month: 'long' }))}</p>` : '')
        + `<div class="groep-keuze">${['', ...groepNamen].map((g) => `<button type="button" data-groep="${esc(g)}" aria-pressed="${g === gekozen}">${esc(g || 'Veelgebruikt')}</button>`).join('')}</div>`
        + (gekozen
          ? `<div class="tegels">${artikelen().filter((a) => a.groep === gekozen).map(tegel).join('')}</div>`
          : snel.length ? `<div class="sug-titel">Veelgebruikt: tik om toe te voegen</div><div class="tegels">${snel.map(tegel).join('')}</div>` : '');
      return;
    }
    const gevonden = treffers(tekst);
    $('#f-suggesties').innerHTML =
      (gevonden.length ? `<div class="tegels">${gevonden.map(tegel).join('')}</div>` : '<p class="tijdlijn">Niet in de prijslijst.</p>') +
      `<div class="sug-titel">"${esc(tekst)}" toevoegen als</div>
       <div class="tegels nieuw">${VOLGORDE.map((beh) => `<button type="button" class="tegel" data-nieuw="${beh}"><span>${BEHANDELING[beh]}</span><small>${beh === 'droogkuis' ? 'prijs volgt' : 'prijs zelf invullen'}</small></button>`).join('')}</div>`;
  }
  $('#f-stuk').addEventListener('input', toonSuggesties);
  $('#f-stuk').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    // Enter voegt het eerste gevonden stuk toe, en verstuurt het formulier niet.
    e.preventDefault();
    const tekst = $('#f-stuk').value.trim();
    const eerste = tekst && treffers(tekst)[0];
    if (eerste) { voegToe(eerste.naam, eerste.prijs, eerste.behandeling); $('#f-stuk').value = ''; toonSuggesties(); }
  });
  $('#f-suggesties').addEventListener('click', (e) => {
    const groep = e.target.closest('[data-groep]');
    if (groep) { open = groep.dataset.groep; toonSuggesties(); return; }
    const knop = e.target.closest('[data-artikel], [data-nieuw]');
    if (!knop) return;
    if (knop.dataset.nieuw) {
      nieuweRegel(knop.dataset.nieuw);
    } else {
      const a = artikelen().find((x) => artikelSleutel(x) === knop.dataset.artikel);
      if (a) voegToe(a.naam, a.prijs, a.behandeling);
      $('#f-stuk').value = '';
    }
    toonSuggesties();
  });

  function toonSoorten() {
    $$('#f-soort button').forEach((k) => k.setAttribute('aria-pressed', String(soorten.has(k.dataset.soort))));
  }
  $('#f-soort').addEventListener('click', (e) => {
    const k = e.target.closest('[data-soort]');
    if (!k) return;
    if (soorten.has(k.dataset.soort)) soorten.delete(k.dataset.soort);
    else soorten.add(k.dataset.soort);
    toonSoorten();
  });
  // Een stuk toevoegen zet ook de soort aan (bv. een droogkuisstuk zet "Droogkuis" aan).
  function soortVoor(beh) {
    const soort = { strijk: 'Strijk', was: 'Was', droogkuis: 'Droogkuis' }[beh];
    if (soort && !soorten.has(soort)) { soorten.add(soort); toonSoorten(); }
  }
  $$('[data-dagen]').forEach((k) => k.addEventListener('click', () => {
    $('#f').klaarTegen.value = plusDagen(Number(k.dataset.dagen));
  }));

  const prijsTekst = (v) => (v == null ? '' : typeof v === 'string' ? v : v.toFixed(2).replace('.', ','));
  function toonRegels(net) {
    $('#f-fout').textContent = '';
    $('#f-regels').innerHTML = regels.map((r, i) => `<tr data-i="${i}"${i === net ? ' class="net"' : ''}>
      <td><div class="teller">
        <button type="button" data-stap="-1" aria-label="Eén minder">−</button>
        <input class="aantal" type="number" min="1" inputmode="numeric" value="${r.aantal}" aria-label="Aantal" data-veld="aantal">
        <button type="button" data-stap="1" aria-label="Eén meer">+</button>
      </div></td>
      <td><input value="${esc(r.naam)}" aria-label="Stuk" data-veld="naam" placeholder="Welk stuk?"></td>
      <td><select data-veld="behandeling" aria-label="Behandeling">${VOLGORDE.map((b) => `<option value="${b}"${r.behandeling === b ? ' selected' : ''}>${BEHANDELING[b]}</option>`).join('')}</select></td>
      <td class="bedrag"><span class="prijs-veld">€ <input class="prijs" inputmode="decimal" value="${prijsTekst(r.prijs)}" placeholder="volgt" aria-label="Prijs per stuk" data-veld="prijs"></span></td>
      <td><button type="button" class="weg" aria-label="Verwijderen" data-weg>✕</button></td>
      <td class="vlek-td">${vlekCel(r)}</td>
    </tr>`).join('');
    toonTotaal();
  }
  // Vlek bij een stuk: bij meerdere stukken hoeveel ervan (bv. 3 van 10 servetten).
  function vlekCel(r) {
    if (r.vlek == null) return '<button type="button" class="vlek-knop" data-vlek>⚠ Vlek</button>';
    const n = Math.min(r.aantal, Number(r.vlekAantal) || 1);
    return `<span class="vlek-veld">⚠
      ${r.aantal > 1 ? `<span class="vlek-aantal"><input type="number" min="1" max="${r.aantal}" inputmode="numeric" data-veld="vlekAantal" value="${n}" aria-label="Hoeveel met vlek"> van ${r.aantal}</span>` : ''}
      ${r.aantal > 1 ? 'met vlek' : 'Met vlek'}
      <button type="button" data-vlek-weg aria-label="Geen vlek">✕</button></span>`;
  }
  // Na een ander aantal: het vlekvak opnieuw tonen (bv. "van 10"), zonder de rest te verstoren.
  function toonVlekCel(tr, r) {
    if (r.vlek == null) return;
    if (r.vlekAantal > r.aantal) r.vlekAantal = r.aantal;
    tr.querySelector('.vlek-td').innerHTML = vlekCel(r);
  }
  function toonTotaal() {
    const t = regels.reduce((som, r) => som + (Number(r.aantal) || 0) * (Number(r.prijs) || 0), 0);
    $('#f-totaal').innerHTML = eur(t) + (regels.some((r) => r.prijs == null) ? ' <span class="volgt">+ prijs volgt</span>' : '');
  }
  $('#f-regels').addEventListener('input', (e) => {
    const tr = e.target.closest('tr');
    const r = regels[Number(tr.dataset.i)];
    const veld = e.target.dataset.veld;
    if (veld === 'naam') r.naam = e.target.value;
    if (veld === 'aantal') { r.aantal = Math.max(1, Math.round(Number(e.target.value) || 1)); toonVlekCel(tr, r); }
    if (veld === 'vlekAantal') r.vlekAantal = Math.max(1, Math.min(r.aantal, Math.round(Number(e.target.value) || 1)));
    if (veld === 'prijs') r.prijs = e.target.value.trim() === '' ? null : Number(e.target.value.replace(',', '.')) || 0;
    toonTotaal();
  });
  $('#f-regels').addEventListener('change', (e) => {
    if (e.target.dataset.veld !== 'behandeling') return;
    regels[Number(e.target.closest('tr').dataset.i)].behandeling = e.target.value;
    soortVoor(e.target.value);
  });
  $('#f-regels').addEventListener('click', (e) => {
    const stap = e.target.closest('[data-stap]');
    if (stap) {
      const tr = stap.closest('tr');
      const r = regels[Number(tr.dataset.i)];
      r.aantal = Math.max(1, (Number(r.aantal) || 1) + Number(stap.dataset.stap));
      tr.querySelector('.aantal').value = r.aantal;
      toonVlekCel(tr, r);
      toonTotaal();
      return;
    }
    const vlek = e.target.closest('[data-vlek], [data-vlek-weg]');
    if (vlek) {
      const i = Number(vlek.closest('tr').dataset.i);
      // Enkel dat er een vlek is ("ja"); waar precies hoeft niet.
      if (vlek.hasAttribute('data-vlek')) { regels[i].vlek = 'ja'; regels[i].vlekAantal = 1; }
      else { delete regels[i].vlek; delete regels[i].vlekAantal; }
      toonRegels();
      $(`#f-regels tr[data-i="${i}"] [data-veld="vlekAantal"]`)?.focus();
      return;
    }
    if (!e.target.closest('[data-weg]')) return;
    regels.splice(Number(e.target.closest('tr').dataset.i), 1);
    toonRegels();
  });

  function voegToe(naam, prijs, behandeling) {
    let i = regels.findIndex((r) => r.naam === naam && r.prijs === prijs && r.behandeling === behandeling);
    if (i >= 0) regels[i].aantal += 1;
    else i = regels.push({ naam, prijs, behandeling, aantal: 1 }) - 1;
    soortVoor(behandeling);
    toonRegels(i);
  }
  // Een stuk dat niet in de lijst staat: naam uit het zoekveld, prijs zelf in te vullen.
  function nieuweRegel(behandeling) {
    const naam = $('#f-stuk').value.trim();
    regels.push({ naam, prijs: null, behandeling, aantal: 1 });
    $('#f-stuk').value = '';
    soortVoor(behandeling);
    toonRegels(regels.length - 1);
    const rij = $$('#f-regels tr').pop();
    const veld = !naam ? rij.querySelector('[data-veld="naam"]') : behandeling !== 'droogkuis' ? rij.querySelector('.prijs') : null;
    if (veld) veld.focus();
  }

  function zetAutoPrint(aan) {
    autoPrint = aan;
    $('#f-print').checked = aan;
    $('#i-print').checked = aan;
    try { localStorage.setItem('winkel-autoprint', aan ? 'ja' : 'nee'); } catch (err) {}
  }
  $('#f-print').addEventListener('change', (e) => zetAutoPrint(e.target.checked));

  // ---------- Formulier: klant ----------
  // Bij een nieuwe bon: gekende klanten voorstellen op naam of telefoonnummer.
  function toonKlantSuggesties() {
    const doos = $('#f-klanten');
    const f = $('#f');
    const naam = f.naam.value.trim();
    const tel = f.telefoon.value.trim();
    if (bewerkId || (naam.length < 2 && tel.replace(/\D/g, '').length < 3)) { doos.hidden = true; return; }
    const cijfers = tel.replace(/\D/g, '');
    const intl = telefoonIntl(tel);
    const woorden = zoekVorm(naam).split(/\s+/).filter(Boolean);
    const gevonden = klanten().filter((k) => {
      if (cijfers.length >= 3) {
        const kIntl = telefoonIntl(k.telefoon);
        const kCijfers = k.telefoon.replace(/\D/g, '');
        if (kCijfers.includes(cijfers) || (intl && kIntl === intl) || (kIntl && kIntl.includes(cijfers.replace(/^0/, '')))) return true;
      }
      return woorden.length > 0 && woorden.every((w) => zoekVorm(k.naam).includes(w));
    })
      // Staat de klant er al exact in, dan niets meer voorstellen.
      .filter((k) => !(k.naam === naam && (k.telefoon || '') === tel))
      .sort((a, b) => b.bonnen - a.bonnen)
      .slice(0, 5);
    doos.hidden = !gevonden.length;
    doos.innerHTML = gevonden.length ? `<div class="sug-titel">Gekende klant?</div>` + gevonden.map((k) =>
      `<button type="button" class="klant-knop" data-klant="${esc(k.sleutel)}"><strong>${esc(k.naam)}</strong>
        <span>${esc(k.telefoon || 'geen telefoon')} · ${k.bonnen} bon${k.bonnen === 1 ? '' : 'nen'}${k.open ? ` (${k.open} open)` : ''}</span></button>`).join('') : '';
  }
  function vulKlant(k) {
    const f = $('#f');
    f.naam.value = k.naam;
    f.telefoon.value = k.telefoon || '';
    f.email.value = k.email || '';
    $('#f-klanten').hidden = true;
    toonVlekUitleg();
  }
  const toonVlekUitleg = () => {
    const k = { naam: $('#f').naam.value, telefoon: $('#f').telefoon.value };
    // "Klant bewaren" enkel voor wie nog niet in Klanten staat.
    $('#f-bewaar-klant').hidden = Boolean(staat.klantenboek?.[klantSleutel(k)]) || !k.naam.trim();
    $('#f-vlekken').hidden = !vlekkenKlant(k);
    $('#f-vliegtuig-veld').hidden = !vliegtuigKlant(k) && !$('#f').vliegtuig.value;
  };
  $('#f').naam.addEventListener('input', toonVlekUitleg);
  $('#f').telefoon.addEventListener('input', toonVlekUitleg);
  $('#f').naam.addEventListener('input', toonKlantSuggesties);
  $('#f').telefoon.addEventListener('input', toonKlantSuggesties);
  $('#f-klanten').addEventListener('click', (e) => {
    const knop = e.target.closest('[data-klant]');
    if (!knop) return;
    const k = klanten().find((x) => x.sleutel === knop.dataset.klant);
    if (k) vulKlant(k);
    $('#f-stuk').focus();
  });

  // Tickets in het formulier: hoeveel zakken, manden of hangers, en per ticket de locatie.
  let fTickets = [''];
  let tVeld = 0;
  function toonFormTickets() {
    $('#f-t-aantal').textContent = `${fTickets.length} ticket${fTickets.length > 1 ? 's' : ''}`;
    $('#f-tickets').innerHTML = fTickets.map((l, i) => `<label class="t-rij"><span class="t-nr">${i + 1}</span>
      <input data-ticket="${i}" list="locaties" maxlength="40" value="${esc(l)}" placeholder="Locatie, bv. rek 3, mand 12" autocomplete="off"></label>`).join('');
    // Snelknoppen: alle vaste locaties (anders de laatst gebruikte); één tik vult het ticket in.
    // Een locatie waar nog iets ligt, krijgt een bolletje met het aantal tickets.
    const vast = vasteLocaties();
    const opties = vast.length ? vast : $$('#locaties option').map((o) => o.value).slice(0, 12);
    const bezet = bezetteLocaties();
    $('#f-loc-snel').innerHTML = opties.map((l) => {
      const n = bezet.get(zoekVorm(l)) || 0;
      return `<button type="button" data-loc="${esc(l)}"${n ? ` class="bezet" title="Hier ligt al iets (${n} ticket${n > 1 ? 's' : ''})"` : ''}>${esc(l)}${n ? `<i>${n}</i>` : ''}</button>`;
    }).join('');
  }
  $('#f-tickets').addEventListener('input', (e) => { if (e.target.dataset.ticket) fTickets[Number(e.target.dataset.ticket)] = e.target.value; });
  $('#f-tickets').addEventListener('focusin', (e) => { if (e.target.dataset.ticket) tVeld = Number(e.target.dataset.ticket); });
  $('#f-t-stappen').addEventListener('click', (e) => {
    const stap = Number(e.target.closest('[data-t-stap]')?.dataset.tStap || 0);
    if (!stap) return;
    if (stap > 0 && fTickets.length < 20) fTickets.push('');
    if (stap < 0 && fTickets.length > 1) fTickets.pop();
    tVeld = Math.min(tVeld, fTickets.length - 1);
    if (stap > 0) tVeld = fTickets.length - 1;
    toonFormTickets();
  });
  $('#f-loc-snel').addEventListener('click', (e) => {
    const k = e.target.closest('[data-loc]');
    if (!k) return;
    // Het gekozen ticket, of anders het eerste zonder locatie.
    const leeg = fTickets.findIndex((l) => !l);
    const i = fTickets[tVeld] === '' || leeg < 0 ? tVeld : leeg;
    fTickets[i] = k.dataset.loc;
    tVeld = Math.min(i + 1, fTickets.length - 1);
    toonFormTickets();
  });

  function openFormulier(b, klant) {
    const f = $('#f');
    f.reset();
    bewerkId = b ? b.id : null;
    $('#f-titel').textContent = b ? `Bon ${b.nr} wijzigen` : 'Nieuwe bon';
    $('#f-bewaar').textContent = b ? 'Bewaren' : 'Bon maken';
    $('#f-fout').textContent = '';
    f.naam.value = b ? b.klant.naam : '';
    f.telefoon.value = b ? b.klant.telefoon : '';
    f.email.value = b ? b.klant.email : '';
    if (klant) vulKlant(klant);
    f.klaarTegen.value = b ? b.klaarTegen : plusDagen(2);
    fTickets = b ? (ticketsVan(b).length ? ticketsVan(b).map((t) => t.locatie) : [b.locatie || '']) : [''];
    toonFormTickets();
    f.betaald.checked = b ? b.betaald : false;
    f.betaalwijze.value = b ? b.betaalwijze : '';
    f.opmerking.value = b ? b.opmerking : '';
    f.vliegtuig.value = b ? b.vliegtuig || '' : '';
    regels = b ? b.stukken.map((s) => ({ ...s, behandeling: s.behandeling || 'ander' })) : [];
    soorten = new Set(b ? (b.soorten || [b.soort]) : ['Strijk']);
    toonSoorten();
    $('#f-print').checked = autoPrint;
    $('#f-print-label').hidden = Boolean(b);
    $('#f-klanten').hidden = true;
    $('#f-stuk').value = '';
    toonSuggesties();
    toonRegels();
    toonVlekUitleg();
    $('#formulier').showModal();
    if (!b && !klant) f.naam.focus();
  }

  $('#nieuw').addEventListener('click', () => openFormulier(null));

  $('#f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = $('#f');
    if (!f.naam.value.trim()) { $('#f-fout').textContent = 'Vul de naam van de klant in.'; f.naam.focus(); return; }
    const stukken = regels.filter((r) => r.naam.trim());
    if (soorten.has('Droogkuis') && !stukken.some((r) => r.behandeling === 'droogkuis')) {
      $('#f-fout').textContent = 'Vul bij droogkuis in welke stukken de klant binnenbrengt: zoek het stuk hierboven, bijvoorbeeld "mantel".';
      return;
    }
    if (!soorten.size) { $('#f-fout').textContent = 'Kies wat de klant binnenbrengt.'; return; }
    if (!bewerkId && !f.vliegtuig.value.trim() && vliegtuigKlant({ naam: f.naam.value, telefoon: f.telefoon.value })) {
      $('#f-fout').textContent = 'Vul het vliegtuig in (bv. de registratie OO-ABC).'; f.vliegtuig.focus(); return;
    }
    const bon = {
      klant: { naam: f.naam.value, telefoon: f.telefoon.value, email: f.email.value },
      soorten: [...soorten],
      stukken,
      klaarTegen: f.klaarTegen.value,
      tickets: fTickets.map((locatie) => ({ locatie })),
      betaald: f.betaald.checked,
      betaalwijze: f.betaalwijze.value,
      opmerking: f.opmerking.value,
      vliegtuig: f.vliegtuig.value,
    };
    $('#f-bewaar').disabled = true;
    try {
      const bewaarKlant = !$('#f-bewaar-klant').hidden && f.bewaarKlant.checked;
      const { bon: nieuw } = await doe(bewerkId ? { op: 'wijzig', id: bewerkId, bon, bewaarKlant } : { op: 'nieuw', bon, bewaarKlant });
      $('#formulier').close();
      if (!bewerkId) {
        tab = 'binnen';
        $$('.tabs button').forEach((k) => k.setAttribute('aria-selected', String(k.dataset.tab === 'binnen')));
        $('#zoek').value = '';
        toon();
      }
      openDetail(nieuw.id);
      if (!bewerkId && autoPrint) drukAf(nieuw, 'afgifte', standaardFormaat());
    } catch (err) {
      if (err.message !== 'pin') $('#f-fout').textContent = err.message;
    } finally {
      $('#f-bewaar').disabled = false;
    }
  });

  // ---------- Instellingen ----------
  // Per soort bonnetje een eigen printer (enkel in het Windows-programma).
  const PRINT_SOORTEN = [
    ['klant', 'Klantenbon (klein)', false], ['ticket', 'Tickets voor de zakken en hangers', false],
    ['afhaal', 'Afhaalbon (klein)', false], ['a4', 'Grote bonnen op A4 en vlekkenbonnen', true],
    ['prijslijst', 'Prijslijsten en briefjes', true], ['dag', 'Dagoverzicht', false],
  ];
  async function toonPrinter() {
    if (!DESKTOP) return;
    const p = await window.crystal.printers();
    $('#i-printer-rijen').innerHTML = PRINT_SOORTEN.map(([soort, label, a4]) => {
      const keuze = p.keuze[soort] || '';
      const opties = [['', 'Afdrukvenster tonen (zoals vroeger)'], ...p.lijst.map((n) => [n, n])];
      // Een gekozen printer die er nu niet is (bv. uitgeschakeld) blijft zichtbaar.
      if (keuze && keuze !== 'venster' && !p.lijst.includes(keuze)) opties.push([keuze, keuze + ' (niet gevonden)']);
      return `<div class="i-printer-rij"><span>${esc(label)}</span>
        <select data-printer-soort="${soort}" aria-label="Printer voor ${esc(label)}">${opties.map(([v, t]) => `<option value="${esc(v)}"${v === keuze ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>
        <button type="button" class="knop klein" data-printer-test="${soort}">Test</button></div>`;
    }).join('');
  }
  $('#i-printer-rijen').addEventListener('change', async (e) => {
    const soort = e.target.dataset.printerSoort;
    if (!soort) return;
    await window.crystal.zetPrinter(soort, e.target.value);
    toast('Printer gekozen ✓');
  });
  // Een proefafdruk op de printer van die soort.
  $('#i-printer-rijen').addEventListener('click', async (e) => {
    const soort = e.target.closest('[data-printer-test]')?.dataset.printerTest;
    if (!soort) return;
    const b = testBon();
    const label = PRINT_SOORTEN.find((x) => x[0] === soort)[1];
    const a4 = soort === 'a4' || soort === 'prijslijst';
    $('#afdruk').innerHTML = soort === 'ticket' ? mandTicket(b) : soort === 'afhaal' ? bonKlein(b, true) : soort === 'a4' ? bonA4(b, false)
      : soort === 'klant' ? bonKlein(b, false)
      : `<section class="${a4 ? 'a4-blad' : 'pr-bon'}"><div class="pr-merk">${esc(WINKEL.naam)}</div><p><b>Testafdruk</b></p><p>${esc(label)}</p><p>${esc(new Date().toLocaleString('nl-BE'))}</p></section>`;
    $('#afdruk').className = a4 ? 'a4' : '';
    await logoGeladen();
    await afdrukken(a4 ? 'a4' : 'klein', soort);
  });
  // ---------- Vaste locaties ----------
  // "Rek 1-10" wordt Rek 1, Rek 2 ... Rek 10.
  function locatieReeks(tekst) {
    const m = /^(.*?)(\d+)\s*(?:-|t\.?e\.?m\.?|tot)\s*(\d+)\s*$/i.exec(tekst.trim());
    if (!m) return [tekst.trim()].filter(Boolean);
    const [van, tot] = [Number(m[2]), Number(m[3])];
    if (tot < van || tot - van > 99) return [tekst.trim()];
    return Array.from({ length: tot - van + 1 }, (_, i) => `${m[1]}${van + i}`.trim());
  }
  function toonVasteLocaties() {
    const lijst = vasteLocaties();
    $('#i-loc-lijst').innerHTML = lijst.length
      ? lijst.map((l, i) => `<span class="loc-chip">${esc(l)}<button type="button" data-loc-weg="${i}" aria-label="${esc(l)} weghalen">✕</button></span>`).join('')
      : '<p class="tijdlijn">Nog geen vaste locaties.</p>';
  }
  async function bewaarLocaties(lijst, melding) {
    try {
      await doe({ op: 'instellingen', locaties: lijst });
      toonVasteLocaties();
      if (melding) toast(melding);
    } catch (err) {
      if (err.message !== 'pin') $('#i-fout').textContent = err.message;
    }
  }
  $('#i-loc-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nieuw = locatieReeks($('#i-loc-nieuw').value);
    if (!nieuw.length) return;
    await bewaarLocaties([...vasteLocaties(), ...nieuw], nieuw.length > 1 ? `${nieuw.length} locaties toegevoegd ✓` : 'Locatie toegevoegd ✓');
    $('#i-loc-nieuw').value = '';
    $('#i-loc-nieuw').focus();
  });
  $('#i-loc-lijst').addEventListener('click', (e) => {
    const i = e.target.closest('[data-loc-weg]')?.dataset.locWeg;
    if (i === undefined) return;
    bewaarLocaties(vasteLocaties().filter((_, j) => j !== Number(i)));
  });
  $('#i-loc-wis').addEventListener('click', () => {
    if (vasteLocaties().length && confirm('Alle vaste locaties weghalen?')) bewaarLocaties([], 'Vaste locaties gewist');
  });

  function openInstellingen() {
    toonVasteLocaties();
    $('#i-print').checked = autoPrint;
    $('#i-fout').textContent = '';
    $('#i-printers').hidden = !DESKTOP;
    $('#i-formaat').value = standaardFormaat();
    $('#i-aanraak').value = aanraak;
    toonPrinter();
    $('#instellingen').showModal();
  }
  $('#instellingen-knop').addEventListener('click', openInstellingen);
  $('#i-print').addEventListener('change', (e) => zetAutoPrint(e.target.checked));
  $('#i-formaat').addEventListener('change', (e) => {
    doe({ op: 'instellingen', formaat: e.target.value }).catch((err) => { if (err.message !== 'pin') $('#i-fout').textContent = err.message; });
  });
  $('#i-aanraak').addEventListener('change', (e) => zetAanraak(e.target.value));
  $('#i-testbon').addEventListener('click', () => drukAf(testBon(), 'afgifte', standaardFormaat()));
  // ---------- Prijslijst afdrukken: altijd de prijzen zoals ze nu in het programma staan ----------
  // Gemeenschappelijke kop van de A4-prijslijsten: naam, gegevens van de winkel en de titel.
  const plKop = (titel, sub) => `<header class="pl-kop2">
      <div><div class="pl-merk">${esc(WINKEL.naam)}</div><div class="pl-slogan">Strijkatelier · Wasserij · Droogkuis</div></div>
      <div class="pl-gegevens">${esc(WINKEL.adres)}<br>Tel. ${esc(WINKEL.telefoon)}</div>
    </header>
    <div class="pl-titelbalk"><h1>${titel}</h1>${sub ? `<span>${sub}</span>` : ''}</div>`;
  const plDatum = () => new Date().toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' });

  async function drukPrijslijst(metActie, samen = false) {
    const actie = metActie ? actieVandaag() : null;
    const pr = (v) => (v == null ? '' : '€ ' + Number(v).toFixed(2).replace('.', ','));
    const groepHtml = (g) => `
      <tr class="pl-kop"><th>${esc(g.titel)}</th><th>Prijs strijken</th><th>Aantal</th><th>Prijs ${esc(g.wassenLabel || 'wassen')}</th><th>Aantal</th></tr>
      ${g.stukken.map((st) => {
        const strijk = st.strijken != null ? actiePrijs(actie, st.strijken) : null;
        const tweede = st.wassen ?? st.prijs ?? null;
        return `<tr><td>${esc(st.naam)}</td><td>${strijk == null ? (tweede == null ? '' : '/') : pr(strijk)}</td><td></td><td>${pr(tweede)}</td><td></td></tr>`;
      }).join('')}
      <tr class="pl-leeg"><td colspan="5"></td></tr>`;
    // Zoals de papieren lijst V43: voorkant dames- en herenkleding, achterkant de rest.
    const [eerste, ...rest] = prijslijst().groepen || [];
    $('#afdruk').innerHTML = `<section class="pl-blad">
      <div class="pl-titel">${esc(WINKEL.naam)} · Prijslijst${actie ? ` · <b>${esc(actie.naam)}</b>` : ''}<span class="pl-datum">${esc(new Date().toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'))}</span></div>
      ${actie ? `<div class="pl-sub">Geldig t.e.m. ${esc(new Date(actie.tot + 'T12:00').toLocaleDateString('nl-BE', { day: 'numeric', month: 'long', year: 'numeric' }))}</div>` : ''}
      <table class="pl-tabel">${eerste ? groepHtml(eerste) : ''}</table>
      <table class="pl-tabel pl-nieuwe-pagina">${rest.map(groepHtml).join('')}<tr class="pl-totaal"><td colspan="3"></td><td>Totaal:</td><td></td></tr></table>
    </section>`;
    $('#afdruk').className = 'a4';
    if (samen) return;
    await afdrukken('a4-dubbel', 'prijslijst');
  }
  // Nieuwkuis: in de layout van de oude kassaprijslijst (Luxe, Zijde, Linnen, Verv., Strijk).
  async function drukDroogkuis(samen = false) {
    const pr = (v) => (v == null ? '' : Number(v).toFixed(2).replace('.', ','));
    const lijst = (prijslijst().droogkuis || []).map(droogStuk);
    const html = `<section class="pl-blad dk-blad${samen ? ' pl-nieuwe-pagina' : ''}">
      <div class="dk-kop"><span>Prijslijst Eur</span><b>${esc(WINKEL.naam.toUpperCase())}</b><span>${esc(new Date().toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-'))}</span></div>
      <div class="dk-titel">Nieuwkuis</div>
      <table class="dk-tabel"><thead><tr><th></th><th>Luxe<br>vanaf</th><th>Zijde<br>vanaf</th><th>Linnen<br>vanaf</th><th>Verv.</th><th>Strijk</th></tr></thead>
      <tbody>${lijst.map((d) => `<tr><td>${esc(d.naam.toUpperCase())}</td><td>${pr(d.luxe)}</td><td>${pr(d.zijde)}</td><td>${pr(d.linne)}</td><td></td><td></td></tr>`).join('')}</tbody></table>
      <div class="dk-aantal">Aantal : ${lijst.length}</div>
      <div class="dk-aantal"><b>Alle prijzen zijn vanafprijzen.</b> De juiste prijs krijgt u na het bekijken van het stuk.</div>
    </section>`;
    if (samen) $('#afdruk').insertAdjacentHTML('beforeend', html);
    else $('#afdruk').innerHTML = html;
    $('#afdruk').className = 'a4';
    if (samen) return;
    await afdrukken('a4-dubbel', 'prijslijst');
  }
  // Een A4 met briefjes om uit te knippen: de klant tekent dat de winkel niet aansprakelijk is voor schade aan de stoffen.
  async function drukAansprakelijk() {
    const briefje = `<div class="na-briefje">
      <div class="na-kop"><b>${esc(WINKEL.naam)}</b><span>Bonnr. ………………</span></div>
      <p>Ik ga ermee akkoord dat ${esc(WINKEL.naam)} niet aansprakelijk is voor schade aan de stoffen.</p>
      <small>Bij reinigen, wassen of strijken kunnen stoffen, kleuren, knopen en versieringen beschadigd raken.</small>
      <div class="na-velden"><span>Naam</span><span>Datum</span><span class="na-handtekening">Handtekening</span></div></div>`;
    $('#afdruk').innerHTML = `<section class="na-blad">${briefje.repeat(8)}</section>`;
    $('#afdruk').className = 'a4';
    await afdrukken('a4', 'prijslijst');
  }
  function openPrijslijsten() {
    const actie = actieVandaag();
    $('#pl-actie').hidden = !actie;
    if (actie) $('#pl-actie').textContent = 'Strijken & wassen met ' + actie.naam.split(':')[0].toLowerCase();
    $('#prijslijsten').showModal();
  }
  $('#prijslijsten-knop').addEventListener('click', openPrijslijsten);
  $('#pl-strijk').addEventListener('click', () => drukPrijslijst(false));
  $('#pl-actie').addEventListener('click', () => drukPrijslijst(true));
  $('#pl-droog').addEventListener('click', () => drukDroogkuis());
  $('#pl-na').addEventListener('click', drukAansprakelijk);
  $('#pl-aanpassen').addEventListener('click', () => { $('#prijslijsten').close(); openPrijslijst(); });
  $('#i-indeling').addEventListener('click', () => { $('#instellingen').close(); openIndeling(); });

  // ---------- Indeling aanpassen ----------
  function indelingRij(r = { plaats: '', woorden: [] }) {
    return `<div class="ix-rij">
      <input class="ix-plaats" maxlength="40" placeholder="Plaats, bv. Kast 2 lingerie" value="${esc(r.plaats)}" aria-label="Plaats">
      <input class="ix-woorden" placeholder="Stukken, bv. bh, slip, lingerie" value="${esc((r.woorden || []).join(', '))}" aria-label="Stukken voor deze plaats">
      <button type="button" class="knop ix-knop" data-ix="op" title="Hoger zetten" aria-label="Hoger zetten">↑</button>
      <button type="button" class="knop ix-knop" data-ix="weg" title="Weghalen" aria-label="Weghalen">✕</button>
    </div>`;
  }
  function openIndeling(lijst = indeling()) {
    $('#ix-rijen').innerHTML = lijst.map(indelingRij).join('');
    $('#ix-fout').textContent = '';
    if (!$('#indeling').open) $('#indeling').showModal();
  }
  $('#ix-rijen').addEventListener('click', (e) => {
    const knop = e.target.closest('[data-ix]');
    if (!knop) return;
    const rij = knop.closest('.ix-rij');
    if (knop.dataset.ix === 'weg') rij.remove();
    else if (rij.previousElementSibling) rij.parentNode.insertBefore(rij, rij.previousElementSibling);
  });
  $('#ix-plus').addEventListener('click', () => {
    $('#ix-rijen').insertAdjacentHTML('beforeend', indelingRij());
    $('#ix-rijen .ix-rij:last-child .ix-plaats').focus();
  });
  $('#ix-standaard').addEventListener('click', () => openIndeling(STANDAARD_INDELING));
  $('#ix').addEventListener('submit', async (e) => {
    e.preventDefault();
    const lijst = $$('#ix-rijen .ix-rij').map((r) => ({
      plaats: r.querySelector('.ix-plaats').value.trim(),
      woorden: r.querySelector('.ix-woorden').value.split(',').map((w) => w.trim()).filter(Boolean),
    })).filter((r) => r.plaats);
    try {
      await doe({ op: 'instellingen', indeling: lijst });
      $('#indeling').close();
      toast('Indeling opgeslagen ✓');
    } catch (err) {
      if (err.message !== 'pin') $('#ix-fout').textContent = err.message;
    }
  });

  // ---------- Prijslijst aanpassen ----------
  let werk = null;
  const kolommen = (g) => (g.wassenLabel ? ['strijken', 'wassen'] : ['prijs']);
  const hoofdletter = (t) => t.charAt(0).toUpperCase() + t.slice(1);

  function openPrijslijst() {
    werk = JSON.parse(JSON.stringify(prijslijst()));
    werk.droogkuis = (werk.droogkuis || []).map(droogStuk);
    $('#p-zoek').value = '';
    $('#p-fout').textContent = '';
    toonPrijslijst();
    $('#prijslijst').showModal();
  }
  function toonPrijslijst() {
    const groepenHtml = werk.groepen.map((g, gi) => {
      const kol = kolommen(g);
      const kop = kol.map((k) => `<span>${k === 'wassen' ? esc(hoofdletter(g.wassenLabel)) : k === 'strijken' ? 'Strijken' : 'Prijs'}</span>`).join('');
      const rijen = g.stukken.map((s, si) => `<div class="p-rij k${kol.length}" data-g="${gi}" data-s="${si}">
          <input data-veld="naam" value="${esc(s.naam)}" aria-label="Naam" placeholder="Naam van het stuk">
          ${kol.map((k) => `<input data-veld="${k}" class="prijs" inputmode="decimal" value="${esc(prijsTekst(s[k]))}" placeholder="–" aria-label="${k === 'prijs' ? 'Prijs' : hoofdletter(k)}">`).join('')}
          <button type="button" class="weg" data-weg aria-label="Weghalen">✕</button>
        </div>`).join('');
      return `<section class="p-groep"><h3>${esc(g.titel)}</h3>
        <div class="p-rij k${kol.length} p-kop"><span>Stuk</span>${kop}<span></span></div>${rijen}
        <button type="button" class="knop klein" data-plus="${gi}">+ Stuk toevoegen</button></section>`;
    }).join('');
    const droog = `<section class="p-groep"><h3>Nieuwkuis / droogkuis <small>(leeg = prijs volgt na het bekijken van het stuk)</small></h3>
      <div class="p-rij k3 p-kop"><span>Stuk</span>${DROOG_KOL.map(([, l]) => `<span>${l}</span>`).join('')}<span></span></div>
      ${werk.droogkuis.map((d, di) => `<div class="p-rij k3" data-d="${di}">
        <input data-veld="naam" value="${esc(d.naam)}" aria-label="Naam" placeholder="Naam van het stuk">
        ${DROOG_KOL.map(([k, l]) => `<input data-veld="${k}" class="prijs" inputmode="decimal" value="${esc(prijsTekst(d[k]))}" placeholder="–" aria-label="${l}">`).join('')}
        <button type="button" class="weg" data-weg aria-label="Weghalen">✕</button></div>`).join('')}
      <button type="button" class="knop klein" data-plus="droog">+ Stuk toevoegen</button></section>`;
    $('#p-groepen').innerHTML = groepenHtml + droog;
    filterPrijslijst();
  }
  function filterPrijslijst() {
    const q = zoekVorm($('#p-zoek').value.trim());
    $$('#p-groepen .p-rij:not(.p-kop)').forEach((rij) => {
      rij.hidden = Boolean(q) && !zoekVorm(rij.querySelector('input').value).includes(q);
    });
  }
  $('#p-zoek').addEventListener('input', filterPrijslijst);
  $('#p-groepen').addEventListener('input', (e) => {
    const rij = e.target.closest('.p-rij');
    if (!rij) return;
    if (rij.dataset.d !== undefined) werk.droogkuis[Number(rij.dataset.d)][e.target.dataset.veld] = e.target.value;
    else werk.groepen[Number(rij.dataset.g)].stukken[Number(rij.dataset.s)][e.target.dataset.veld] = e.target.value;
  });
  $('#p-groepen').addEventListener('click', (e) => {
    const plus = e.target.closest('[data-plus]');
    if (plus) {
      const droog = plus.dataset.plus === 'droog';
      if (droog) werk.droogkuis.push({ naam: '' });
      else werk.groepen[Number(plus.dataset.plus)].stukken.push({ naam: '' });
      $('#p-zoek').value = '';
      toonPrijslijst();
      const sectie = $$('#p-groepen .p-groep')[droog ? werk.groepen.length : Number(plus.dataset.plus)];
      const nieuw = $$('.p-rij:not(.p-kop)', sectie).pop();
      nieuw.querySelector('input').focus();
      nieuw.scrollIntoView({ block: 'center' });
      return;
    }
    if (!e.target.closest('[data-weg]')) return;
    const rij = e.target.closest('.p-rij');
    if (rij.dataset.d !== undefined) werk.droogkuis.splice(Number(rij.dataset.d), 1);
    else werk.groepen[Number(rij.dataset.g)].stukken.splice(Number(rij.dataset.s), 1);
    toonPrijslijst();
  });

  /** "2,30", "2.3" of "€ 2,30" wordt 2.3; leeg wordt undefined; onzin wordt NaN. */
  function leesPrijs(v) {
    if (v == null || String(v).trim() === '') return undefined;
    if (typeof v === 'number') return v;
    const n = Number(String(v).replace('€', '').replace(',', '.').trim());
    return Number.isFinite(n) && n >= 0 && n < 10000 ? Math.round(n * 100) / 100 : NaN;
  }
  $('#p').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fout = (t) => { $('#p-fout').textContent = t; };
    const groepenUit = [];
    for (const g of werk.groepen) {
      const stukken = [];
      for (const s of g.stukken) {
        const naam = String(s.naam || '').trim();
        const stuk = { naam };
        for (const k of kolommen(g)) {
          const v = leesPrijs(s[k]);
          if (Number.isNaN(v)) return fout(`"${s[k]}" bij ${naam || 'een nieuw stuk'} is geen geldige prijs.`);
          if (v !== undefined) stuk[k] = v;
        }
        if (!naam) {
          if (Object.keys(stuk).length > 1) return fout(`Vul een naam in voor het nieuwe stuk bij ${g.titel}.`);
          continue;
        }
        stukken.push(stuk);
      }
      groepenUit.push({ titel: g.titel, wassenLabel: g.wassenLabel || '', stukken });
    }
    const droogkuis = [];
    for (const d of werk.droogkuis) {
      const naam = String(d.naam || '').trim();
      const stuk = { naam };
      for (const [k] of DROOG_KOL) {
        const v = leesPrijs(d[k]);
        if (Number.isNaN(v)) return fout(`"${d[k]}" bij ${naam || 'een nieuw droogkuisstuk'} is geen geldige prijs.`);
        if (v !== undefined) stuk[k] = v;
      }
      if (naam) droogkuis.push(stuk);
    }
    $('#p-bewaar').disabled = true;
    try {
      await doe({ op: 'prijslijst', prijslijst: { versie: 2, groepen: groepenUit, droogkuis } });
      $('#prijslijst').close();
      toast('Prijslijst opgeslagen ✓');
    } catch (err) {
      if (err.message !== 'pin') fout(err.message);
    } finally {
      $('#p-bewaar').disabled = false;
    }
  });
  $('#p-standaard').addEventListener('click', async () => {
    if (!confirm('Alle prijzen terugzetten naar de standaardprijslijst? Je eigen aanpassingen gaan verloren.')) return;
    try {
      await doe({ op: 'prijslijst', prijslijst: null });
      werk = JSON.parse(JSON.stringify(prijslijst()));
      toonPrijslijst();
      $('#p-fout').textContent = '';
    } catch (err) {
      if (err.message !== 'pin') $('#p-fout').textContent = err.message;
    }
  });


  // ---------- Geld ----------
  const WIJZEN = [['cash', 'Cash'], ['kaart', 'Kaart'], ['dienstencheques', 'Dienstencheques'], ['overschrijving', 'Overschrijving'], ['onbekend', 'Onbekend']];
  /** De dag (YYYY-MM-DD) van een tijdstip, in de tijd van deze pc. */
  function dagVan(iso) {
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  function leesBedrag(t) {
    const n = Number(String(t || '').replace('€', '').replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  }
  const verschilTekst = (v) => (v > 0 ? '+ ' : v < 0 ? '− ' : '') + eur(Math.abs(v)) + (v > 0 ? ' te veel' : v < 0 ? ' te weinig' : ' (klopt)');
  const mooieDag = (dag) => new Date(dag + 'T12:00:00').toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  /** Alles over de kassa van één dag: beginbedrag, ontvangsten per betaalwijze, wat er in de kassa hoort te zitten. */
  function kassaVan(dag) {
    const k = (staat.kassa || {})[dag] || {};
    const alle = (staat.betalingen || []).filter((p) => dagVan(p.op) === dag).sort((a, b) => a.op.localeCompare(b.op));
    // Geschrapte betalingen tellen niet mee, maar blijven bewaard en zichtbaar.
    const betalingen = alle.filter((p) => !p.geschraptOp);
    const geschrapt = alle.filter((p) => p.geschraptOp);
    const per = Object.fromEntries(WIJZEN.map(([w]) => [w, 0]));
    for (const p of betalingen) per[p.wijze in per ? p.wijze : 'onbekend'] += p.bedrag;
    for (const w in per) per[w] = Math.round(per[w] * 100) / 100;
    const bewegingen = k.bewegingen || [];
    const bewegingTotaal = Math.round(bewegingen.reduce((s2, b) => s2 + b.bedrag, 0) * 100) / 100;
    const begin = k.begin ?? null;
    const verwacht = Math.round(((begin || 0) + per.cash + bewegingTotaal) * 100) / 100;
    const totaal = Math.round(Object.values(per).reduce((a, b) => a + b, 0) * 100) / 100;
    const verschil = k.geteld == null ? null : Math.round((k.geteld - verwacht) * 100) / 100;
    const binnen = (staat.bonnen || []).filter((b) => dagVan(b.binnenOp) === dag).length;
    const opgehaald = (staat.bonnen || []).filter((b) => b.opgehaaldOp && dagVan(b.opgehaaldOp) === dag).length;
    const factuurVragen = (staat.bonnen || []).filter((b) => b.factuur && dagVan(b.factuur.gevraagdOp) === dag);
    return { dag, ...k, begin, betalingen, geschrapt, correcties: k.correcties || [], per, bewegingen, bewegingTotaal, verwacht, totaal, verschil, binnen, opgehaald, factuurVragen };
  }

  // ---------- Kassa openen (elke dag) ----------
  // De app is een hulpmiddel, geen kassa: geen kassa openen/afsluiten en geen betalingen bijhouden op het scherm.
  // Wat overblijft onder de knop "Facturen" zijn de factuuraanvragen.
  const KASSA = false;
  function controleerKassa() {
    if (!KASSA) return;
    if ($('#app').hidden || $('#kassa-open').open) return;
    const dag = vandaagIso();
    if ((staat.kassa || {})[dag]?.geopendOp) return;
    $('#ko-dag').textContent = mooieDag(dag);
    const vorige = Object.keys(staat.kassa || {}).filter((d) => d < dag).sort().pop();
    const v = vorige && staat.kassa[vorige];
    $('#ko-vorige').textContent = v ? `Vorige keer (${mooieDag(vorige)}): ${v.geteld != null ? 'geteld bij het afsluiten ' + eur(v.geteld) : 'niet afgesloten, verwacht ' + eur(kassaVan(vorige).verwacht)}.` : '';
    $('#ko-fout').textContent = '';
    $('#ko').begin.value = '';
    $$('dialog[open]').forEach((d) => d.close());
    $('#kassa-open').showModal();
    $('#ko').begin.focus();
  }
  $('#ko').addEventListener('submit', async (e) => {
    e.preventDefault();
    const begin = leesBedrag(e.target.begin.value);
    if (Number.isNaN(begin) || e.target.begin.value.trim() === '') { $('#ko-fout').textContent = 'Vul het bedrag in, ook als het 0 is.'; return; }
    try {
      await doe({ op: 'kassaOpen', dag: vandaagIso(), begin });
      $('#kassa-open').close();
      toast(`Kassa geopend met ${eur(begin)}`);
    } catch (err) {
      if (err.message !== 'pin') $('#ko-fout').textContent = err.message;
    }
  });

  // ---------- Kassa ----------
  function openKassa(dag) {
    $('#k-dag').value = dag || vandaagIso();
    $('#k-beweging').hidden = true;
    $('#k-sluit').hidden = true;
    $('#k-corr').hidden = true;
    $('#k-fout').textContent = '';
    toonKassa();
    if (!$('#kassa').open) $('#kassa').showModal();
  }
  const uur = (iso) => new Date(iso).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' });
  const wijzeNaam = (w) => (WIJZEN.find(([x]) => x === w) || [w, w])[1];
  function toonKassa() {
    if (!KASSA) { $('#k-inhoud').innerHTML = factuurLijst(); return; }
    const k = kassaVan($('#k-dag').value || vandaagIso());
    // Verbeteren kan zolang de kassa van die dag open is; een afgesloten dag eerst opnieuw openen.
    const kan = Boolean(k.geopendOp) && !k.geslotenOp;
    const rij = (label, waarde, cls = '', data = '') => (kan && data
      ? `<tr class="${cls} k-wijzig"><td colspan="2"><button type="button" class="k-rij" ${data}><span>${label}</span><b>${waarde}</b><i aria-hidden="true">✎</i></button></td></tr>`
      : `<tr class="${cls}"><td>${label}</td><td class="bedrag">${waarde}</td></tr>`);
    const betaling = (p) => (kan
      ? `<li><button type="button" class="k-rij" data-betaling="${esc(p.id)}"><span>${esc(uur(p.op))} · ${esc(p.nr)} · ${esc(p.naam)}</span><small>${esc(wijzeNaam(p.wijze))}</small><b>${eur(p.bedrag)}</b><i aria-hidden="true">✎</i></button></li>`
      : `<li><div class="k-rij"><span>${esc(uur(p.op))} · ${esc(p.nr)} · ${esc(p.naam)}</span><small>${esc(wijzeNaam(p.wijze))}</small><b>${eur(p.bedrag)}</b></div></li>`);
    $('#k-inhoud').innerHTML = `
      <p class="tijdlijn">${esc(mooieDag(k.dag))} · ${k.geslotenOp ? 'afgesloten om ' + esc(mooiDatum(k.geslotenOp, true).split(' ').pop()) : k.geopendOp ? 'open' : 'nog niet geopend'}</p>
      <div class="k-tegels">
        ${WIJZEN.filter(([w]) => w !== 'onbekend' || k.per.onbekend).map(([w, label]) => `<div class="k-tegel"><span>${label}</span><b>${eur(k.per[w])}</b></div>`).join('')}
        <div class="k-tegel totaal"><span>Totaal ontvangen</span><b>${eur(k.totaal)}</b></div>
      </div>
      ${k.geslotenOp ? '<p class="k-hint">Iets verkeerd ingegeven? Kies onderaan "Opnieuw openen", verbeter het en sluit de dag daarna opnieuw af.</p>' : kan ? '<p class="k-hint">Tik op een bedrag of betaling om het te verbeteren.</p>' : ''}
      <h3>Cash in de kassa</h3>
      <table class="stukken k-tabel"><tbody>
        ${rij('Bij het openen', k.begin == null ? '—' : eur(k.begin), '', 'data-begin')}
        ${rij('+ cash ontvangen', eur(k.per.cash))}
        ${k.bewegingen.map((b, i) => rij(`${b.bedrag < 0 ? '− uit' : '+ in'} de kassa: ${esc(b.reden)}`, eur(Math.abs(b.bedrag)), '', `data-beweging="${i}"`)).join('')}
        ${rij('= hoort in de kassa te zitten', eur(k.verwacht), 'som')}
        ${k.geteld != null ? rij('Geteld bij het afsluiten', eur(k.geteld)) + rij('Verschil', verschilTekst(k.verschil), k.verschil ? 'verschil' : 'ok') : ''}
      </tbody></table>
      <h3>Betalingen (${k.betalingen.length})</h3>
      ${k.betalingen.length ? `<ul class="k-lijst">${k.betalingen.map(betaling).join('')}</ul>` : '<p class="tijdlijn">Nog geen betalingen.</p>'}
      ${k.correcties.length || k.geschrapt.length ? `<h3>Verbeteringen (${k.correcties.length})</h3>
        <ul class="k-correcties">${k.correcties.map((c) => `<li><span>${esc(uur(c.op))}</span> ${esc(c.tekst)}</li>`).join('')}</ul>` : ''}
      <p class="tijdlijn">${k.binnen} bon${k.binnen === 1 ? '' : 'nen'} binnengebracht, ${k.opgehaald} opgehaald.</p>
      ${factuurLijst()}`;
    const vandaag = $('#k-dag').value === vandaagIso();
    $('#k-beweging-knop').hidden = Boolean(k.geslotenOp) || !k.geopendOp;
    $('#k-sluit-knop').textContent = k.geslotenOp ? 'Opnieuw openen' : 'Dag afsluiten';
    $('#k-sluit-knop').hidden = !k.geopendOp && !vandaag;
  }
  $('#kassa-knop').addEventListener('click', () => openKassa());
  if (!KASSA) {
    $('#kassa-knop').textContent = 'Facturen';
    $('#kassa h2').textContent = 'Factuuraanvragen';
    $('#kassa').classList.add('zonder-kassa');
    $('#kassa h2').textContent = 'Facturen en dagoverzicht';
    $('#k-dagwis').hidden = false;
  }
  $('#k-dagwis-knop').addEventListener('click', async () => {
    const dag = vandaagIso();
    await drukDag(dag, standaardFormaat());
    if (!confirm('Is het dagoverzicht goed afgedrukt? Dan worden nu alle betalingen en opgehaalde bonnen gewist. Dit kan niet ongedaan gemaakt worden.')) return;
    try {
      await doe({ op: 'dagWissen' });
      toonKassa();
      toast('Gewist. De bonnen die nog opgehaald moeten worden staan er nog.');
    } catch (err) {
      if (err.message !== 'pin') $('#k-fout').textContent = err.message;
    }
  });
  $('#k-dag').addEventListener('change', () => { $('#k-beweging').hidden = true; $('#k-sluit').hidden = true; $('#k-corr').hidden = true; toonKassa(); });
  $('#k-beweging-knop').addEventListener('click', () => {
    $('#k-sluit').hidden = true;
    $('#k-corr').hidden = true;
    $('#k-beweging').hidden = false;
    $('#k-beweging').reset();
    zetRichting('uit');
    $('#k-beweging').bedrag.focus();
  });
  let richting = 'uit';
  function zetRichting(r2) {
    richting = r2;
    $$('#k-richting button').forEach((k) => k.setAttribute('aria-pressed', String(k.dataset.richting === r2)));
  }
  $('#k-richting').addEventListener('click', (e) => { const k = e.target.closest('[data-richting]'); if (k) zetRichting(k.dataset.richting); });
  $$('#kassa [data-annuleer]').forEach((k) => k.addEventListener('click', () => { k.closest('form').hidden = true; }));
  $('#k-beweging').addEventListener('submit', async (e) => {
    e.preventDefault();
    const b = leesBedrag(e.target.bedrag.value);
    if (!(b > 0)) { $('#k-fout').textContent = 'Vul een bedrag in.'; return; }
    try {
      await doe({ op: 'kassaBeweging', dag: $('#k-dag').value, bedrag: richting === 'uit' ? -b : b, reden: e.target.reden.value });
      e.target.hidden = true;
      $('#k-fout').textContent = '';
      toonKassa();
    } catch (err) {
      if (err.message !== 'pin') $('#k-fout').textContent = err.message;
    }
  });
  // ---------- Kassa verbeteren ----------
  let corr = null;
  $('#k-corr-wijze').innerHTML = WIJZEN.filter(([w]) => w !== 'onbekend').map(([w, label]) => `<button type="button" data-wijze="${w}" aria-pressed="false">${label}</button>`).join('');
  const zetCorrWijze = (w) => $$('#k-corr-wijze button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.wijze === w)));
  const zetCorrRichting = (r2) => $$('#k-corr-richting button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.richting === r2)));
  $('#k-corr-wijze').addEventListener('click', (e) => { const b = e.target.closest('[data-wijze]'); if (b) zetCorrWijze(b.dataset.wijze); });
  $('#k-corr-richting').addEventListener('click', (e) => { const b = e.target.closest('[data-richting]'); if (b) zetCorrRichting(b.dataset.richting); });
  const bedragTekst = (n) => Number(n).toFixed(2).replace('.', ',');
  function openCorrectie(c) {
    const f = $('#k-corr');
    const k = kassaVan($('#k-dag').value);
    corr = c;
    $('#k-beweging').hidden = true;
    $('#k-sluit').hidden = true;
    f.reset();
    $('#k-corr-wijze').hidden = c.soort !== 'betaling';
    $('#k-corr-richting').hidden = c.soort !== 'beweging';
    f.reden.hidden = c.soort !== 'beweging';
    $('#k-corr-weg').hidden = c.soort === 'begin';
    if (c.soort === 'begin') {
      $('#k-corr-titel').textContent = 'Beginbedrag verbeteren';
      f.bedrag.value = bedragTekst(k.begin || 0);
    } else if (c.soort === 'beweging') {
      const b = k.bewegingen[c.index];
      $('#k-corr-titel').textContent = 'Geld in/uit verbeteren';
      zetCorrRichting(b.bedrag < 0 ? 'uit' : 'in');
      f.bedrag.value = bedragTekst(Math.abs(b.bedrag));
      f.reden.value = b.reden;
      $('#k-corr-weg').textContent = 'Schrappen';
    } else {
      const p = k.betalingen.find((x) => x.id === c.id);
      $('#k-corr-titel').textContent = `Betaling ${p.nr} · ${p.naam} verbeteren`;
      zetCorrWijze(p.wijze);
      f.bedrag.value = bedragTekst(p.bedrag);
      $('#k-corr-weg').textContent = 'Betaling schrappen';
    }
    f.hidden = false;
    f.scrollIntoView({ block: 'nearest' });
  }
  $('#k-inhoud').addEventListener('click', (e) => {
    const b = e.target.closest('.k-rij[data-begin], .k-rij[data-beweging], .k-rij[data-betaling]');
    if (!b) return;
    if (b.hasAttribute('data-begin')) openCorrectie({ soort: 'begin' });
    else if (b.hasAttribute('data-beweging')) openCorrectie({ soort: 'beweging', index: Number(b.dataset.beweging) });
    else openCorrectie({ soort: 'betaling', id: b.dataset.betaling });
  });
  async function bewaarCorrectie(actie) {
    try {
      await doe(actie);
      $('#k-corr').hidden = true;
      $('#k-fout').textContent = '';
      toonKassa();
      toast('Verbeterd');
    } catch (err) {
      if (err.message !== 'pin') $('#k-fout').textContent = err.message;
    }
  }
  $('#k-corr').addEventListener('submit', (e) => {
    e.preventDefault();
    const dag = $('#k-dag').value;
    const b = leesBedrag(e.target.bedrag.value);
    if (Number.isNaN(b) || e.target.bedrag.value.trim() === '' || b < 0) { $('#k-fout').textContent = 'Vul een geldig bedrag in.'; return; }
    if (corr.soort === 'begin') return bewaarCorrectie({ op: 'kassaOpen', dag, begin: b });
    if (corr.soort === 'beweging') {
      const uit = $('#k-corr-richting [aria-pressed="true"]')?.dataset.richting !== 'in';
      return bewaarCorrectie({ op: 'kassaBewegingWijzig', dag, index: corr.index, bedrag: uit ? -b : b, reden: e.target.reden.value });
    }
    const wijze = $('#k-corr-wijze [aria-pressed="true"]')?.dataset.wijze;
    return bewaarCorrectie({ op: 'betalingWijzig', id: corr.id, wijze, bedrag: b });
  });
  $('#k-corr-weg').addEventListener('click', () => {
    const dag = $('#k-dag').value;
    if (corr.soort === 'beweging') {
      if (confirm('Deze beweging schrappen?')) bewaarCorrectie({ op: 'kassaBewegingWijzig', dag, index: corr.index, weg: true });
      return;
    }
    if (confirm('Deze betaling schrappen? De bon staat daarna weer als niet betaald.')) bewaarCorrectie({ op: 'betalingWijzig', id: corr.id, weg: true });
  });

  // ---------- Cijferklavier op het scherm (aanraakscherm) ----------
  function cijferpad(input) {
    input.classList.add('cijferpad-veld');
    const pad = document.createElement('div');
    pad.className = 'cijferpad';
    pad.innerHTML = ['7', '8', '9', '4', '5', '6', '1', '2', '3', ',', '0', '⌫']
      .map((t) => `<button type="button" data-toets="${t}"${t === '⌫' ? ' aria-label="Wissen"' : ''}>${t}</button>`).join('');
    // De focus blijft in het veld, zodat Enter en het gewone klavier ook blijven werken.
    pad.addEventListener('pointerdown', (e) => e.preventDefault());
    pad.addEventListener('click', (e) => {
      const t = e.target.closest('[data-toets]')?.dataset.toets;
      if (!t) return;
      let v = input.value;
      if (t === '⌫') v = v.slice(0, -1);
      else if (t === ',') { if (!/[,.]/.test(v)) v = (v || '0') + ','; }
      else if (!/[,.]\d\d$/.test(v)) v = (v === '0' ? '' : v) + t;
      input.value = v;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    (input.closest('.rij') || input.closest('.prijs-veld')).after(pad);
  }
  ['#ko [name=begin]', '#k-beweging [name=bedrag]', '#k-sluit [name=geteld]', '#k-corr [name=bedrag]'].forEach((sel) => cijferpad($(sel)));
  zetAanraak(aanraak);

  // ---------- Kassa exporteren (voor de boekhouder) ----------
  function exporteerMaand(maand) {
    const dagen = new Set([
      ...Object.keys(staat.kassa || {}).filter((d) => d.startsWith(maand)),
      ...(staat.betalingen || []).map((p) => dagVan(p.op)).filter((d) => d.startsWith(maand)),
    ]);
    const getal = (n) => (n == null ? '' : Number(n).toFixed(2).replace('.', ','));
    const veld = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const regels = [['Dag', 'Beginbedrag', 'Cash', 'Kaart', 'Dienstencheques', 'Overschrijving', 'Onbekend', 'Totaal ontvangen', 'Geld in/uit', 'Hoort in de kassa', 'Geteld', 'Verschil', 'Verbeteringen']];
    const betaalRegels = [['Dag', 'Uur', 'Bon', 'Klant', 'Betaalwijze', 'Bedrag', 'Geschrapt']];
    for (const dag of [...dagen].sort()) {
      const k = kassaVan(dag);
      regels.push([dag, getal(k.begin), getal(k.per.cash), getal(k.per.kaart), getal(k.per.dienstencheques), getal(k.per.overschrijving), getal(k.per.onbekend),
        getal(k.totaal), getal(k.bewegingTotaal), getal(k.verwacht), getal(k.geteld), getal(k.verschil), k.correcties.length]);
      for (const p of [...k.betalingen, ...k.geschrapt].sort((a, b) => a.op.localeCompare(b.op))) {
        betaalRegels.push([dag, uur(p.op), p.nr, p.naam, wijzeNaam(p.wijze), getal(p.bedrag), p.geschraptOp ? 'ja' : '']);
      }
    }
    // Puntkomma's en komma's: zo opent het meteen goed in Excel op een Belgische pc.
    const csv = '\ufeff' + [...regels, [], ['Betalingen'], ...betaalRegels].map((r) => r.map(veld).join(';')).join('\r\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = `kassa-${maand}.csv`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    return dagen.size;
  }
  $('#k-export').addEventListener('click', () => {
    const maand = ($('#k-dag').value || vandaagIso()).slice(0, 7);
    const n = exporteerMaand(maand);
    toast(n ? `Kassa van ${new Date(maand + '-15').toLocaleDateString('nl-BE', { month: 'long', year: 'numeric' })} gedownload` : 'Geen kassa in die maand');
  });

  $('#k-sluit-knop').addEventListener('click', async () => {
    const dag = $('#k-dag').value;
    const k = kassaVan(dag);
    if (k.geslotenOp) {
      if (!confirm('De kassa van deze dag opnieuw openen? Het getelde bedrag wordt gewist.')) return;
      try { await doe({ op: 'kassaHeropen', dag }); toonKassa(); } catch (err) { if (err.message !== 'pin') $('#k-fout').textContent = err.message; }
      return;
    }
    $('#k-beweging').hidden = true;
    $('#k-corr').hidden = true;
    $('#k-sluit').hidden = false;
    $('#k-sluit').reset();
    $('#k-sluit').geteld.focus();
  });
  $('#k-sluit').addEventListener('submit', async (e) => {
    e.preventDefault();
    const geteld = leesBedrag(e.target.geteld.value);
    if (Number.isNaN(geteld) || e.target.geteld.value.trim() === '') { $('#k-fout').textContent = 'Vul het getelde bedrag in.'; return; }
    const dag = $('#k-dag').value;
    try {
      if (!kassaVan(dag).geopendOp) await doe({ op: 'kassaOpen', dag, begin: 0 });
      await doe({ op: 'kassaSluit', dag, geteld });
      e.target.hidden = true;
      $('#k-fout').textContent = '';
      toonKassa();
      drukDag(dag, standaardFormaat());
    } catch (err) {
      if (err.message !== 'pin') $('#k-fout').textContent = err.message;
    }
  });
  $('#k-print').addEventListener('click', () => drukDag($('#k-dag').value, standaardFormaat()));

  // ---------- Factuuraanvragen ----------
  const openVragen = () => (staat.bonnen || []).filter((b) => b.factuur && !b.factuur.gemaaktOp)
    .sort((a, b) => a.factuur.gevraagdOp.localeCompare(b.factuur.gevraagdOp));
  const factuurNaam = (b) => b.factuur.naam || b.klant.naam;

  /** In de kassa: alle aanvragen die nog een factuur nodig hebben, met een knop om af te vinken. */
  function factuurLijst() {
    const lijst = openVragen();
    if (!lijst.length) return '<h3>Factuuraanvragen</h3><p class="tijdlijn">Geen openstaande factuuraanvragen.</p>';
    return `<h3>Factuuraanvragen nog te maken (${lijst.length})</h3>
      <table class="stukken"><tbody>${lijst.map((b) => `<tr>
        <td>${esc(mooiDatum(b.factuur.gevraagdOp))}</td>
        <td><b>${esc(factuurNaam(b))}</b> · bon ${esc(b.nr)}${b.vliegtuig ? ' · ✈ ' + esc(b.vliegtuig) : ''}<br><span class="tijdlijn">${esc([b.factuur.adres, b.factuur.btw, b.klant.telefoon, b.factuur.email].filter(Boolean).join(' · ') || 'geen gegevens ingevuld')}</span></td>
        <td class="bedrag">${eur(b.totaal)}${b.prijsOpen ? ' <span class="volgt">+ prijs volgt</span>' : ''}</td>
        <td><button class="knop klein" type="button" data-gemaakt="${esc(b.id)}">Gemaakt ✓</button></td>
      </tr>`).join('')}</tbody></table>`;
  }
  $('#k-inhoud').addEventListener('click', async (e) => {
    const knop = e.target.closest('[data-gemaakt]');
    if (!knop) return;
    try {
      await doe({ op: 'factuurGemaakt', id: knop.dataset.gemaakt });
      toonKassa();
    } catch (err) {
      if (err.message !== 'pin') $('#k-fout').textContent = err.message;
    }
  });

  /** Op het dagoverzicht: wie vandaag een factuur vroeg, met alles wat nodig is om ze te maken. */
  function factuurAfdruk(k) {
    const vandaag = k.factuurVragen;
    const ouder = openVragen().filter((b) => dagVan(b.factuur.gevraagdOp) < k.dag);
    if (!vandaag.length && !ouder.length) return '';
    const blok = (b) => `<div class="pr-factuurvraag">
        <b>${esc(factuurNaam(b))}</b>${b.factuur.naam && b.factuur.naam !== b.klant.naam ? ' (' + esc(b.klant.naam) + ')' : ''}<br>
        ${b.factuur.adres ? esc(b.factuur.adres) + '<br>' : ''}${b.factuur.btw ? 'Btw ' + esc(b.factuur.btw) + '<br>' : ''}${[b.klant.telefoon, b.factuur.email].filter(Boolean).map(esc).join(' · ')}${b.klant.telefoon || b.factuur.email ? '<br>' : ''}
        ${b.vliegtuig ? 'Vliegtuig: <b>' + esc(b.vliegtuig) + '</b><br>' : ''}Bon ${esc(b.nr)} · ${esc(b.stukken.map((s) => s.aantal + '× ' + s.naam.replace(/ \((strijken|wassen[^)]*)\)$/, '')).join(', ') || b.soort)}<br>
        <b>${eur(b.totaal)}</b>${b.prijsOpen ? ' + prijs volgt' : ''} · ${b.betaald ? 'betaald' + (b.betaalwijze ? ' (' + esc(b.betaalwijze) + ')' : '') : 'nog niet betaald'}
      </div>`;
    return `<div class="pr-groep-kop">Factuur gevraagd vandaag (${vandaag.length})</div>
      ${vandaag.length ? vandaag.map(blok).join('') : '<div class="pr-klein">Geen.</div>'}
      ${ouder.length ? `<div class="pr-groep-kop">Nog te maken van eerder (${ouder.length})</div>${ouder.map(blok).join('')}` : ''}`;
  }

  /** Het dagoverzicht op papier: kassa, ontvangsten per betaalwijze en alle betalingen. */
  function drukDag(dag, formaat) {
    const k = kassaVan(dag);
    const rij = (a, b2, cls = '') => `<tr class="${cls}"><td>${a}</td><td class="r">${b2}</td></tr>`;
    $('#afdruk').innerHTML = `<section class="pr-bon pr-dag">
      <div class="pr-merk">${esc(WINKEL.naam)}</div>
      <div class="pr-titel">Dagoverzicht</div>
      <div class="pr-dag-datum">${esc(mooieDag(dag))}</div>
      <table class="pr-stukken">
        <tbody>
          <tr class="pr-groep"><td colspan="2">Ontvangen</td></tr>
          ${WIJZEN.filter(([w]) => w !== 'onbekend' || k.per.onbekend).map(([w, label]) => rij(label, eur(k.per[w]))).join('')}
        </tbody>
        <tfoot><tr><td>Totaal (${k.betalingen.length} betaling${k.betalingen.length === 1 ? '' : 'en'})</td><td class="r">${eur(k.totaal)}</td></tr></tfoot>
      </table>
      ${KASSA ? `<table class="pr-stukken">
        <tbody>
          <tr class="pr-groep"><td colspan="2">Cash in de kassa</td></tr>
          ${rij('Bij het openen', k.begin == null ? '—' : eur(k.begin))}
          ${rij('+ cash ontvangen', eur(k.per.cash))}
          ${k.bewegingen.map((b) => rij(`${b.bedrag < 0 ? '− uit' : '+ in'}: ${esc(b.reden)}`, eur(Math.abs(b.bedrag)))).join('')}
          ${rij('<b>Hoort in de kassa</b>', '<b>' + eur(k.verwacht) + '</b>')}
          ${k.geteld != null ? rij('Geteld', eur(k.geteld)) + rij('<b>Verschil</b>', '<b>' + verschilTekst(k.verschil) + '</b>') : rij('Geteld', 'nog niet afgesloten')}
        </tbody>
      </table>` : ''}
      ${k.betalingen.length ? `<table class="pr-stukken pr-klein-tabel">
        <tbody>
          <tr class="pr-groep"><td colspan="2">Betalingen</td></tr>
          ${k.betalingen.map((p) => rij(`${esc(new Date(p.op).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' }))} · ${esc(p.nr)} · ${esc(p.naam)} · ${esc(p.wijze)}`, eur(p.bedrag))).join('')}
        </tbody>
      </table>` : ''}
      ${k.correcties.length ? `<table class="pr-stukken pr-klein-tabel">
        <tbody>
          <tr class="pr-groep"><td colspan="2">Verbeteringen</td></tr>
          ${k.correcties.map((c) => `<tr><td colspan="2">${esc(uur(c.op))} · ${esc(c.tekst)}</td></tr>`).join('')}
        </tbody>
      </table>` : ''}
      ${factuurAfdruk(k)}
      <div class="pr-voet">Bonnen binnengebracht: ${k.binnen} · opgehaald: ${k.opgehaald}<br>Afgedrukt ${esc(new Date().toLocaleString('nl-BE'))}</div>
    </section>`;
    $('#afdruk').className = formaat === 'a4' ? 'a4-zoom' : '';
    return afdrukken(formaat, 'dag');
  }

  // ---------- Klanten ----------
  let klantOpen = null;
  function openKlanten() {
    $('#kl-zoek').value = '';
    $('#kl-form').hidden = true;
    toonKlanten();
    $('#klanten').showModal();
    $('#kl-zoek').focus();
  }
  function toonKlanten() {
    const q = zoekVorm($('#kl-zoek').value.trim());
    const cijfers = $('#kl-zoek').value.replace(/\D/g, '');
    const alle = klanten().sort((a, b) => zoekVorm(a.naam).localeCompare(zoekVorm(b.naam)));
    const lijst = alle.filter((k) => !q || zoekVorm(k.naam + ' ' + k.email + ' ' + (k.adres || '')).includes(q)
      || (cijfers.length >= 3 && (k.telefoon || '').replace(/\D/g, '').includes(cijfers.replace(/^0/, ''))));
    $('#kl-aantal').textContent = `${alle.length} klant${alle.length === 1 ? '' : 'en'}${q ? `, ${lijst.length} gevonden` : ''}`;
    $('#kl-lijst').innerHTML = lijst.slice(0, 200).map((k) => `<li><button type="button" data-klant="${esc(k.sleutel)}">
      <strong>${esc(k.naam)}</strong><span>${esc(k.telefoon || 'geen telefoon')}${k.bonnen ? ` · ${k.bonnen} bon${k.bonnen === 1 ? '' : 'nen'}${k.open ? ` (${k.open} open)` : ''}` : ''}${k.btw ? ' · ' + esc(k.btw) : ''}</span></button></li>`).join('');
    $('#kl-lijst').hidden = false;
  }
  $('#klanten-knop').addEventListener('click', openKlanten);
  $('#kl-zoek').addEventListener('input', () => { $('#kl-form').hidden = true; toonKlanten(); });
  $('#kl-lijst').addEventListener('click', (e) => {
    const knop = e.target.closest('[data-klant]');
    if (!knop) return;
    const k = klanten().find((x) => x.sleutel === knop.dataset.klant);
    if (!k) return;
    klantOpen = k;
    const f = $('#kl-form');
    for (const veld of ['naam', 'telefoon', 'email', 'adres', 'btw', 'notitie']) f[veld].value = k[veld] || '';
    f.vlekkenrapport.checked = Boolean(k.vlekkenrapport);
    f.vliegtuig.checked = vliegtuigKlant(k);
    $('#kl-titel').textContent = k.naam;
    $('#kl-bonnen').hidden = false;
    $('#kl-nieuw').hidden = false;
    $('#kl-weg').hidden = false;
    $('#kl-info').textContent = `Klant sinds ${k.sinds ? mooiDatum(k.sinds) : '?'} · ${k.bonnen} bon${k.bonnen === 1 ? '' : 'nen'} in het systeem`;
    $('#kl-lijst').hidden = true;
    f.hidden = false;
  });
  // Een klant zelf toevoegen: een leeg formulier.
  $('#kl-toevoegen').addEventListener('click', () => {
    klantOpen = null;
    const f = $('#kl-form');
    f.reset();
    // Wat in het zoekveld staat, is meestal de naam of het gsm-nummer.
    const zoek = $('#kl-zoek').value.trim();
    if (zoek) f[/^[\d\s+/.-]+$/.test(zoek) ? 'telefoon' : 'naam'].value = zoek;
    f.vliegtuig.checked = false;
    $('#kl-titel').textContent = 'Nieuwe klant';
    $('#kl-info').textContent = '';
    $('#kl-bonnen').hidden = true;
    $('#kl-nieuw').hidden = true;
    $('#kl-weg').hidden = true;
    $('#kl-lijst').hidden = true;
    f.hidden = false;
    f.naam.focus();
  });
  $('#kl-weg').addEventListener('click', async () => {
    if (!klantOpen || !confirm(`${klantOpen.naam} uit Klanten verwijderen? De bonnen van deze klant blijven staan.`)) return;
    try {
      await doe({ op: 'klantWeg', sleutel: klantOpen.sleutel });
      toast('Klant verwijderd ✓');
      $('#kl-form').hidden = true;
      toonKlanten();
    } catch (err) {
      if (err.message !== 'pin') alert(err.message);
    }
  });
  $('#kl-form [data-annuleer]').addEventListener('click', () => { $('#kl-form').hidden = true; toonKlanten(); });
  $('#kl-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const klant = { ...Object.fromEntries(['naam', 'telefoon', 'email', 'adres', 'btw', 'notitie'].map((v) => [v, f[v].value])), vlekkenrapport: f.vlekkenrapport.checked, vliegtuig: f.vliegtuig.checked };
    try {
      if (klantOpen) await doe({ op: 'klant', sleutel: klantOpen.sleutel, klant });
      else {
        // Niet aangevinkt: dan herkent het programma luchtvaartklanten nog zelf op naam.
        if (!klant.vliegtuig) delete klant.vliegtuig;
        await doe({ op: 'klantNieuw', klant });
      }
      toast(klantOpen ? 'Klant opgeslagen ✓' : 'Klant toegevoegd ✓');
      f.hidden = true;
      toonKlanten();
    } catch (err) {
      if (err.message !== 'pin') alert(err.message);
    }
  });
  $('#kl-bonnen').addEventListener('click', () => {
    if (!klantOpen) return;
    $('#klanten').close();
    $('#zoek').value = klantOpen.telefoon || klantOpen.naam;
    toon();
  });
  $('#kl-nieuw').addEventListener('click', () => {
    if (!klantOpen) return;
    $('#klanten').close();
    openFormulier(null, klantOpen);
  });

  // Sluitknoppen en klikken naast een paneel.
  $$('dialog').forEach((d) => {
    if (d.id === 'kassa-open') return; // die moet ingevuld worden
    d.addEventListener('click', (e) => {
      if (e.target.closest('[data-sluit]') || e.target === d) d.close();
    });
  });
  $('#kassa-open').addEventListener('cancel', (e) => e.preventDefault());

  // ---------- Start ----------
  if (pin) {
    $('#app').hidden = false;
    laad();
  } else {
    vergrendel();
  }
  // Andere toestellen kunnen intussen iets gewijzigd hebben.
  setInterval(() => { if (pin && document.visibilityState === 'visible' && !document.querySelector('dialog[open]')) laad(true); }, 30000);
  document.addEventListener('visibilitychange', () => { if (pin && document.visibilityState === 'visible') laad(true); });

  if (!DESKTOP && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
})();
