// Alle pagina's van de website. Teksten aanpassen kan hier; bedrijfsgegevens staan in site.config.mjs.
import { readFileSync } from 'node:fs';
import { site } from './site.config.mjs';
import { eigenMerken, andereMerken } from './merken.mjs';
import { esc, pageHero, faqBlock, ctaBand, baseUrl } from './layout.mjs';

const part = name => readFileSync(new URL(`./partials/${name}.html`, import.meta.url), 'utf8');
const plaats = site.gemeente;
const service = (name, description, path) => ({
  '@type': 'Service', name, description, serviceType: name, url: baseUrl() + path,
  provider: { '@id': baseUrl() + '/#bedrijf' }, areaServed: site.werkgebied.map(n => ({ '@type': 'City', name: n })),
});

const checklist = items => `<ul class="checks">${items.map(([t, d]) => `<li><b>${t}</b><span>${d}</span></li>`).join('')}</ul>`;
const merkLinks = () => `<div class="brand-grid">${eigenMerken.map(m => `<a class="brand-card" href="/merken/${m.slug}/"><b>${esc(m.naam)}</b><span>Onderhoud en herstelling →</span></a>`).join('')}</div>
<p class="note">Ook: ${andereMerken.map(esc).join(', ')}. <a href="/merken/">Alle merken</a></p>`;

// ---------------------------------------------------------------- Home
const homeFaq = [
  ['Hoe lang gaat een verwarmingsketel mee?', 'Een goed onderhouden ketel gaat gemiddeld 15 tot 20 jaar mee. Is uw ketel ouder, dan levert vervangen vaak een merkbare besparing op.'],
  ['Hoe vaak moet mijn ketel onderhouden worden?', 'In Vlaanderen moet een gasketel minstens om de twee jaar en een mazoutketel elk jaar onderhouden worden door een erkend technicus. U krijgt daarbij een verbrandingsattest.'],
  ['Welke merken onderhouden jullie?', `Onder meer Vaillant, Remeha, ACV en Junkers (nu Bosch), en ook ${andereMerken.slice(0, 5).join(', ')} en andere gangbare merken.`],
  ['Kan ik online een afspraak maken?', 'Ja. Kies op de afsprakenpagina een dag en een voormiddag of namiddag. De dag voordien bellen we u met een preciezer uur.'],
  ['Wat moet ik doen bij een gasgeur?', 'Draai de gaskraan dicht, gebruik geen schakelaars of open vuur, verlucht en verlaat de woning. Bel daarna de noodlijn van uw netbeheerder of 112.'],
];

function brandStrip() {
  return `<div class="brands">
  <div class="wrap">
    <p class="label">Onderhoud &amp; herstelling van o.a.</p>
    <ul>
      ${eigenMerken.map(m => `<li><a href="/merken/${m.slug}/">${esc(m.kort || m.naam)}</a></li>`).join('')}${andereMerken.slice(0, 5).map(n => `<li>${esc(n)}</li>`).join('')}
    </ul>
  </div>
</div>`;
}

function reviews() {
  if (!site.reviews.length) return '';
  return `<section>
  <div class="wrap">
    <div class="sec-head"><div><p class="label">Klanten</p><h2>Wat klanten zeggen.</h2></div></div>
    <div class="reviews">
      ${site.reviews.map(r => `<figure class="rv rev"><blockquote>“${esc(r.tekst)}”</blockquote><cite>${esc(r.naam)}${r.gemeente ? ' — ' + esc(r.gemeente) : ''}</cite></figure>`).join('\n      ')}
    </div>
  </div>
</section>`;
}

const home = {
  path: '/',
  title: `Ketel onderhoud en herstelling ${plaats} | ${site.naam}`,
  description: `Erkend technicus in ${site.regio}: ketelonderhoud met attest, snelle herstelling bij storing en plaatsing van een nieuwe ketel. Maak online een afspraak.`,
  faq: homeFaq,
  body: [part('hero'), part('facts'), brandStrip(), part('diensten'), part('ketels'), part('keuzehulp'), part('werkwijze'), part('onderhoud'), part('storing'),
    part('over'),
    reviews(), faqBlock(homeFaq), ctaBand()].join('\n\n'),
};

