// Chatwidget van Crystal Services, gedeeld door alle pagina's.
// Vragen gaan naar /api/chat, die met AI antwoordt op basis van onze prijslijst.
// Geen automatische pop-ups: de chat opent pas als de bezoeker erop klikt.
(function(){
  const launcher = document.getElementById('cs-chat-launcher');
  const panel = document.getElementById('cs-chat-panel');
  if (!launcher || !panel) return;
  const closeBtn = document.getElementById('cs-chat-close');
  const body = document.getElementById('cs-chat-body');
  const input = document.getElementById('cs-chat-text');
  const sendBtn = document.getElementById('cs-chat-send');
  const chips = document.getElementById('cs-chips');

  const style = document.createElement('style');
  style.textContent =
    '.cs-msg.typing{display:flex;gap:4px;align-items:center;}' +
    '.cs-msg.typing span{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.35;animation:cs-dot 1s infinite ease-in-out;}' +
    '.cs-msg.typing span:nth-child(2){animation-delay:.15s}.cs-msg.typing span:nth-child(3){animation-delay:.3s}' +
    '@keyframes cs-dot{0%,80%,100%{opacity:.25}40%{opacity:.9}}' +
    '@media (prefers-reduced-motion: reduce){.cs-msg.typing span{animation:none;opacity:.5}}';
  document.head.appendChild(style);

  // Het gesprek tot nu toe, zodat de assistent vervolgvragen begrijpt.
  const gesprek = [];
  let bezig = false;

  function openPanel(){
    panel.classList.add('open');
    launcher.setAttribute('aria-expanded','true');
    input.focus();
  }
  function closePanel(){
    panel.classList.remove('open');
    launcher.setAttribute('aria-expanded','false');
  }
  launcher.addEventListener('click', ()=> panel.classList.contains('open') ? closePanel() : openPanel());
  closeBtn.addEventListener('click', closePanel);

  function addMsg(text, who){
    const div = document.createElement('div');
    div.className = 'cs-msg ' + who;
    div.textContent = text;
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  function typing(){
    const div = document.createElement('div');
    div.className = 'cs-msg bot typing';
    div.setAttribute('aria-label', 'Antwoord wordt opgesteld');
    div.innerHTML = '<span></span><span></span><span></span>';
    body.appendChild(div);
    body.scrollTop = body.scrollHeight;
    return div;
  }

  async function vraag(tekst){
    if (bezig) return;
    bezig = true;
    sendBtn.disabled = true;
    addMsg(tekst, 'user');
    gesprek.push({ rol: 'klant', tekst: tekst });
    const wacht = typing();

    let antwoord;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ berichten: gesprek.slice(-12), pagina: location.pathname }),
      });
      const data = await res.json().catch(()=> ({}));
      antwoord = data.antwoord || data.error;
    } catch (e) {}
    if (!antwoord) {
      antwoord = 'Sorry, er ging iets mis. Ons team helpt u graag persoonlijk verder: bel 0494 40 38 41 of mail info@crystal-services.be.';
    }

    wacht.remove();
    addMsg(antwoord, 'bot');
    gesprek.push({ rol: 'bot', tekst: antwoord });
    bezig = false;
    sendBtn.disabled = false;
  }

  const chipVragen = {
    openingsuren: 'Wat zijn jullie openingsuren?',
    prijzen: 'Wat zijn jullie prijzen?',
    droogkuis: 'Hoeveel kost droogkuis?',
    dienstencheques: 'Kan ik betalen met dienstencheques?',
    diensten: 'Welke diensten bieden jullie aan?',
    contact: 'Hoe kan ik jullie bereiken?',
  };

  chips.addEventListener('click', (e)=>{
    const chip = e.target.closest('.cs-chip');
    if(!chip) return;
    vraag(chipVragen[chip.getAttribute('data-q')] || chip.textContent);
  });

  sendBtn.addEventListener('click', ()=>{
    const v = input.value.trim();
    if(!v || bezig) return;
    input.value = '';
    vraag(v);
  });
  input.addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){ sendBtn.click(); }
  });
})();
