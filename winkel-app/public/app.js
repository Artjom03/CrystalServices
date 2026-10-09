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

  const BEHANDELING = { strijk: 'Strijk', was: 'Was', droogkuis: 'Droogkuis', ander: 'Overige' };
  const VOLGORDE = ['strijk', 'was', 'droogkuis', 'ander'];
  // Veelvoorkomende droogkuisstukken: zonder prijs, die volgt na het bekijken van het stuk.
  const DROOGKUIS = ['Mantel', 'Jas', 'Kostuum (2-delig)', 'Colbert', 'Broek', 'Kleed', 'Avondkleed', 'Rok', 'Hemd', 'Bloes', 'Trui', 'Das', 'Donsdeken', 'Deken', 'Gordijn'];
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
      instellingen: data.instellingen || { bewaarMaanden: 12 },
      prijslijst: data.prijslijst || null,
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
  const klantSleutel = (k) => telefoonIntl(k.telefoon) || 'naam:' + zoekVorm(k.naam).trim();

  function zoekTekst(b) {
    const intl = telefoonIntl(b.klant.telefoon);
    return zoekVorm([
      b.nr, scanCode(b.nr), b.klant.naam, b.klant.email, b.locatie,
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

  /** Alle gekende klanten, met hun laatste gegevens en hoeveel bonnen ze hebben. */
  function klanten() {
    const per = new Map();
    const opDatum = [...(staat.bonnen || [])].sort((a, b) => a.binnenOp.localeCompare(b.binnenOp));
    for (const b of opDatum) {
      const sleutel = klantSleutel(b.klant);
      const k = per.get(sleutel) || { sleutel, naam: '', telefoon: '', email: '', bonnen: 0, open: 0 };
      k.naam = b.klant.naam;
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
    const locatie = b.locatie && b.status !== 'opgehaald' ? ` · <b class="loc">📍 ${esc(b.locatie)}</b>` : '';
    return `<li class="bon" data-id="${esc(b.id)}" tabindex="0">
      <div class="nr">${esc(b.nr)}</div>
      <div class="naam">${esc(b.klant.naam)}${b.klant.telefoon ? ` <span class="tel">${esc(b.klant.telefoon)}</span>` : ''}</div>
      <div class="rechts">${label}<span>${b.totaal ? eur(b.totaal) : ''}${b.betaald ? ' · betaald' : ''}</span></div>
      <div class="info">${esc(b.soort)}${aantal ? ' · ' + aantal + ' stuk' + (aantal > 1 ? 's' : '') : ''}${locatie}</div>
    </li>`;
  }

  function toonLocaties() {
    // Voorstellen voor het locatieveld: wat nu in gebruik is eerst.
    const gebruikt = (staat.bonnen || []).slice().sort((a, b) => (a.status === 'opgehaald') - (b.status === 'opgehaald'))
      .map((b) => b.locatie).filter(Boolean);
    $('#locaties').innerHTML = [...new Set(gebruikt)].slice(0, 40).map((l) => `<option value="${esc(l)}"></option>`).join('');
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
      ? `<table class="stukken"><tbody>${groepen(b.stukken).map(([beh, lijst]) =>
          `<tr class="groep"><td colspan="3">${BEHANDELING[beh]}</td></tr>` +
          lijst.map((s) => `<tr><td>${s.aantal} ×</td><td>${esc(s.naam)}</td><td class="bedrag">${bedragOfVolgt(s)}</td></tr>`).join('')).join('')}</tbody>
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
      <div class="d-blok">
        <h3>Locatie in de winkel</h3>
        <form class="d-locatie" data-locatie>
          <input name="locatie" list="locaties" maxlength="40" value="${esc(b.locatie || '')}" placeholder="Waar liggen de kleren? Bv. rek 3" aria-label="Locatie" autocomplete="off">
          <button class="knop" type="submit">Opslaan</button>
        </form>
      </div>
      <div class="d-blok">
        <h3>${esc(b.soort)}${b.klaarTegen ? ' · klaar tegen ' + esc(mooiDatum(b.klaarTegen)) : ''}</h3>
        ${stukken}
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
      <div class="d-knoppen">
        <button class="knop" data-actie="print" data-soort="afgifte">Afgiftebon</button>
        <button class="knop" data-actie="print" data-soort="afhaal">Afhaalbon</button>
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
        // data-betaal="" betekent opgehaald maar nog niet betaald.
        const betaal = knop.dataset.betaal;
        const { bon: na } = await doe({ op: 'status', id, status: 'opgehaald', betaalwijze: betaal || undefined });
        $('#detail').close();
        if (autoPrint) drukAf(na, 'afhaal');
      } else if (actie === 'klantcode') {
        if (knop.dataset.opnieuw && !confirm('Een nieuwe code maken? De oude code werkt dan niet meer.')) return;
        const data = await doe({ op: 'klantcode', telefoon: b.klant.telefoon, naam: b.klant.naam });
        openDetail(id, data.pin);
      } else if (actie === 'print') {
        if (knop.dataset.soort === 'afhaal' && b.prijsOpen && !confirm('Er staan nog stukken zonder prijs. Toch een afhaalbon afdrukken?')) return;
        drukAf(b, knop.dataset.soort);
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
    if ($('#app').hidden || $('#formulier').open || $('#prijslijst').open) return;
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
    $$('dialog[open]').forEach((d) => d.close());
    if (code === scanCode(TEST_NR)) { toast('De scanner werkt ✓'); return; }
    const zoek = () => (staat.bonnen || []).find((b) => scanCode(b.nr) === code);
    let b = zoek();
    if (!b && !DESKTOP) { await laad(true); b = zoek(); }
    if (!b) { toast(`Bon ${code.slice(0, 2)}-${code.slice(2)} niet gevonden. Misschien al gewist?`); return; }
    const boodschap = b.status === 'opgehaald' ? `Deze bon is al opgehaald (${mooiDatum(b.opgehaaldOp, true)}).`
      : b.prijsOpen ? 'Gescand. Er staan nog stukken zonder prijs: vul die eerst in via Wijzigen.'
      : b.betaald ? 'Gescand. Al betaald: tik op Opgehaald.'
      : `Gescand. Te betalen: ${eur(b.totaal)}. Kies hoe de klant betaalt${autoPrint ? '; daarna komt de afhaalbon uit de printer' : ''}.`;
    openDetail(b.id, null, boodschap);
  }

  // ---------- Afdrukken ----------
  // Afgiftebon: bij het binnenbrengen, wat er binnenkwam, zonder prijzen, met een label voor de mand.
  // Afhaalbon: bij het ophalen, alle stukken met prijs, totaal en betaling.
  function drukAf(b, soortBon = 'afgifte') {
    const afhaal = soortBon === 'afhaal';
    const aantal = b.stukken.reduce((n, s) => n + s.aantal, 0);
    const klaar = b.klaarTegen ? esc(mooiDatum(b.klaarTegen)) : 'wij laten het u weten';
    const code = scanCode(b.nr);
    const kop = `
        <header class="pr-kop">
          <img src="/apple-touch-icon.png" alt="">
          <div>
            <div class="pr-merk">${esc(WINKEL.naam)}</div>
            <div class="pr-klein">Strijkatelier · Wasserij · Droogkuis</div>
          </div>
        </header>
        <div class="pr-klein pr-adres">${esc(WINKEL.adres)}<br>Tel. ${esc(WINKEL.telefoon)}</div>
        <div class="pr-titel">${afhaal ? 'Afhaalbon' : 'Afgiftebon'}</div>
        <div class="pr-nr"><span>Bon</span>${esc(b.nr)}${!afhaal && code ? streepjescode(code) : ''}</div>`;
    const uren = esc(WINKEL.uren[0].toUpperCase() + WINKEL.uren.slice(1));

    let inhoud;
    if (!afhaal) {
      // Wat binnenkwam, per soort. Strijk of was zonder stukken: de mand wordt later geteld.
      const gekozen = b.soorten || [b.soort];
      const blokken = ['Strijk', 'Was', 'Droogkuis'].filter((x) => gekozen.includes(x))
        .map((soort) => [soort, b.stukken.filter((s) => s.behandeling === soort.toLowerCase())]);
      const overig = b.stukken.filter((s) => !['strijk', 'was', 'droogkuis'].includes(s.behandeling));
      const andere = gekozen.filter((x) => !['Strijk', 'Was', 'Droogkuis'].includes(x));
      if (overig.length || andere.length) blokken.push([andere.join(', ') || 'Overige', overig]);
      const perSoort = blokken.map(([titel, lijst]) => {
        const regels = lijst.length
          ? lijst.map((s) => `<tr><td class="n">${s.aantal}×</td><td>${esc(s.naam.replace(/ \((strijken|wassen[^)]*)\)$/, ''))}</td></tr>`).join('')
          : `<tr><td class="n"></td><td>${titel === 'Strijk' ? 'Strijkmand: de stukken worden geteld bij het strijken' : titel === 'Was' ? 'Was: de stukken worden geteld bij het wassen' : ''}</td></tr>`;
        return `<tr class="pr-groep"><td colspan="2">${esc(titel)}</td></tr>${regels}`;
      }).join('');
      inhoud = `
        <table class="pr-info">
          <tr><th>Klant</th><td><b>${esc(b.klant.naam)}</b>${b.klant.telefoon ? '<br>' + esc(b.klant.telefoon) : ''}</td></tr>
          <tr><th>Binnen</th><td>${esc(mooiDatum(b.binnenOp, true))}</td></tr>
        </table>
        <div class="pr-klaar">Klaar tegen<b>${klaar}</b></div>
        <table class="pr-lijst">${perSoort}</table>
        ${b.opmerking ? `<div class="pr-opm"><b>Opmerking</b><br>${esc(b.opmerking)}</div>` : ''}
        <div class="pr-betaling">${b.betaald ? 'Betaald' + (b.betaalwijze ? ' · ' + esc(b.betaalwijze) : '') : 'U betaalt bij het ophalen.'}</div>
        ${heeftToegang(b) ? `<div class="pr-portaal">Volg uw bonnen online:<br><b>${esc(PORTAAL.replace(/^https?:\/\//, ''))}</b></div>` : ''}
        <footer class="pr-voet">Breng deze bon mee bij het ophalen.<br>${uren}<br>Bedankt en tot binnenkort!</footer>`;
    } else {
      const rijen = groepen(b.stukken).map(([beh, lijst]) =>
        `<tr class="pr-groep"><td colspan="2">${BEHANDELING[beh]}</td></tr>` +
        lijst.map((s) => `<tr><td>${s.aantal} × ${esc(s.naam.replace(/ \((strijken|wassen[^)]*)\)$/, ''))}${s.aantal > 1 && s.prijs != null ? `<span class="pr-klein"> (${eur(s.prijs)}/st.)</span>` : ''}</td><td class="r">${s.prijs == null ? 'volgt' : eur(s.aantal * s.prijs)}</td></tr>`).join('')
      ).join('');
      const betaling = b.betaald
        ? `Betaald${b.betaalwijze ? ' · ' + esc(b.betaalwijze) : ''}`
        : `Te betalen: <b>${eur(b.totaal)}</b>`;
      inhoud = `
        <table class="pr-info">
          <tr><th>Klant</th><td><b>${esc(b.klant.naam)}</b></td></tr>
          <tr><th>Binnen</th><td>${esc(mooiDatum(b.binnenOp))}</td></tr>
          <tr><th>Opgehaald</th><td>${esc(mooiDatum(b.opgehaaldOp || new Date().toISOString(), true))}</td></tr>
        </table>
        ${b.stukken.length ? `
        <table class="pr-stukken">
          <tbody>${rijen}</tbody>
          <tfoot><tr><td>Totaal (${aantal} stuk${aantal > 1 ? 's' : ''})</td><td class="r">${eur(b.totaal)}</td></tr></tfoot>
        </table>` : ''}
        <div class="pr-betaling">${betaling}</div>
        <footer class="pr-voet">Bedankt voor uw vertrouwen!<br>${uren}</footer>`;
    }

    // Het label blijft in de winkel: daarop mag ook de locatie staan.
    $('#afdruk').innerHTML = `<section class="pr-bon">${kop}${inhoud}</section>` + (afhaal ? '' : `
      <div class="pr-knip">✂ hier knippen · label voor de mand</div>
      <section class="pr-label">
        <div class="pr-label-nr">${esc(b.nr)}</div>
        <div class="pr-label-naam">${esc(b.klant.naam)}</div>
        <div class="pr-label-info">${esc(b.soort)}${aantal ? ' · ' + aantal + ' st.' : ''} · klaar ${b.klaarTegen ? esc(mooiDatum(b.klaarTegen)) : '?'}</div>
        ${b.locatie ? `<div class="pr-label-loc">Locatie: ${esc(b.locatie)}</div>` : ''}
        ${b.opmerking ? `<div class="pr-label-opm">${esc(b.opmerking)}</div>` : ''}
        ${code ? streepjescode(code, 0.4) : ''}
      </section>`);
    // Wachten tot het logo geladen is, anders ontbreekt het soms op papier.
    const logo = $('#afdruk img');
    if (logo && !logo.complete) {
      logo.onload = logo.onerror = afdrukken;
    } else {
      afdrukken();
    }
  }

  function afdrukken() {
    if (!DESKTOP) return window.print();
    window.crystal.afdrukken().then((r) => {
      if (r && !r.ok && !/cancel/i.test(r.fout || '')) {
        alert('Afdrukken lukte niet' + (r.fout ? ' (' + r.fout + ')' : '') + '. Kies de printer via ⚙ Instellingen → Printer kiezen.');
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
  const STANDAARD_PRIJSLIJST = { groepen: window.PRIJSLIJST || [], droogkuis: DROOGKUIS };
  const prijslijst = () => staat.prijslijst || STANDAARD_PRIJSLIJST;

  let artikelBron = null;
  let artikelLijst = [];
  /** Alle gekende stukken, plat: één regel per behandeling met de prijs. */
  function artikelen() {
    const p = prijslijst();
    if (artikelBron === p) return artikelLijst;
    const lijst = [];
    for (const g of p.groepen || []) {
      for (const s of g.stukken) {
        if (s.prijs != null) lijst.push({ naam: s.naam, kort: s.naam, soort: '', prijs: s.prijs, behandeling: 'ander' });
        if (s.strijken != null) lijst.push({ naam: `${s.naam} (strijken)`, kort: s.naam, soort: 'strijken', prijs: s.strijken, behandeling: 'strijk' });
        if (s.wassen != null) lijst.push({ naam: `${s.naam} (${g.wassenLabel || 'wassen'})`, kort: s.naam, soort: g.wassenLabel || 'wassen', prijs: s.wassen, behandeling: 'was' });
        if (s.prijs == null && s.strijken == null && s.wassen == null) lijst.push({ naam: s.naam, kort: s.naam, soort: '', prijs: null, behandeling: 'ander' });
      }
    }
    for (const naam of p.droogkuis || []) lijst.push({ naam, kort: naam, soort: 'droogkuis', prijs: null, behandeling: 'droogkuis' });
    for (const a of lijst) a.zoek = zoekVorm(a.kort + ' ' + a.soort);
    artikelBron = p;
    artikelLijst = lijst;
    return lijst;
  }
  const artikelSleutel = (a) => a.behandeling + '|' + a.naam;

  // Snelknoppen: wat de winkel het vaakst gebruikt, aangevuld met de klassiekers.
  const KLASSIEKERS = ['strijk|Hemd (strijken)', 'strijk|Broek (strijken)', 'strijk|T-shirt/topje (strijken)', 'strijk|Bloes (strijken)',
    'strijk|Trui (strijken)', 'strijk|Kleed (strijken)', 'was|Hemd (wassen + strijken)', 'droogkuis|Mantel', 'droogkuis|Kostuum (2-delig)', 'droogkuis|Jas'];
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
      <span>${esc(a.kort)}</span><small>${esc(a.soort || 'per stuk')} · ${a.prijs == null ? 'prijs volgt' : eur(a.prijs)}</small></button>`;

  function treffers(q) {
    const woorden = zoekVorm(q).split(/\s+/).filter(Boolean);
    return artikelen()
      .filter((a) => woorden.every((w) => a.zoek.includes(w)))
      .sort((a, b) => b.zoek.startsWith(woorden[0]) - a.zoek.startsWith(woorden[0]))
      .slice(0, 12);
  }

  function toonSuggesties() {
    const tekst = $('#f-stuk').value.trim();
    if (!tekst) {
      const snel = veelgebruikt();
      $('#f-suggesties').innerHTML = snel.length ? `<div class="sug-titel">Veelgebruikt: tik om toe te voegen</div><div class="tegels">${snel.map(tegel).join('')}</div>` : '';
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
    </tr>`).join('');
    toonTotaal();
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
    if (veld === 'aantal') r.aantal = Math.max(1, Math.round(Number(e.target.value) || 1));
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
      toonTotaal();
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
  }
  $('#f').naam.addEventListener('input', toonKlantSuggesties);
  $('#f').telefoon.addEventListener('input', toonKlantSuggesties);
  $('#f-klanten').addEventListener('click', (e) => {
    const knop = e.target.closest('[data-klant]');
    if (!knop) return;
    const k = klanten().find((x) => x.sleutel === knop.dataset.klant);
    if (k) vulKlant(k);
    $('#f-stuk').focus();
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
    f.locatie.value = b ? b.locatie || '' : '';
    f.betaald.checked = b ? b.betaald : false;
    f.betaalwijze.value = b ? b.betaalwijze : '';
    f.opmerking.value = b ? b.opmerking : '';
    regels = b ? b.stukken.map((s) => ({ ...s, behandeling: s.behandeling || 'ander' })) : [];
    soorten = new Set(b ? (b.soorten || [b.soort]) : ['Strijk']);
    toonSoorten();
    $('#f-print').checked = autoPrint;
    $('#f-print-label').hidden = Boolean(b);
    $('#f-klanten').hidden = true;
    $('#f-stuk').value = '';
    toonSuggesties();
    toonRegels();
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
    const bon = {
      klant: { naam: f.naam.value, telefoon: f.telefoon.value, email: f.email.value },
      soorten: [...soorten],
      stukken,
      klaarTegen: f.klaarTegen.value,
      locatie: f.locatie.value,
      betaald: f.betaald.checked,
      betaalwijze: f.betaalwijze.value,
      opmerking: f.opmerking.value,
    };
    $('#f-bewaar').disabled = true;
    try {
      const { bon: nieuw } = await doe(bewerkId ? { op: 'wijzig', id: bewerkId, bon } : { op: 'nieuw', bon });
      $('#formulier').close();
      if (!bewerkId) {
        tab = 'binnen';
        $$('.tabs button').forEach((k) => k.setAttribute('aria-selected', String(k.dataset.tab === 'binnen')));
        $('#zoek').value = '';
        toon();
      }
      openDetail(nieuw.id);
      if (!bewerkId && autoPrint) drukAf(nieuw, 'afgifte');
    } catch (err) {
      if (err.message !== 'pin') $('#f-fout').textContent = err.message;
    } finally {
      $('#f-bewaar').disabled = false;
    }
  });

  // ---------- Instellingen ----------
  const maandTekst = (n) => `${n} ${n === 1 ? 'maand' : 'maanden'}`;
  function toonBewaarInfo() {
    const opgehaald = (staat.bonnen || []).filter((b) => b.status === 'opgehaald');
    const oudste = opgehaald.map((b) => b.opgehaaldOp).sort()[0];
    $('#i-bewaar-info').textContent = `Nu bewaard: ${opgehaald.length} opgehaalde bon${opgehaald.length === 1 ? '' : 'nen'}${oudste ? ', de oudste opgehaald op ' + mooiDatum(oudste) : ''}.`;
  }
  function toonPrinter() {
    if (!DESKTOP) return;
    window.crystal.printer().then((naam) => {
      $('#i-printer').textContent = 'Printer: ' + (naam || 'nog niet gekozen, het afdrukvenster komt telkens tevoorschijn');
    });
  }
  function openInstellingen() {
    const m = staat.instellingen?.bewaarMaanden || 12;
    $('#i-bewaar').innerHTML = Array.from({ length: 24 }, (_, i) => i + 1)
      .map((n) => `<option value="${n}"${n === m ? ' selected' : ''}>${maandTekst(n)}</option>`).join('');
    toonBewaarInfo();
    $('#i-print').checked = autoPrint;
    $('#i-fout').textContent = '';
    $('#i-printer').hidden = !DESKTOP;
    $('#i-kies-printer').hidden = !DESKTOP;
    toonPrinter();
    $('#instellingen').showModal();
  }
  $('#instellingen-knop').addEventListener('click', openInstellingen);
  $('#i-bewaar').addEventListener('change', async (e) => {
    const huidig = String(staat.instellingen?.bewaarMaanden || 12);
    const m = Number(e.target.value);
    const grens = new Date();
    grens.setMonth(grens.getMonth() - m);
    const weg = (staat.bonnen || []).filter((b) => b.status === 'opgehaald' && b.opgehaaldOp && b.opgehaaldOp < grens.toISOString()).length;
    if (weg && !confirm(`${weg} opgehaalde bon${weg === 1 ? ' is' : 'nen zijn'} langer dan ${maandTekst(m)} geleden opgehaald en ${weg === 1 ? 'wordt' : 'worden'} nu gewist. Doorgaan?`)) {
      e.target.value = huidig;
      return;
    }
    try {
      await doe({ op: 'instellingen', bewaarMaanden: m });
      toonBewaarInfo();
      $('#i-fout').textContent = '';
    } catch (err) {
      e.target.value = huidig;
      if (err.message !== 'pin') $('#i-fout').textContent = err.message;
    }
  });
  $('#i-print').addEventListener('change', (e) => zetAutoPrint(e.target.checked));
  $('#i-kies-printer').addEventListener('click', () => window.crystal.kiesPrinter().then(toonPrinter));
  $('#i-testbon').addEventListener('click', () => drukAf(testBon(), 'afgifte'));
  $('#i-prijzen').addEventListener('click', () => { $('#instellingen').close(); openPrijslijst(); });

  // ---------- Prijslijst aanpassen ----------
  let werk = null;
  const kolommen = (g) => (g.wassenLabel ? ['strijken', 'wassen'] : ['prijs']);
  const hoofdletter = (t) => t.charAt(0).toUpperCase() + t.slice(1);

  function openPrijslijst() {
    werk = JSON.parse(JSON.stringify(prijslijst()));
    werk.droogkuis = werk.droogkuis || [];
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
    const droog = `<section class="p-groep"><h3>Droogkuis <small>(prijs volgt altijd, na het bekijken van het stuk)</small></h3>
      ${werk.droogkuis.map((n, di) => `<div class="p-rij k0" data-d="${di}">
        <input data-veld="droog" value="${esc(n)}" aria-label="Naam" placeholder="Naam van het stuk">
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
    if (e.target.dataset.veld === 'droog') werk.droogkuis[Number(rij.dataset.d)] = e.target.value;
    else werk.groepen[Number(rij.dataset.g)].stukken[Number(rij.dataset.s)][e.target.dataset.veld] = e.target.value;
  });
  $('#p-groepen').addEventListener('click', (e) => {
    const plus = e.target.closest('[data-plus]');
    if (plus) {
      const droog = plus.dataset.plus === 'droog';
      if (droog) werk.droogkuis.push('');
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
    const droogkuis = werk.droogkuis.map((n) => String(n).trim()).filter(Boolean);
    $('#p-bewaar').disabled = true;
    try {
      await doe({ op: 'prijslijst', prijslijst: { groepen: groepenUit, droogkuis } });
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

  // Sluitknoppen en klikken naast een paneel.
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => {
      if (e.target.closest('[data-sluit]') || e.target === d) d.close();
    });
  });

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