// ---------------------------------------------------------------- Onderhoud
const onderhoudFaq = [
  ['Is ketelonderhoud verplicht?', 'Ja. In Vlaanderen moet een gasketel minstens om de twee jaar en een mazoutketel elk jaar onderhouden worden door een erkend technicus.'],
  ['Hoe lang duurt een onderhoud?', 'Meestal 45 minuten tot een uur. Bij een ketel die lang niet onderhouden is, kan het wat langer duren.'],
  ['Krijg ik een attest?', 'Ja, na het onderhoud krijgt u een verbrandingsattest met de meetresultaten. Bewaar het goed: uw verzekering of de fabrikant kan erom vragen.'],
  ['Wat kost een onderhoud?', 'U krijgt de prijs altijd vooraf. Bel ons of vraag het bij uw afspraak; zo zijn er achteraf geen verrassingen.'],
  ['Moet ik thuis zijn?', 'Ja, iemand moet ons binnenlaten en we overlopen kort het resultaat met u.'],
];
const onderhoud = {
  path: '/ketel-onderhoud/',
  title: `Ketel onderhoud ${plaats}, met attest | ${site.naam}`,
  description: `Wettelijk onderhoud van gas- en mazoutketels in ${site.regio}: reinigen, afstellen, rookgasanalyse en verbrandingsattest. Online een moment kiezen.`,
  faq: onderhoudFaq,
  breadcrumbs: [['/ketel-onderhoud/', 'Ketel onderhoud']],
  schema: [service('Onderhoud verwarmingsketel', 'Periodiek onderhoud van gas- en mazoutketels met verbrandingsattest.', '/ketel-onderhoud/')],
  body: `${pageHero({ crumbs: [['/ketel-onderhoud/', 'Ketel onderhoud']], label: 'Onderhoud', h1: 'Onderhoud van uw verwarmingsketel', lead: `Een goed onderhouden ketel is veiliger, verbruikt minder en gaat langer mee. Wij doen het wettelijk verplichte onderhoud in ${esc(site.regio)}, met verbrandingsattest.`,
    aside: `<div class="rules light"><div><span>Gasketel</span><b>om de 2 jaar</b></div><div><span>Mazoutketel</span><b>elk jaar</b></div><div><span>Duur</span><b>45–60 min</b></div><div><span>Na afloop</span><b>verbrandingsattest</b></div></div>` })}

<section>
  <div class="wrap two-col">
    <div class="prose">
      <h2>Waarom onderhoud nodig is</h2>
      <p>In Vlaanderen is periodiek onderhoud van uw centrale verwarming verplicht. Maar het is vooral in uw eigen voordeel:</p>
      <ul>
        <li><b>Veiligheid.</b> Een slecht afgestelde ketel kan koolstofmonoxide (CO) produceren. Bij het onderhoud meten we de verbranding.</li>
        <li><b>Lager verbruik.</b> Een vuile brander of warmtewisselaar kost energie. Na een reiniging werkt de ketel weer zuinig.</li>
        <li><b>Minder pannes.</b> Slijtage zien we vaak op tijd, voor de ketel midden in de winter uitvalt.</li>
        <li><b>Garantie en verzekering.</b> Fabrikanten en verzekeraars vragen vaak naar het attest.</li>
      </ul>
    </div>
    <div>
      <h2 class="h3">Wat we doen tijdens het onderhoud</h2>
      ${checklist([
        ['Visuele controle', 'van de ketel, de aansluitingen en de rookgasafvoer'],
        ['Reinigen', 'van de brander en de warmtewisselaar'],
        ['Veiligheden nakijken', 'zoals de vlambeveiliging en de druk'],
        ['Rookgasanalyse', 'we meten de verbranding en stellen af waar nodig'],
        ['Waterdruk en expansievat', 'controleren en zo nodig bijvullen'],
        ['Verbrandingsattest', 'u krijgt het resultaat zwart op wit'],
      ])}
    </div>
  </div>
</section>

<section class="bg-paper">
  <div class="wrap">
    <div class="sec-head"><div><p class="label">Merken</p><h2>Wij onderhouden alle gangbare merken.</h2></div><p>Heeft u een ander merk? Bel ons gerust, de kans is groot dat we het ook kennen.</p></div>
    ${merkLinks()}
  </div>
</section>

${faqBlock(onderhoudFaq, { bg: false })}
${ctaBand('Onderhoud inplannen', 'Kies zelf een dag en een voormiddag of namiddag. U krijgt meteen een bevestiging.')}`.replace('href="/afspraak/" class="btn btn-copper"', 'href="/afspraak/?type=Onderhoud" class="btn btn-copper"'),
};

