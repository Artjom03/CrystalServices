import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync, gunzipSync } from 'node:zlib';
import { readdir, rm, writeFile, mkdir, readFile } from 'node:fs/promises';

process.env.APP_PIN = 'test-1234';
delete process.env.BLOB_READ_WRITE_TOKEN;
const { bewaarBackup, ontsleutel } = await import('../lib/kluis.js');
const MAP = new URL('../.data/kluis/', import.meta.url);

test('kluis: versleuteld, één per dag, max 7 dagen', async () => {
  await rm(MAP, { recursive: true, force: true });
  await mkdir(MAP, { recursive: true });
  await writeFile(new URL('2026-10-01.bin', MAP), 'oud');
  const data = gzipSync(Buffer.from(JSON.stringify({ staat: { bonnen: [{ klant: { naam: 'Geheim Persoon' } }] } })));
  const r = await bewaarBackup(data, new Date('2026-11-07T10:00:00Z'));
  assert.equal(r.gewist, 1);
  const bestanden = await readdir(MAP);
  assert.deepEqual(bestanden, ['2026-11-07.bin']);
  const ruw = await readFile(new URL('2026-11-07.bin', MAP));
  assert.ok(!ruw.toString('latin1').includes('Geheim'), 'niet leesbaar zonder sleutel');
  assert.ok(gunzipSync(ontsleutel(ruw)).toString().includes('Geheim Persoon'));
  await rm(MAP, { recursive: true, force: true });
});
