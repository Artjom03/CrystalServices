// Bouwt de online versie op Vercel rechtstreeks uit deze GitHub-repo (Build Output API v3).
// Gebruik (als buildcommando op Vercel): node bouw.mjs <commit>
// Zo moet er bij een update enkel deze map (package.json + bouw.mjs) opnieuw geüpload worden,
// met de nieuwe commit in package.json.
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, cpSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const commit = process.argv[2];
if (!/^[0-9a-f]{40}$/.test(commit || '')) throw new Error('Geef een volledige commit-hash mee');

const bron = 'bron';
const uit = '.vercel/output';
rmSync(bron, { recursive: true, force: true });
rmSync(uit, { recursive: true, force: true });
mkdirSync(bron, { recursive: true });

// 1. De code ophalen op die commit (enkel winkel-app/public, api en lib).
const tar = join(bron, 'repo.tar.gz');
// Is de repo privé, dan met de sleutel GITHUB_LEZEN (Vercel-instelling, enkel lezen).
const sleutel = process.env.GITHUB_LEZEN;
const res = await fetch(sleutel
  ? `https://api.github.com/repos/Artjom03/CrystalServices/tarball/${commit}`
  : `https://codeload.github.com/Artjom03/CrystalServices/tar.gz/${commit}`,
  sleutel ? { headers: { Authorization: `Bearer ${sleutel}`, 'User-Agent': 'crystal-winkel-bouw' } } : {});
console.log(sleutel ? 'Code ophalen met de sleutel GITHUB_LEZEN' : 'Code ophalen zonder sleutel (enkel zolang de repo openbaar is)');
if (!res.ok) throw new Error(`Kon de code niet ophalen (${res.status})${sleutel ? ': heeft de sleutel leestoegang tot Artjom03/CrystalServices?' : ''}`);
writeFileSync(tar, Buffer.from(await res.arrayBuffer()));
execFileSync('tar', ['-xzf', tar, '-C', bron, '--strip-components=2', '--wildcards', '*/winkel-app/public/*', '*/winkel-app/api/*', '*/winkel-app/lib/*']);

// 2. De website zelf (statische bestanden).
mkdirSync(join(uit, 'static'), { recursive: true });
cpSync(join(bron, 'public'), join(uit, 'static'), { recursive: true });

// 3. Elke server-functie (api/*.js) met de regels (lib/) en @vercel/blob.
for (const bestand of readdirSync(join(bron, 'api')).filter((f) => f.endsWith('.js'))) {
  const naam = bestand.replace(/\.js$/, '');
  const map = join(uit, 'functions', 'api', naam + '.func');
  mkdirSync(join(map, 'api'), { recursive: true });
  cpSync(join(bron, 'api', bestand), join(map, 'api', bestand));
  cpSync(join(bron, 'lib'), join(map, 'lib'), { recursive: true });
  if (existsSync('node_modules')) cpSync('node_modules', join(map, 'node_modules'), { recursive: true, dereference: true });
  writeFileSync(join(map, 'package.json'), JSON.stringify({ type: 'module' }));
  writeFileSync(join(map, '.vc-config.json'), JSON.stringify({
    runtime: 'nodejs22.x', handler: `api/${bestand}`, launcherType: 'Nodejs', shouldAddHelpers: true, regions: ['fra1'],
  }));
}

writeFileSync(join(uit, 'config.json'), JSON.stringify({ version: 3, routes: [{ handle: 'filesystem' }] }));
console.log('Klaar: online versie gebouwd op commit', commit);