// ---------------------------------------------------------------- Herstelling
const herstellingFaq = [
  ['Hoe snel komen jullie bij een storing?', 'Zo snel mogelijk. Bij een ketel zonder verwarming in de winter proberen we dezelfde of de volgende dag langs te komen. Bel ons daarvoor best rechtstreeks.'],
  ['Mag ik mijn ketel zelf resetten?', 'Eén keer resetten volgens de handleiding mag. Valt de ketel opnieuw uit, reset dan niet steeds opnieuw: er is dan een oorzaak die een technicus moet bekijken.'],
  ['Herstellen jullie alle merken?', 'We herstellen de gangbare merken, zoals Vaillant, Remeha, ACV, Junkers (Bosch), Bulex en Viessmann. Geef het merk en de foutcode door, dan nemen we het juiste onderdeel mee.'],
  ['Is herstellen nog de moeite bij een oude ketel?', 'Dat bekijken we samen. Is de herstelling duur en de ketel ouder dan 15 à 20 jaar, dan zeggen we eerlijk of vervangen verstandiger is.'],
];
const herstelling = {
  path: '/ketel-herstelling/',
  title: `Ketel herstelling en storing ${plaats} | ${site.naam}`,
  description: `Ketel in storing, geen warm water of verwarming in ${site.regio}? Snelle herstelling van Vaillant, Remeha, ACV, Junkers en andere merken. Bel ${site.telefoon}.`,
  faq: herstellingFaq,
  breadcrumbs: [['/ketel-herstelling/', 'Herstelling']],
  schema: [service('Herstelling verwarmingsketel', 'Herstelling van verwarmingsketels bij storing of panne.', '/ketel-herstelling/')],
  body: `${pageHero({ crumbs: [['/ketel-herstelling/', 'Herstelling']], label: 'Storing &amp; herstelling', h1: 'Ketel in storing? Wij herstellen hem.', lead: 'Geen verwarming, geen warm water of een foutcode op het display? Kijk eerst de drie punten hieronder na. Lukt het niet, bel ons dan rechtstreeks.',
    aside: `<div class="rules light"><div><span>Dringend</span><b>bel {{tel}}</b></div><div><span>Weekend</span><b>${site.weekendStoringen ? 'dringende storingen' : 'na afspraak'}</b></div><div><span>Merken</span><b>alle gangbare</b></div></div>` })}

${part('storing').replace('<section id="storing" class="bg-paper">', '<section id="storing">')}

<section class="bg-paper">
  <div class="wrap two-col">
    <div class="prose">
      <h2>Zo pakken we een herstelling aan</h2>
      <p>U belt of plant online een afspraak en geeft het merk en de foutcode door. Zo nemen we meteen de juiste onderdelen mee en is uw ketel meestal in één bezoek hersteld.</p>
      <p>Ter plaatse zoeken we de oorzaak en zeggen we u eerst wat de herstelling kost. Pas als u akkoord bent, beginnen we.</p>
      <p>Is de ketel oud en de herstelling duur? Dan zeggen we dat eerlijk en rekenen we samen uit of <a href="/ketel-vervangen/">een nieuwe ketel</a> verstandiger is.</p>
    </div>
    <div class="alert-box">
      <h2 class="h3">Ruikt u gas?</h2>
      <p>Draai de gaskraan dicht, gebruik geen schakelaars, gsm of open vuur, zet ramen en deuren open en verlaat de woning. Bel daarna buiten de noodlijn van uw netbeheerder of <b>112</b>.</p>
    </div>
  </div>
</section>

<section>
  <div class="wrap">
    <div class="sec-head"><div><p class="label">Merken</p><h2>Herstelling per merk</h2></div><p>Per merk vindt u wat tips om de storing door te geven.</p></div>
    ${merkLinks()}
  </div>
</section>

${faqBlock(herstellingFaq)}
${ctaBand('Herstelling inplannen', 'Is het niet dringend? Kies online een moment. Dringend? Bel ons rechtstreeks.')}`.replace('href="/afspraak/" class="btn btn-copper"', 'href="/afspraak/?type=Herstelling%20%2F%20storing" class="btn btn-copper"'),
};

