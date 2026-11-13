// Gedeelde opmaak: <head> met SEO-gegevens, kop, voet en gestructureerde gegevens (JSON-LD).
import { site, isVoorbeeld } from './site.config.mjs';
import { eigenMerken } from './merken.mjs';

export const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** {{tel}}, {{email}} … invullen vanuit de bedrijfsgegevens. */
export function fill(html) {
  const v = {
    naam: esc(site.naam), tel: esc(site.telefoon), telLink: esc(site.telefoonLink), email: esc(site.email),
    regio: esc(site.regio), urenJson: JSON.stringify(site.uren), weekend: site.weekendStoringen ? '<br>Storingen ook in het weekend' : '', btw: esc(site.btw), gemeente: esc(site.gemeente), openingsuren: esc(site.openingsuren),
  };
  return html.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in v ? v[k] : m));
}

export const NAV = [
  ['/ketel-onderhoud/', 'Onderhoud'],
  ['/ketel-herstelling/', 'Herstelling'],
  ['/ketel-vervangen/', 'Nieuwe ketel'],
  ['/merken/', 'Merken'],
  ['/over-ons/', 'Over ons'],
  ['/contact/', 'Contact'],
];

function header(path) {
  const links = NAV.map(([href, label]) =>
    `<a href="${href}"${path.startsWith(href) ? ' aria-current="page" class="active"' : ''}>${label}</a>`).join('\n      ');
  return `<div class="topbar">
  <div class="wrap">
    <span>Storing aan uw ketel? Bel <a href="tel:{{telLink}}">{{tel}}</a>${site.weekendStoringen ? ' – ook in het weekend voor dringende gevallen.' : '.'}</span>
    <span class="status" id="status"><i></i><span>{{openingsuren}}</span></span>
  </div>
</div>

<header class="site">
  <div class="wrap">
    <a href="/" class="logo" aria-label="{{naam}} – startpagina">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><rect width="34" height="34" rx="4" fill="#17191b"/><path fill="none" d="M10 8l7 16 7-16" stroke="#fff" stroke-width="2.6" stroke-linecap="square"/><circle cx="17" cy="28.5" r="2.2" fill="#a8592a"/></svg>
      <span>{{naam}}<small>${esc(site.slogan)}</small></span>
    </a>
    <nav class="main" id="nav" aria-label="Hoofdmenu">
      ${links}
      <a href="/afspraak/" class="nav-cta">Afspraak maken</a>
    </nav>
    <div class="head-right">
      <a class="head-phone" href="tel:{{telLink}}"><span>Bel ons</span><b>{{tel}}</b></a>
      <a href="/afspraak/" class="btn btn-primary">Afspraak maken</a>
    </div>
    <button class="menu-btn" aria-label="Menu openen" aria-expanded="false" aria-controls="nav" id="menuBtn">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h18M3 12h18M3 17h18"/></svg>
    </button>
  </div>
</header>`;
}

function footer() {
  return `<footer>
  <div class="wrap">
    <div class="cols">
      <div>
        <div class="logo">{{naam}}</div>
        <p>Plaatsing, onderhoud en herstelling van verwarmingsketels in {{regio}}. Erkend technicus gas en mazout.</p>
      </div>
      <div><h4>Diensten</h4><ul><li><a href="/ketel-onderhoud/">Ketel onderhoud</a></li><li><a href="/ketel-herstelling/">Herstelling &amp; storing</a></li><li><a href="/ketel-vervangen/">Nieuwe ketel plaatsen</a></li><li><a href="/afspraak/">Afspraak maken</a></li></ul></div>
      <div><h4>Merken</h4><ul>${eigenMerken.map(m => `<li><a href="/merken/${m.slug}/">${esc(m.naam)}</a></li>`).join('')}<li><a href="/merken/">Alle merken</a></li></ul></div>
      <div><h4>Contact</h4><ul><li><a href="tel:{{telLink}}">{{tel}}</a></li><li><a href="mailto:{{email}}">{{email}}</a></li><li>{{openingsuren}}</li><li>BTW {{btw}}</li><li><a href="/privacy/">Privacyverklaring</a></li></ul></div>
    </div>
    <div class="bottom"><span>© <span id="yr"></span> {{naam}}</span><span>{{regio}}</span></div>
  </div>
</footer>

<a href="tel:{{telLink}}" class="btn btn-primary call-fab">Bel {{tel}}</a>`;
}

export function baseUrl() {
  return (site.domein || process.env.URL || 'https://example.netlify.app').replace(/\/$/, '');
}

