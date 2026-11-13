// Bouwt de website naar dist/. Gebruik: node build.mjs  (Netlify doet dit automatisch)
import { mkdirSync, rmSync, writeFileSync, readFileSync, cpSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { site, isVoorbeeld } from './src/site.config.mjs';
import { pages } from './src/pages.mjs';
import { render, fill, baseUrl } from './src/layout.mjs';

const OUT = process.argv[2] || 'dist';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// 1. Vaste bestanden (lettertypes, iconen, beheer-app)
cpSync('src/static', OUT, { recursive: true });

// 2. Stijl en script
const fonts = [['Schibsted Grotesk', 'schibsted-grotesk', [400, 500, 600, 700, 800]], ['IBM Plex Mono', 'ibm-plex-mono', [400, 500]]]
  .flatMap(([fam, file, ws]) => ws.map(w => `@font-face{font-family:"${fam}";font-style:normal;font-weight:${w};font-display:swap;src:url(/assets/fonts/${file}-latin-${w}-normal.woff2) format("woff2")}`)).join('\n');
const css = fonts + '\n' + readFileSync('src/partials/css.html', 'utf8') + readFileSync('src/extra.css', 'utf8');
const js = fill(readFileSync('src/partials/script.html', 'utf8'));
const version = createHash('sha1').update(css + js).digest('hex').slice(0, 8);
writeFileSync(join(OUT, 'assets/site.css'), css);
writeFileSync(join(OUT, 'assets/site.js'), js);

// 3. Pagina's
for (const p of pages) {
  const file = p.file || join(p.path.replace(/^\//, ''), 'index.html');
  mkdirSync(dirname(join(OUT, file)), { recursive: true });
  writeFileSync(join(OUT, file), render({ ...p, cssVersion: version }));
}

// 4. Verborgen Netlify-formulieren (zodat Netlify ze herkent bij het deployen)
writeFileSync(join(OUT, 'formulieren.html'), `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Formulieren</title></head><body>
<form name="offerte" data-netlify="true" netlify-honeypot="website" hidden><input name="naam"><input name="tel"><input name="email"><input name="dienst"><input name="postcode"><textarea name="bericht"></textarea><input name="website"></form>
<form name="afspraak" data-netlify="true" netlify-honeypot="website" hidden><input name="moment"><input name="type"><input name="naam"><input name="tel"><input name="adres"><textarea name="opmerking"></textarea><input name="website"></form>
</body></html>`);

// 5. robots.txt en sitemap.xml (geen sitemap zolang er voorbeeldgegevens staan)
const indexable = pages.filter(p => !p.noindex && p.sitemap !== false);
if (isVoorbeeld) {
  writeFileSync(join(OUT, 'robots.txt'), 'User-agent: *\nAllow: /\n# Nog voorbeeldgegevens: alle pagina\'s staan op noindex.\n');
} else {
  const today = new Date().toISOString().slice(0, 10);
  writeFileSync(join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map(p => `  <url><loc>${baseUrl()}${p.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
  writeFileSync(join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl()}/sitemap.xml\n`);
}

console.log(`Gebouwd: ${pages.length} pagina's naar ${OUT}/ voor ${baseUrl()}${isVoorbeeld ? '  (VOORBEELDGEGEVENS: noindex, geen sitemap)' : ''}`);
if (!existsSync(join(OUT, 'beheer/index.html'))) console.warn('Let op: beheer-app ontbreekt in src/static/beheer/');