// ---------------------------------------------------------------- Vervangen
const vervangenFaq = [
  ['Wanneer vervang ik mijn ketel best?', 'Als hij ouder is dan 15 à 20 jaar, vaak in panne valt, veel verbruikt of als onderdelen moeilijk te vinden zijn. Liefst plant u de vervanging in buiten het stookseizoen.'],
  ['Hoe lang duurt de plaatsing?', 'Een vervanging van gas naar gas gebeurt meestal op één werkdag. Bij een overstap naar een ander systeem bespreken we de planning vooraf.'],
  ['Heb ik recht op een premie?', 'Voor sommige installaties, zoals een hybride warmtepomp, bestaan premies. De voorwaarden veranderen regelmatig; wij helpen u nagaan waar u recht op heeft.'],
  ['Is het plaatsbezoek gratis?', 'Ja. We komen kijken, rekenen uit wat past en u krijgt een vaste prijs, zonder verplichting.'],
];
const vervangen = {
  path: '/ketel-vervangen/',
  title: `Nieuwe ketel plaatsen in ${plaats} | ${site.naam}`,
  description: `Oude ketel vervangen door een zuinige condensatieketel of hybride warmtepomp in ${site.regio}. Gratis plaatsbezoek, vaste prijs, meestal op één dag.`,
  faq: vervangenFaq,
  breadcrumbs: [['/ketel-vervangen/', 'Nieuwe ketel']],
  schema: [service('Plaatsing en vervanging van verwarmingsketels', 'Plaatsing van condensatieketels, mazoutketels en hybride warmtepompen.', '/ketel-vervangen/')],
  body: `${pageHero({ crumbs: [['/ketel-vervangen/', 'Nieuwe ketel']], label: 'Plaatsing &amp; vervanging', h1: 'Een nieuwe ketel, correct geplaatst', lead: 'Is uw ketel oud, valt hij vaak uit of verbruikt hij te veel? We rekenen uit welke ketel bij uw woning past en plaatsen hem meestal op één dag.',
    aside: `<div class="rules light"><div><span>Plaatsbezoek</span><b>gratis</b></div><div><span>Prijs</span><b>vast, vooraf</b></div><div><span>Plaatsing</span><b>meestal 1 dag</b></div><div><span>Oude ketel</span><b>nemen we mee</b></div></div>` })}

<section>
  <div class="wrap two-col">
    <div class="prose">
      <h2>Wanneer is vervangen slim?</h2>
      <ul>
        <li>Uw ketel is ouder dan 15 à 20 jaar.</li>
        <li>Hij valt de laatste jaren geregeld in panne.</li>
        <li>Uw verbruik ligt hoog in vergelijking met gelijkaardige woningen.</li>
        <li>Onderdelen zijn moeilijk of niet meer te krijgen.</li>
      </ul>
      <p>Twijfelt u? Tijdens een onderhoud of plaatsbezoek zeggen we eerlijk of herstellen of vervangen verstandiger is.</p>
    </div>
    <div>
      <h2 class="h3">Wat is inbegrepen</h2>
      ${checklist([
        ['Plaatsbezoek', 'we bekijken uw woning en berekenen het juiste vermogen'],
        ['Vaste offerte', 'inclusief plaatsing, aansluiting en afvoer van de oude ketel'],
        ['Plaatsing', 'meestal op één dag, netjes afgewerkt'],
        ['Uitleg', 'we leggen de bediening en de thermostaat rustig uit'],
        ['Premies', 'we helpen nagaan of u ergens recht op heeft'],
      ])}
    </div>
  </div>
</section>

${part('ketels')}
${part('keuzehulp')}
${part('werkwijze').replace('<section style="padding-top:0">', '<section class="bg-paper">')}
${faqBlock(vervangenFaq, { bg: false })}
${ctaBand('Gratis plaatsbezoek aanvragen', 'Kies een moment voor het plaatsbezoek, of vraag eerst een prijs via het contactformulier.')}`.replace('href="/afspraak/" class="btn btn-copper"', 'href="/afspraak/?type=Plaatsbezoek%20nieuwe%20ketel" class="btn btn-copper"'),
};

