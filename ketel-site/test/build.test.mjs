import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, readdirSync, statSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const OUT = mkdtempSync(join(tmpdir(), 'ketel-build-'));
execFileSync(process.execPath, ['build.mjs', OUT], { stdio: 'pipe' });

const walk = d => readdirSync(d).flatMap(f => statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]);
const html = walk(OUT).filter(f => f.endsWith('.html') && !f.includes('/beheer/') && !f.endsWith('formulieren.html'));
const pages = html.map(f => ({ f, s: readFileSync(f, 'utf8') }));
const get = (s, re) => (s.match(re) || [])[1];

test('elke pagina heeft precies één h1', () => {
  for (const { f, s } of pages) assert.equal((s.match(/<h1[\s>]/g) || []).length, 1, f);
});

test('titels en beschrijvingen zijn uniek en niet te lang', () => {
  const titles = pages.map(p => get(p.s, /<title>(.*?)<\/title>/).replace(/&amp;/g, '&'));
  const descs = pages.map(p => get(p.s, /<meta name="description" content="(.*?)">/));
  assert.equal(new Set(titles).size, titles.length, 'dubbele titel');
  assert.equal(new Set(descs).size, descs.length, 'dubbele beschrijving');
  for (const d of descs) assert.ok(d && d.length >= 50 && d.length <= 165, 'beschrijving lengte: ' + d);
  for (const t of titles) assert.ok(t.length <= 65, 'titel te lang: ' + t);
});

test('canonieke link, geldige JSON-LD en FAQ-gegevens die overeenkomen met de pagina', () => {
  for (const { f, s } of pages) {
    assert.match(s, /<link rel="canonical" href="https?:\/\/[^"]+">/, f);
    const ld = JSON.parse(get(s, /<script type="application\/ld\+json">([\s\S]*?)<\/script>/));
    const faq = ld['@graph'].find(x => x['@type'] === 'FAQPage');
    const visible = (s.match(/<details/g) || []).length;
    if (faq) assert.equal(faq.mainEntity.length, visible, 'FAQ-schema ≠ zichtbare vragen in ' + f);
    else assert.equal(visible, 0, 'zichtbare FAQ zonder schema in ' + f);
    assert.ok(ld['@graph'].some(x => x['@type'] === 'HVACBusiness'), f);
  }
});

test('alle interne links werken', () => {
  for (const { f, s } of pages) {
    for (const [, href] of s.matchAll(/href="(\/[^"#?]*)/g)) {
      const p = join(OUT, href);
      const ok = existsSync(p) && (statSync(p).isFile() || existsSync(join(p, 'index.html')));
      assert.ok(ok || ['/beheer/'].includes(href), `dode link ${href} in ${f}`);
    }
  }
});

test('voorbeeldgegevens: noindex en geen sitemap; geen verzonnen reviews', () => {
  for (const { s } of pages) {
    assert.match(s, /<meta name="robots" content="noindex/);
    assert.doesNotMatch(s, /Voorbeeldklant|AggregateRating|"Review"/);
    assert.doesNotMatch(s, /fonts\.googleapis/);
  }
  assert.equal(existsSync(join(OUT, 'sitemap.xml')), false);
});

test('beheer-app: manifest, service worker en noindex', () => {
  const m = JSON.parse(readFileSync(join(OUT, 'beheer/manifest.webmanifest'), 'utf8'));
  assert.equal(m.scope, '/beheer/');
  assert.match(readFileSync(join(OUT, 'beheer/sw.js'), 'utf8'), /\/api\//);
  assert.match(readFileSync(join(OUT, 'beheer/index.html'), 'utf8'), /noindex/);
});