export function businessSchema() {
  const url = baseUrl();
  const b = {
    '@type': 'HVACBusiness', '@id': url + '/#bedrijf', name: site.naam, url: url + '/',
    telephone: site.telefoonLink, email: site.email,
    image: url + '/assets/og.png', logo: url + '/assets/icon-512.png',
    areaServed: site.werkgebied.map(name => ({ '@type': 'City', name })),
    address: { '@type': 'PostalAddress', addressLocality: site.gemeente, postalCode: site.postcode, addressCountry: 'BE', ...(site.straat ? { streetAddress: site.straat } : {}) },
    openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: site.uren.dagen.map(d => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][d - 1]), opens: site.uren.van, closes: site.uren.tot }],
    vatID: site.btw,
  };
  return b;
}

/** Volledige pagina. page = { path, title, description, body, faq?, breadcrumbs?, schema?, noindex? } */
export function render(page) {
  const url = baseUrl() + page.path;
  const noindex = isVoorbeeld || page.noindex;
  const graph = [businessSchema()];
  if (page.breadcrumbs) {
    graph.push({ '@type': 'BreadcrumbList', itemListElement: [['/', 'Home'], ...page.breadcrumbs].map(([p, name], i) => ({ '@type': 'ListItem', position: i + 1, name, item: baseUrl() + p })) });
  }
  if (page.faq && page.faq.length) {
    graph.push({ '@type': 'FAQPage', mainEntity: page.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
  }
  if (page.schema) graph.push(...page.schema);
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');

  return fill(`<!doctype html>
<html lang="nl-BE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}">
<link rel="canonical" href="${esc(url)}">
${noindex ? '<meta name="robots" content="noindex, nofollow">' : '<meta name="robots" content="index, follow, max-image-preview:large">'}
<meta name="theme-color" content="#17191b">
<meta property="og:type" content="website">
<meta property="og:locale" content="nl_BE">
<meta property="og:site_name" content="${esc(site.naam)}">
<meta property="og:title" content="${esc(page.title)}">
<meta property="og:description" content="${esc(page.description)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(baseUrl())}/assets/og.png">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/icon-192.png">
<link rel="preload" href="/assets/fonts/schibsted-grotesk-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/schibsted-grotesk-latin-700-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css?v=${page.cssVersion || '1'}">
<script type="application/ld+json">${ld}</script>
</head>
<body data-email="{{email}}">
<a class="skip" href="#inhoud">Naar de inhoud</a>
<script>document.documentElement.classList.add("js")</script>
${header(page.path)}

<main id="inhoud">
${page.body}
</main>

${footer()}
<script src="/assets/site.js?v=${page.cssVersion || '1'}" defer></script>
</body>
</html>
`);
}

/** Paginakop voor binnenpagina's (met broodkruimel en één h1). */
export function pageHero({ crumbs = [], label, h1, lead, ctas = true, aside = '' }) {
  const bc = crumbs.length ? `<nav class="crumbs" aria-label="Kruimelpad"><a href="/">Home</a>${crumbs.map(([p, n], i) => i === crumbs.length - 1 ? ` <span>/</span> <span aria-current="page">${esc(n)}</span>` : ` <span>/</span> <a href="${p}">${esc(n)}</a>`).join('')}</nav>` : '';
  return `<section class="page-hero">
  <div class="wrap">
    <div class="ph-text">
      ${bc}
      ${label ? `<p class="label"><b>●</b>&nbsp; ${label}</p>` : ''}
      <h1>${h1}</h1>
      ${lead ? `<p class="lead">${lead}</p>` : ''}
      ${ctas ? `<div class="cta"><a href="/afspraak/" class="btn btn-primary">Afspraak maken</a><a href="tel:{{telLink}}" class="btn btn-line">Bel {{tel}}</a></div>` : ''}
    </div>
    ${aside ? `<aside class="ph-aside">${aside}</aside>` : ''}
  </div>
</section>`;
}

export function faqBlock(faq, { title = 'Veelgestelde vragen', intro = 'Staat uw vraag er niet bij? Bel of mail ons gerust.', bg = true } = {}) {
  return `<section id="faq"${bg ? ' class="bg-paper"' : ''}>
  <div class="wrap faq">
    <div class="intro">
      <p class="label">Vragen</p>
      <h2>${title}</h2>
      <p>${intro}</p>
    </div>
    <div class="rv faq-list">
      ${faq.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n      ')}
    </div>
  </div>
</section>`;
}

export function ctaBand(title = 'Klaar om af te spreken?', text = 'Kies zelf een voormiddag of namiddag die u past. De dag voordien bellen we u met een preciezer uur.') {
  return `<section class="cta-band">
  <div class="wrap">
    <div><h2>${title}</h2><p>${text}</p></div>
    <div class="cta"><a href="/afspraak/" class="btn btn-copper">Afspraak maken</a><a href="tel:{{telLink}}" class="btn btn-ghost-light">Bel {{tel}}</a></div>
  </div>
</section>`;
}