// ---------------------------------------------------------------- Merken
const merken = {
  path: '/merken/',
  title: `Vaillant, Remeha, ACV, Junkers en meer | ${site.naam}`,
  description: `Wij onderhouden en herstellen ketels van Vaillant, Remeha, ACV, Junkers (Bosch), ${andereMerken.slice(0, 4).join(', ')} en andere merken in ${site.regio}.`,
  breadcrumbs: [['/merken/', 'Merken']],
  body: `${pageHero({ crumbs: [['/merken/', 'Merken']], label: 'Merken', h1: 'Merken die wij onderhouden en herstellen', lead: 'We werken aan alle gangbare merken van gas- en mazoutketels. Kies uw merk voor meer uitleg.' })}

<section>
  <div class="wrap">
    <div class="brand-list">
      ${eigenMerken.map(m => `<article class="brand-row">
        <div><h2><a href="/merken/${m.slug}/">${esc(m.naam)}</a></h2><p>${esc(m.intro)}</p></div>
        <a class="btn btn-line" href="/merken/${m.slug}/">${esc(m.kort || m.naam)}: onderhoud &amp; herstelling</a>
      </article>`).join('\n      ')}
    </div>
  </div>
</section>

<section class="bg-paper">
  <div class="wrap">
    <div class="sec-head"><div><p class="label">Andere merken</p><h2>Ook deze merken onderhouden en herstellen we</h2></div><p>Staat uw merk er niet bij? Bel ons gerust. We zeggen u meteen of we kunnen helpen.</p></div>
    <ul class="pill-list">${andereMerken.map(n => `<li>${esc(n)}</li>`).join('')}</ul>
    <p class="note">Merknamen zijn eigendom van de fabrikanten. Wij zijn een onafhankelijke technicus en geen officiële dealer.</p>
  </div>
</section>
${ctaBand()}`,
};

const merkPages = eigenMerken.map(m => {
  const k = m.kort || m.naam;
  const faq = [
    [`Onderhouden jullie elke ${k}-ketel?`, `We onderhouden de gangbare gas- en mazoutketels van ${m.naam}, ook oudere toestellen. Twijfelt u over uw type? Stuur een foto van het typeplaatje of bel ons.`],
    [`Hoe vaak moet een ${k}-ketel onderhouden worden?`, 'Net als elke ketel: in Vlaanderen een gasketel minstens om de twee jaar en een mazoutketel elk jaar, met verbrandingsattest.'],
    [`Mijn ${k} geeft een foutcode. Wat nu?`, 'Noteer de code en kijk de waterdruk na. Eén keer resetten volgens de handleiding mag. Komt de fout terug, bel ons dan en geef de code door.'],
    [`Kan ik mijn ${k} vervangen door een ander merk?`, 'Ja. Bij een vervanging kiezen we samen de ketel die het best bij uw woning past, van hetzelfde of een ander merk.'],
  ];
  const path = `/merken/${m.slug}/`;
  return {
    path,
    title: `${k} onderhoud en herstelling ${plaats} | ${site.naam}`,
    description: `Onderhoud en herstelling van ${m.naam}-ketels in ${site.regio}. Wettelijk onderhoud met attest, snelle hulp bij storing. Online afspraak maken.`,
    faq,
    breadcrumbs: [['/merken/', 'Merken'], [path, m.naam]],
    schema: [service(`Onderhoud en herstelling ${m.naam}`, `Onderhoud en herstelling van ${m.naam}-ketels.`, path)],
    body: `${pageHero({ crumbs: [['/merken/', 'Merken'], [path, m.naam]], label: 'Merken', h1: `${esc(m.naam)}: onderhoud en herstelling`, lead: esc(m.intro) })}

<section>
  <div class="wrap two-col">
    <div class="prose">
      <h2>Wat we voor uw ${esc(k)} doen</h2>
      <ul>
        <li><a href="/ketel-onderhoud/"><b>Onderhoud</b></a> met reiniging, afstelling en verbrandingsattest.</li>
        <li><a href="/ketel-herstelling/"><b>Herstelling</b></a> bij storing, een foutcode of geen warm water.</li>
        <li><a href="/ketel-vervangen/"><b>Vervanging</b></a> als de ketel versleten is, door een ${esc(k)} of een ander merk.</li>
      </ul>
      <p>${esc(m.groep)}</p>
    </div>
    <div class="tip-box">
      <p class="label">Tip</p>
      <p>${esc(m.tip)}</p>
    </div>
  </div>
</section>

${faqBlock(faq, { title: `Vragen over ${esc(k)}-ketels` })}

<section>
  <div class="wrap">
    <p class="note">Andere merken: ${eigenMerken.filter(x => x !== m).map(x => `<a href="/merken/${x.slug}/">${esc(x.naam)}</a>`).join(', ')} en <a href="/merken/">meer</a>. ${esc(m.naam)} is een merk van de fabrikant; wij zijn een onafhankelijke technicus.</p>
  </div>
</section>
${ctaBand(`Afspraak voor uw ${esc(k)}`)}`,
  };
});

