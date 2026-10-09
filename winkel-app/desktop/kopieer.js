// Neemt de app (public/) en de regels (lib/) over uit winkel-app, zodat web en Windows dezelfde code gebruiken.
import { cp, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';

const doel = new URL('./app/', import.meta.url);
await rm(doel, { recursive: true, force: true });
// Het klantenportaal en de service worker horen bij de online versie.
await cp(new URL('../public/', import.meta.url), new URL('./public/', doel), {
  recursive: true,
  filter: (bron) => !['klant', 'sw.js'].includes(path.basename(bron)),
});
await mkdir(new URL('./lib/', doel), { recursive: true });
// Enkel de regels: opslag en klantcodes horen bij de online versie.
await cp(new URL('../lib/bonnen.js', import.meta.url), new URL('./lib/bonnen.js', doel));
console.log('App en regels gekopieerd naar desktop/app/');
