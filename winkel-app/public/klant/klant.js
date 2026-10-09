// Klantenportaal: de klant ziet hier enkel de eigen bonnen.
(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const eur = (v) => '€ ' + Number(v || 0).toFixed(2).replace('.', ',');
  const datum = (iso) => iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';

  let token = '';
  try { token = localStorage.getItem('klant-token') || ''; } catch (e) {}

  function bewaarToken(t) {
    token = t;
    try { t ? localStorage.setItem('klant-token', t) : localStorage.removeItem('klant-token'); } catch (e) {}
  }

  function toonSlot(fout) {
    $('#app').hidden = true;
    $('#slot').hidden = false;
    $('#slot-fout').textContent = fout || '';
  }

  function bonHtml(b) {
    const aantal = b.stukken.reduce((n, s) => n + s.aantal, 0);
    let status;
    if (b.status === 'klaar') status = '<span class="label ok">Klaar om op te halen</span>';
    else if (b.status === 'binnen') status = `<span class="label vandaag">In behandeling</span>`;
    else status = `<span class="label">Opgehaald</span>`;
    const sub = b.status === 'binnen' && b.klaarTegen
      ? 'Klaar tegen ' + datum(b.klaarTegen)
      : b.status === 'opgehaald' ? 'Opgehaald ' + datum(b.opgehaaldOp) : 'Binnengebracht ' + datum(b.binnenOp);
    const stukken = b.stukken.length
      ? `<table class="stukken"><tbody>${b.stukken.map((s) => `<tr><td>${s.aantal} ×</td><td>${esc(s.naam)}</td><td class="bedrag">${s.prijs == null ? 'prijs volgt' : eur(s.aantal * s.prijs)}</td></tr>`).join('')}</tbody>
         <tfoot><tr><td colspan="2">Totaal</td><td class="bedrag">${eur(b.totaal)}${b.prijsOpen ? ' + prijs volgt' : ''}</td></tr></tfoot></table>`
      : '<p class="tijdlijn">De stukken worden geteld bij het strijken.</p>';
    return `<details class="k-bon ${b.status === 'klaar' ? 'klaar' : ''}">
      <summary>
        <span class="titel">Bon ${esc(b.nr)} · ${esc(b.soort)}</span>
        <span class="rechts">${status}<span>${b.prijsOpen ? 'prijs volgt' : b.totaal ? eur(b.totaal) + (b.betaald ? ' · betaald' : ' · nog te betalen') : ''}</span></span>
        <span class="sub">${esc(sub)}${aantal ? ' · ' + aantal + ' stuk' + (aantal > 1 ? 's' : '') : ''}</span>
      </summary>
      <div class="meer">
        ${stukken}
        <p class="tijdlijn" style="margin-top:8px">Binnengebracht: ${esc(datum(b.binnenOp))}${b.klaarOp ? '<br>Klaar: ' + esc(datum(b.klaarOp)) : ''}${b.opgehaaldOp ? '<br>Opgehaald: ' + esc(datum(b.opgehaaldOp)) : ''}</p>
      </div>
    </details>`;
  }

  function toon(data) {
    $('#slot').hidden = true;
    $('#app').hidden = false;
    const voornaam = (data.naam || '').split(' ')[0];
    $('#k-naam').textContent = voornaam ? `Dag ${voornaam}` : 'Mijn bonnen';
    const groepen = [
      ['Klaar om op te halen', data.bonnen.filter((b) => b.status === 'klaar')],
      ['In behandeling', data.bonnen.filter((b) => b.status === 'binnen')],
      ['Eerder', data.bonnen.filter((b) => b.status === 'opgehaald')],
    ];
    const html = groepen.filter(([, lijst]) => lijst.length)
      .map(([titel, lijst]) => `<section class="k-sectie"><h2>${titel}</h2>${lijst.map(bonHtml).join('')}</section>`).join('');
    $('#k-lijst').innerHTML = html || '<p class="leeg">Er staan nog geen bonnen op uw naam.</p>';
  }

  async function laad() {
    try {
      const res = await fetch('/api/klant', { headers: { Authorization: 'Bearer ' + token }, cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) { bewaarToken(''); return toonSlot(); }
      if (!res.ok) throw new Error(data.error);
      $('#melding').hidden = true;
      toon(data);
    } catch (e) {
      $('#melding').textContent = 'Kon uw bonnen niet laden. Controleer de internetverbinding.';
      $('#melding').hidden = false;
    }
  }

  $('#slot-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const knop = e.target.querySelector('button');
    knop.disabled = true;
    $('#slot-fout').textContent = '';
    try {
      const res = await fetch('/api/klant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telefoon: $('#slot-gsm').value, pin: $('#slot-pin').value.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Aanmelden lukte niet');
      bewaarToken(data.token);
      $('#slot-pin').value = '';
      toon(data);
    } catch (err) {
      $('#slot-fout').textContent = err.message;
    } finally {
      knop.disabled = false;
    }
  });

  $('#afmelden').addEventListener('click', () => { bewaarToken(''); toonSlot(); });

  if (token) { $('#app').hidden = false; laad(); } else { toonSlot(); }
  document.addEventListener('visibilitychange', () => { if (token && document.visibilityState === 'visible') laad(); });
})();