// ---------------------------------------------------------------- Over ons
const overOns = {
  path: '/over-ons/',
  title: `Over ons – verwarmingstechnicus ${plaats} | ${site.naam}`,
  description: `${site.naam} is een lokale verwarmingstechnicus in ${site.regio}. U krijgt de technicus zelf aan de lijn, eerlijk advies en een prijs vooraf.`,
  breadcrumbs: [['/over-ons/', 'Over ons']],
  body: `${pageHero({ crumbs: [['/over-ons/', 'Over ons']], label: 'Over ons', h1: 'Een vakman uit de buurt, geen callcenter', lead: 'U belt, en u krijgt de technicus zelf aan de lijn. Dezelfde persoon komt langs voor het plaatsbezoek, de plaatsing en het onderhoud achteraf.' })}
${part('over').replace(/<h2>.*?<\/h2>/, '<h2>Waarom klanten bij ons blijven</h2>')}
<section class="bg-paper">
  <div class="wrap">
    <div class="sec-head"><div><p class="label">Werkgebied</p><h2>Waar we werken</h2></div><p>We komen langs in ${esc(site.regio)}. Woont u net buiten deze gemeenten? Bel ons gerust.</p></div>
    <ul class="pill-list">${site.werkgebied.map(g => `<li>${esc(g)}</li>`).join('')}</ul>
  </div>
</section>
${ctaBand()}`,
};

// ---------------------------------------------------------------- Afspraak
const afspraak = {
  path: '/afspraak/',
  title: `Afspraak maken voor uw ketel | ${site.naam}`,
  description: `Plan online een afspraak voor onderhoud, herstelling of een plaatsbezoek in ${site.regio}. Kies een dag en een voormiddag of namiddag.`,
  breadcrumbs: [['/afspraak/', 'Afspraak maken']],
  body: `${pageHero({ crumbs: [['/afspraak/', 'Afspraak maken']], label: 'Afspraak', h1: 'Plan zelf uw afspraak in', lead: 'Kies een dag en of u ons liever in de voormiddag of de namiddag ziet komen. De dag voordien bellen we u met een preciezer uur.', ctas: false })}
${part('afspraak').replace(/<div class="sec-head">[\s\S]*?<\/p>\s*<\/div>\s*/, '').replace('<section id="afspraak">', '<section id="afspraak" style="padding-top:48px">').replace(/href="\/privacy\.html"/g, 'href="/privacy/"')}`,
};

// ---------------------------------------------------------------- Contact
const contact = {
  path: '/contact/',
  title: `Contact en offerte | ${site.naam}`,
  description: `Contacteer ${site.naam} voor een offerte of vraag over uw verwarmingsketel. Bel ${site.telefoon} of vul het formulier in, we antwoorden binnen één werkdag.`,
  breadcrumbs: [['/contact/', 'Contact']],
  body: `${pageHero({ crumbs: [['/contact/', 'Contact']], label: 'Contact', h1: 'Contact en offerte', lead: 'Bel ons, mail ons of vul het formulier in. We antwoorden binnen één werkdag.', ctas: false })}
${part('contact').replace(/<p class="label">Contact<\/p>\s*<h2>.*?<\/h2>/, '<h2>Vraag uw gratis offerte aan</h2>').replace(/href="\/privacy\.html"/g, 'href="/privacy/"')
  .replace(/<ul>\s*<li>Antwerpen<\/li>[\s\S]*?<\/ul>/, `<ul>${site.werkgebied.map(g => `<li>${esc(g)}</li>`).join('')}</ul>`)
  .replace('<div class="ci"><span>Werkgebied</span><div>{{regio}}</div></div>', `<div class="ci"><span>Werkgebied</span><div>{{regio}}</div></div>${site.straat ? `<div class="ci"><span>Adres</span><div>${esc(site.straat)}, ${esc(site.postcode)} ${esc(site.gemeente)}</div></div>` : ''}`)}`,
};

