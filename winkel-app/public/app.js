// Crystal Winkel: bonnen voor strijk, was en droogkuis bijhouden.
(function () {
  const WINKEL = {
    naam: 'Crystal Services',
    adres: 'Lodewijk van Berckenlaan 189, 2140 Borgerhout',
    telefoon: '0494 40 38 41',
    uren: 'ma–vr van 8 tot 11 en van 13 tot 17 uur',
  };

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = (v) => '€ ' + Number(v || 0).toFixed(2).replace('.', ',');

  let pin = '';
  try { pin = localStorage.getItem('winkel-pin') || ''; } catch (e) {}
  let staat = { bonnen: [] };
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
    if (res.status === 401) { vergrendel('Verkeerde pincode'); throw new Error('pin'); }
    if (!res.ok) throw new Error(data.error || 'Er ging iets mis');
    return data;
  }

  async function laad(stil) {
    try {
      staat = await api('GET');
      melding('');
      toon();
    } catch (e) {
      if (e.message !== 'pin' && !stil) melding('Kon de bonnen niet laden. Controleer de internetverbinding.');
    }
  }

  async function doe(actie) {
    const data = await api('POST', actie);
    staat = { bonnen: data.bonnen, teller: data.teller, klanten: data.klanten || {} };
    toon();
    return data;
  }

  function melding(t) {
    const el = $('#melding');
    el.textContent = t;
    el.hidden = !t;
  }

  // ---------- Pincode ----------
  function vergrendel(fout) {
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
      staat = await api('GET');
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

  // ---------- Lijst ----------
  function past(b, q) {
    if (!q) return true;
    const t = (b.nr + ' ' + b.klant.naam + ' ' + b.klant.telefoon.replace(/\s/g, '') + ' ' + b.klant.email).toLowerCase();
    return q.toLowerCase().split(/\s+/).every((w) => t.includes(w.replace(/\s/g, '')));
  }

  function toon() {
    const q = $('#zoek').value.trim();
    const bonnen = staat.bonnen || [];
    $('#n-binnen').textContent = bonnen.filter((b) => b.status === 'binnen').length;
    $('#n-klaar').textContent = bonnen.filter((b) => b.status === 'klaar').length;

    // Bij zoeken: alle statussen tonen.
    let lijst = q ? bonnen.filter((b) => past(b, q)) : bonnen.filter((b) => b.status === tab);
    if (!q && tab === 'opgehaald') lijst = lijst.filter((b) => dagenGeleden(b.opgehaaldOp) <= 60);
    const sleutel = (b) =>
      b.status === 'binnen' ? (b.klaarTegen || '9999') + b.binnenOp
      : b.status === 'klaar' ? b.klaarOp
      : b.opgehaaldOp;
    lijst.sort((a, b) => (tab === 'opgehaald' || q ? -1 : 1) * sleutel(a).localeCompare(sleutel(b)));

    $('#lijst').innerHTML = lijst.map(kaart).join('');
    $('#leeg').hidden = lijst.length > 0;
    $('#leeg').textContent = q ? 'Geen bonnen gevonden.' : { binnen: 'Geen bonnen in behandeling.', klaar: 'Niets klaar om op te halen.', opgehaald: 'Nog niets opgehaald de laatste 60 dagen.' }[tab];
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
      label = `<span class="label">${esc(mooiDatum(b.opgehaaldOp))}</span>`;
    }
    const aantal = b.stukken.reduce((n, s) => n + s.aantal, 0);
    return `<li class="bon" data-id="${esc(b.id)}" tabindex="0">
      <div class="nr">${esc(b.nr)}</div>
      <div class="naam">${esc(b.klant.naam)}</div>
      <div class="rechts">${label}<span>${b.totaal ? eur(b.totaal) : ''}${b.betaald ? ' · betaald' : ''}</span></div>
      <div class="info">${esc(b.soort)}${aantal ? ' · ' + aantal + ' stuk' + (aantal > 1 ? 's' : '') : ''}</div>
    </li>`;
  }

  $('#lijst').addEventListener('click', (e) => {
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

  // ---------- Klant verwittigen ----------
  function telefoonIntl(tel) {
    let d = String(tel || '').replace(/[^\d+]/g, '');
    if (d.startsWith('+')) d = d.slice(1);
    else if (d.startsWith('00')) d = d.slice(2);
    else if (d.startsWith('0')) d = '32' + d.slice(1);
    return d.length >= 8 ? d : '';
  }

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

  function openDetail(id, nieuwePin) {
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

    let acties = '';
    if (b.status === 'binnen') {
      acties = `<button class="knop hoofd" data-actie="klaar">Klaar ✓</button>`;
    } else if (b.status === 'klaar') {
      acties = `
        ${tel ? `<a class="knop wa" data-verwittig href="https://wa.me/${tel}?text=${tekst}" target="_blank" rel="noopener">WhatsApp</a>
                 <a class="knop" data-verwittig href="sms:+${tel}?&body=${tekst}">SMS</a>` : ''}
        ${b.klant.email ? `<a class="knop" data-verwittig href="mailto:${esc(b.klant.email)}?subject=${encodeURIComponent('Uw bestelling is klaar')}&body=${tekst}">E-mail</a>` : ''}
        ${!tel && !b.klant.email ? '<p class="tijdlijn">Geen telefoon of e-mail ingevuld: bel of laat de klant zelf langskomen.</p>' : ''}
      </div></div>
      <div class="d-blok">
        <h3>Opgehaald${b.betaald ? '' : ' en betaald met'}</h3>
        <div class="d-knoppen">
        ${b.betaald
          ? '<button class="knop hoofd" data-actie="opgehaald">Opgehaald</button>'
          : ['cash', 'kaart', 'dienstencheques'].map((w) => `<button class="knop hoofd" data-actie="opgehaald" data-betaal="${w}">${w[0].toUpperCase() + w.slice(1)}</button>`).join('')
            + '<button class="knop" data-actie="opgehaald" data-betaal="">Nog niet betaald</button>'}
        <button class="knop" data-actie="binnen">Terug naar in behandeling</button>`;
    } else {
      acties = `<button class="knop" data-actie="klaar">Toch niet opgehaald</button>`;
    }

    $('#d-inhoud').innerHTML = `
      <div class="d-blok">
        <h3>Klant</h3>
        <p><strong>${esc(b.klant.naam)}</strong></p>
        ${b.klant.telefoon ? `<p><a href="tel:${esc(b.klant.telefoon.replace(/\s/g, ''))}">${esc(b.klant.telefoon)}</a></p>` : ''}
        ${b.klant.email ? `<p>${esc(b.klant.email)}</p>` : ''}
      </div>
      <div class="d-blok">
        <h3>${esc(b.soort)}${b.klaarTegen ? ' · klaar tegen ' + esc(mooiDatum(b.klaarTegen)) : ''}</h3>
        ${stukken}
        ${b.opmerking ? `<p style="margin-top:8px">📝 ${esc(b.opmerking)}</p>` : ''}
        <p class="tijdlijn" style="margin-top:8px">${b.betaald ? 'Betaald' + (b.betaalwijze ? ' (' + esc(b.betaalwijze) + ')' : '') : 'Nog niet betaald'}</p>
      </div>
      <div class="d-blok">
        <h3>${b.status === 'klaar' ? 'Klant verwittigen' : 'Status'}</h3>
        <div class="d-knoppen">${acties}</div>
      </div>
      <div class="d-blok">
        <h3>Klantenportaal</h3>
        ${portaalBlok(b, nieuwePin)}
      </div>
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

  // ---------- Afdrukken ----------
  // Afgiftebon: bij het binnenbrengen, wat er binnenkwam, zonder prijzen, met een label voor de mand.
  // Afhaalbon: bij het ophalen, alle stukken met prijs, totaal en betaling.
  function drukAf(b, soortBon = 'afgifte') {
    const afhaal = soortBon === 'afhaal';
    const aantal = b.stukken.reduce((n, s) => n + s.aantal, 0);
    const klaar = b.klaarTegen ? esc(mooiDatum(b.klaarTegen)) : 'wij laten het u weten';
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
        <div class="pr-nr"><span>Bon</span>${esc(b.nr)}</div>`;
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

    $('#afdruk').innerHTML = `<section class="pr-bon">${kop}${inhoud}</section>` + (afhaal ? '' : `
      <div class="pr-knip">✂ hier knippen · label voor de mand</div>
      <section class="pr-label">
        <div class="pr-label-nr">${esc(b.nr)}</div>
        <div class="pr-label-naam">${esc(b.klant.naam)}</div>
        <div class="pr-label-info">${esc(b.soort)}${aantal ? ' · ' + aantal + ' st.' : ''} · klaar ${b.klaarTegen ? esc(mooiDatum(b.klaarTegen)) : '?'}</div>
        ${b.opmerking ? `<div class="pr-label-opm">${esc(b.opmerking)}</div>` : ''}
      </section>`);
    // Wachten tot het logo geladen is, anders ontbreekt het soms op papier.
    const logo = $('#afdruk img');
    if (logo && !logo.complete) {
      logo.onload = logo.onerror = () => window.print();
    } else {
      window.print();
    }
  }

  // ---------- Formulier ----------
  const stukLijst = [];
  for (const g of window.PRIJSLIJST || []) {
    for (const s of g.stukken) {
      if (s.prijs != null) stukLijst.push({ label: `${s.naam} · ${eur(s.prijs)}`, naam: s.naam, prijs: s.prijs, behandeling: 'ander' });
      if (s.strijken != null) stukLijst.push({ label: `${s.naam} · strijken ${eur(s.strijken)}`, naam: `${s.naam} (strijken)`, prijs: s.strijken, behandeling: 'strijk' });
      if (s.wassen != null) stukLijst.push({ label: `${s.naam} · ${g.wassenLabel} ${eur(s.wassen)}`, naam: `${s.naam} (${g.wassenLabel})`, prijs: s.wassen, behandeling: 'was' });
    }
  }
  for (const naam of DROOGKUIS) stukLijst.push({ label: `${naam} · droogkuis (prijs volgt)`, naam, prijs: null, behandeling: 'droogkuis' });
  $('#f-stukken').innerHTML = stukLijst.map((s) => `<option value="${esc(s.label)}"></option>`).join('');

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

  function toonRegels() {
    $('#f-fout').textContent = '';
    $('#f-regels').innerHTML = regels.map((r, i) => `<tr data-i="${i}">
      <td><input class="aantal" type="number" min="1" inputmode="numeric" value="${r.aantal}" aria-label="Aantal" data-veld="aantal"></td>
      <td><input value="${esc(r.naam)}" aria-label="Stuk" data-veld="naam" placeholder="Welk stuk?"></td>
      <td><select data-veld="behandeling" aria-label="Behandeling">${VOLGORDE.map((b) => `<option value="${b}"${r.behandeling === b ? ' selected' : ''}>${BEHANDELING[b]}</option>`).join('')}</select></td>
      <td class="bedrag"><input class="prijs" inputmode="decimal" value="${r.prijs == null ? '' : String(r.prijs.toFixed(2)).replace('.', ',')}" placeholder="volgt" aria-label="Prijs per stuk" data-veld="prijs"></td>
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
    if (!e.target.closest('[data-weg]')) return;
    regels.splice(Number(e.target.closest('tr').dataset.i), 1);
    toonRegels();
  });

  function voegToe(naam, prijs, behandeling) {
    const bestaand = regels.find((r) => r.naam === naam && r.prijs === prijs && r.behandeling === behandeling);
    if (bestaand) bestaand.aantal += 1;
    else regels.push({ naam, prijs, behandeling, aantal: 1 });
    soortVoor(behandeling);
    toonRegels();
  }
  $('#f-stuk').addEventListener('change', (e) => {
    const s = stukLijst.find((x) => x.label === e.target.value);
    if (!s) return;
    voegToe(s.naam, s.prijs, s.behandeling);
    e.target.value = '';
  });
  // Een stuk dat niet in de lijst staat: naam uit het zoekveld, prijs leeg ("volgt").
  function nieuweRegel(behandeling) {
    const naam = $('#f-stuk').value.trim();
    regels.push({ naam, prijs: null, behandeling, aantal: 1 });
    $('#f-stuk').value = '';
    soortVoor(behandeling);
    toonRegels();
    const rij = $$('#f-regels tr').pop();
    const veld = naam ? rij.querySelector('.prijs') : rij.querySelector('[data-veld="naam"]');
    if (veld) veld.focus();
  }
  $('#f-droogkuis').addEventListener('click', () => nieuweRegel('droogkuis'));
  $('#f-ander').addEventListener('click', () => {
    const beh = soorten.size === 1 && soorten.has('Was') ? 'was' : soorten.size === 1 && soorten.has('Strijk') ? 'strijk' : 'ander';
    nieuweRegel(beh);
  });
  $('#f-print').addEventListener('change', (e) => {
    autoPrint = e.target.checked;
    try { localStorage.setItem('winkel-autoprint', autoPrint ? 'ja' : 'nee'); } catch (err) {}
  });

  function openFormulier(b) {
    const f = $('#f');
    f.reset();
    bewerkId = b ? b.id : null;
    $('#f-titel').textContent = b ? `Bon ${b.nr} wijzigen` : 'Nieuwe bon';
    $('#f-bewaar').textContent = b ? 'Bewaren' : 'Bon maken';
    $('#f-fout').textContent = '';
    f.naam.value = b ? b.klant.naam : '';
    f.telefoon.value = b ? b.klant.telefoon : '';
    f.email.value = b ? b.klant.email : '';
    f.klaarTegen.value = b ? b.klaarTegen : plusDagen(2);
    f.betaald.checked = b ? b.betaald : false;
    f.betaalwijze.value = b ? b.betaalwijze : '';
    f.opmerking.value = b ? b.opmerking : '';
    regels = b ? b.stukken.map((s) => ({ ...s, behandeling: s.behandeling || 'ander' })) : [];
    soorten = new Set(b ? (b.soorten || [b.soort]) : ['Strijk']);
    toonSoorten();
    $('#f-print').checked = autoPrint;
    $('#f-print-label').hidden = Boolean(b);
    toonRegels();
    $('#formulier').showModal();
    if (!b) f.naam.focus();
  }

  $('#nieuw').addEventListener('click', () => openFormulier(null));

  $('#f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = $('#f');
    if (!f.naam.value.trim()) { $('#f-fout').textContent = 'Vul de naam van de klant in.'; f.naam.focus(); return; }
    const stukken = regels.filter((r) => r.naam.trim());
    if (soorten.has('Droogkuis') && !stukken.some((r) => r.behandeling === 'droogkuis')) {
      $('#f-fout').textContent = 'Vul bij droogkuis in welke stukken de klant binnenbrengt (knop "+ Droogkuis-stuk").';
      return;
    }
    if (!soorten.size) { $('#f-fout').textContent = 'Kies wat de klant binnenbrengt.'; return; }
    const bon = {
      klant: { naam: f.naam.value, telefoon: f.telefoon.value, email: f.email.value },
      soorten: [...soorten],
      stukken,
      klaarTegen: f.klaarTegen.value,
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

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
})();
