/*
 * Melding over een sluitingsperiode, op alle pagina's.
 * Pas enkel de gegevens hieronder aan. Na de laatste dag verdwijnt alles vanzelf.
 */
(function () {
  var SLUITING = {
    id: 'sluiting-2026-11',
    tot: '2026-11-13',                       // laatste gesloten dag
    titel: 'Gesloten van 9 tot en met 13 november',
    tekst: 'Crystal Services is gesloten van maandag 9 tot en met vrijdag 13 november. Vanaf maandag 16 november staan wij weer voor u klaar.',
    kort: 'Gesloten van 9 t.e.m. 13 november · vanaf 16 november weer open',
  };

  var einde = new Date(SLUITING.tot + 'T23:59:59+01:00');
  if (new Date() > einde) return;

  var css = document.createElement('style');
  css.textContent = [
    '#cs-sluit-balk{background:#081430;color:#fff;text-align:center;font-size:.88rem;padding:9px 16px;line-height:1.4;}',
    '#cs-sluit-balk b{color:#C9A062;}',
    '#cs-sluit{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(8,20,48,.55);}',
    '#cs-sluit[hidden]{display:none;}',
    '#cs-sluit .kaart{background:var(--white,#fff);color:var(--ink,#1B2422);border-radius:16px;max-width:420px;width:100%;padding:28px 26px 22px;box-shadow:0 24px 60px -20px rgba(0,0,0,.5);text-align:center;}',
    '#cs-sluit h2{font-family:"Fraunces",serif;font-size:1.35rem;margin:0 0 10px;color:var(--ink,#1B2422);}',
    '#cs-sluit p{margin:0 0 20px;color:var(--ink-soft,#565B63);line-height:1.55;}',
    '#cs-sluit button{font:inherit;font-weight:600;cursor:pointer;border:none;border-radius:999px;padding:11px 26px;background:var(--navy,#0E1F42);color:#fff;}',
    '@media (prefers-color-scheme: dark){#cs-sluit button{background:var(--ink,#EDEAE3);color:#0D131C;}}',
  ].join('\n');
  document.head.appendChild(css);

  // Altijd zichtbaar: een smalle balk bovenaan de pagina.
  var balk = document.createElement('div');
  balk.id = 'cs-sluit-balk';
  balk.setAttribute('role', 'status');
  balk.innerHTML = '<b>Let op:</b> ' + SLUITING.kort;
  document.body.insertBefore(balk, document.body.firstChild);

  // Eén keer per bezoeker: een venster met de uitleg.
  var gezien = false;
  try { gezien = localStorage.getItem(SLUITING.id) === 'gezien'; } catch (e) {}
  if (gezien) return;

  var venster = document.createElement('div');
  venster.id = 'cs-sluit';
  venster.setAttribute('role', 'dialog');
  venster.setAttribute('aria-modal', 'true');
  venster.setAttribute('aria-labelledby', 'cs-sluit-titel');
  venster.innerHTML = '<div class="kaart"><h2 id="cs-sluit-titel"></h2><p></p><button type="button">OK, begrepen</button></div>';
  venster.querySelector('h2').textContent = SLUITING.titel;
  venster.querySelector('p').textContent = SLUITING.tekst;
  document.body.appendChild(venster);

  function sluit() {
    venster.hidden = true;
    try { localStorage.setItem(SLUITING.id, 'gezien'); } catch (e) {}
  }
  venster.querySelector('button').addEventListener('click', sluit);
  venster.addEventListener('click', function (e) { if (e.target === venster) sluit(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') sluit(); });
  venster.querySelector('button').focus();
})();