// ---------------------------------------------------------------- Privacy
const privacy = {
  path: '/privacy/',
  title: `Privacyverklaring | ${site.naam}`,
  description: `Hoe ${site.naam} omgaat met de gegevens die u invult bij een afspraak of offerte-aanvraag.`,
  noindex: true,
  body: `${pageHero({ label: 'Privacy', h1: 'Privacyverklaring', lead: 'Laatst bijgewerkt: november 2026.', ctas: false })}
<section style="padding-top:24px">
  <div class="wrap prose narrow">
    <h2>Wie zijn wij?</h2>
    <p>${esc(site.naam)}${site.straat ? ', ' + esc(site.straat) + ', ' + esc(site.postcode) + ' ' + esc(site.gemeente) : ', ' + esc(site.gemeente)}, btw ${esc(site.btw)}, is verantwoordelijk voor de verwerking van uw persoonsgegevens. U bereikt ons op {{tel}} of via {{email}}.</p>
    <h2>Welke gegevens verzamelen we?</h2>
    <p>Alleen wat u zelf invult wanneer u een afspraak maakt of een offerte vraagt: naam, telefoonnummer, e-mailadres, het adres van de werken en de informatie die u over uw installatie geeft.</p>
    <h2>Waarvoor gebruiken we ze?</h2>
    <ul><li>om uw afspraak in te plannen en u daarover te contacteren;</li><li>om een offerte op te maken en de werken uit te voeren;</li><li>om u te herinneren aan het volgende wettelijke onderhoud, als u daar klant voor bent.</li></ul>
    <p>De rechtsgrond is de uitvoering van een (pre)contractuele vraag die u zelf stelt. We gebruiken uw gegevens niet voor reclame en verkopen ze nooit door.</p>
    <h2>Waar worden ze bewaard?</h2>
    <p>De website draait bij Netlify. Afspraken worden opgeslagen in een beveiligde opslag in de Europese Unie (Frankfurt). Berichten via de formulieren worden via Netlify aan ons gemaild. Alleen wij hebben toegang tot uw gegevens.</p>
    <h2>Hoe lang bewaren we ze?</h2>
    <p>Zolang dat nodig is voor de opvolging, en maximaal 2 jaar na het laatste contact, tenzij een wettelijke bewaarplicht (bijvoorbeeld voor facturen) langer is.</p>
    <h2>Cookies</h2>
    <p>Deze website gebruikt geen tracking- of advertentiecookies en laadt geen lettertypes of scripts van andere bedrijven.</p>
    <h2>Uw rechten</h2>
    <p>U kunt altijd vragen om uw gegevens in te zien, te verbeteren of te laten verwijderen. Bent u niet tevreden over hoe we met uw gegevens omgaan, dan kunt u klacht indienen bij de Gegevensbeschermingsautoriteit (<a href="https://www.gegevensbeschermingsautoriteit.be" rel="noopener">gegevensbeschermingsautoriteit.be</a>).</p>
  </div>
</section>`,
};

// ---------------------------------------------------------------- 404
const notFound = {
  path: '/404.html', file: '404.html', noindex: true, sitemap: false,
  title: `Pagina niet gevonden | ${site.naam}`,
  description: 'Deze pagina bestaat niet (meer). Ga naar de startpagina of maak meteen een afspraak voor uw ketel.',
  body: `${pageHero({ h1: 'Deze pagina bestaat niet', lead: 'Misschien is ze verhuisd. Probeer een van deze:', ctas: false })}
<section style="padding-top:0"><div class="wrap"><ul class="pill-list"><li><a href="/">Startpagina</a></li><li><a href="/afspraak/">Afspraak maken</a></li><li><a href="/ketel-onderhoud/">Onderhoud</a></li><li><a href="/ketel-herstelling/">Herstelling</a></li><li><a href="/contact/">Contact</a></li></ul></div></section>`,
};

export const pages = [home, onderhoud, herstelling, vervangen, merken, ...merkPages, overOns, afspraak, contact, privacy, notFound];
