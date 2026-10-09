// Lokaal testen: `APP_PIN=1234 npm run dev`, dan http://localhost:3000.
// Zonder BLOB_READ_WRITE_TOKEN worden de bonnen in .data/bonnen.json bewaard.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import handler from './api/bonnen.js';

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const poort = Number(process.env.PORT) || 3000;

http.createServer(async (req, res) => {
  const pad = new URL(req.url, 'http://x').pathname;
  if (pad === '/api/bonnen') return handler(req, res);
  try {
    const bestand = pad === '/' ? '/index.html' : pad;
    const inhoud = await readFile(new URL('./public' + bestand, import.meta.url));
    res.setHeader('Content-Type', TYPES[extname(bestand)] || 'application/octet-stream');
    res.end(inhoud);
  } catch {
    res.statusCode = 404;
    res.end('Niet gevonden');
  }
}).listen(poort, () => console.log(`Winkel-app op http://localhost:${poort}`));
