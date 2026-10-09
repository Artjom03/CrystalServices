// Crystal Winkel voor Windows: dezelfde winkel-app, maar volledig offline.
// De bonnen staan in een bestand op deze pc; afdrukken gaat rechtstreeks naar de gekozen printer.
import { app, BrowserWindow, Menu, dialog, ipcMain, protocol, screen, shell } from 'electron';
import { readFile, writeFile, rename, mkdir, readdir, rm, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pasToe, voorWinkel, teBewaren, Fout, LEEG } from './app/lib/bonnen.js';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const PUBLIEK = path.join(HIER, 'app', 'public');
const DATA = () => path.join(app.getPath('userData'), 'bonnen.json');
const INSTELLINGEN = () => path.join(app.getPath('userData'), 'instellingen.json');
const BACKUPS = () => path.join(app.getPath('userData'), 'back-ups');
const BEWAAR_BACKUPS = 60;

// Wat de winkel mag doen; klantcodes horen bij het online klantenportaal en bestaan hier niet.
const TOEGESTAAN = ['nieuw', 'wijzig', 'status', 'locatie', 'verwittigd', 'verwijder', 'instellingen', 'prijslijst'];

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

// ---------- Opslag ----------

async function leesJson(bestand, standaard) {
  try {
    return JSON.parse(await readFile(bestand, 'utf8'));
  } catch {
    return structuredClone(standaard);
  }
}

/** Eerst naar een tijdelijk bestand schrijven en dan hernoemen: zo raakt het bestand nooit half beschreven. */
async function schrijfJson(bestand, data) {
  await mkdir(path.dirname(bestand), { recursive: true });
  const tijdelijk = bestand + '.tmp';
  await writeFile(tijdelijk, JSON.stringify(data, null, 1));
  await rename(tijdelijk, bestand);
}

const instellingen = { pin: '', printer: '', zoom: 1 };
async function laadInstellingen() {
  Object.assign(instellingen, await leesJson(INSTELLINGEN(), {}));
}
const bewaarInstellingen = () => schrijfJson(INSTELLINGEN(), instellingen);

// Wijzigingen één voor één afhandelen, zodat er nooit twee tegelijk schrijven.
let rij = Promise.resolve();
function wijzig(fn) {
  const klus = rij.then(async () => {
    const staat = await leesJson(DATA(), LEEG);
    const resultaat = fn(staat);
    await schrijfJson(DATA(), resultaat.staat);
    return resultaat;
  });
  rij = klus.catch(() => {});
  return klus;
}

/** Opgehaalde bonnen die over de bewaartermijn zijn, echt uit het bestand halen. */
async function ruimOp() {
  if (!existsSync(DATA())) return;
  await wijzig((staat) => ({ staat: { ...staat, bonnen: teBewaren(staat) } }));
}

/** Eén back-up per dag, de laatste 60 dagen. */
async function maakBackup() {
  if (!existsSync(DATA())) return;
  await mkdir(BACKUPS(), { recursive: true });
  const dag = new Date().toISOString().slice(0, 10);
  const doel = path.join(BACKUPS(), `bonnen-${dag}.json`);
  await copyFile(DATA(), doel);
  const oud = (await readdir(BACKUPS())).filter((f) => /^bonnen-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().slice(0, -BEWAAR_BACKUPS);
  for (const f of oud) await rm(path.join(BACKUPS(), f));
}

// ---------- De "server" van de app, maar dan op deze pc ----------

const json = (status, data) => new Response(JSON.stringify(data), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

async function api(request) {
  const pin = request.headers.get('x-pin') || '';
  if (!instellingen.pin) {
    // Eerste keer: de eerste geldige pincode wordt de pincode van dit programma.
    if (!/^\d{4,8}$/.test(pin)) return json(401, { error: 'Kies een pincode van 4 tot 8 cijfers' });
    instellingen.pin = pin;
    await bewaarInstellingen();
  } else if (pin !== instellingen.pin) {
    await new Promise((r) => setTimeout(r, 600));
    return json(401, { error: 'Verkeerde pincode' });
  }

  try {
    if (request.method === 'GET') return json(200, voorWinkel(await leesJson(DATA(), LEEG)));
    if (request.method === 'POST') {
      const actie = await request.json().catch(() => ({}));
      if (!TOEGESTAAN.includes(actie?.op)) throw new Fout('Onbekende handeling');
      const { staat, bon } = await wijzig((huidig) => pasToe(huidig, actie));
      return json(200, { ...voorWinkel(staat), bon });
    }
    return json(405, { error: 'Niet toegestaan' });
  } catch (e) {
    if (e instanceof Fout) return json(e.status, { error: e.message });
    console.error(e);
    return json(500, { error: 'Er ging iets mis bij het bewaren: ' + e.message });
  }
}

async function bestand(pad) {
  const relatief = pad === '/' ? 'index.html' : decodeURIComponent(pad).replace(/^\/+/, '');
  const vol = path.normalize(path.join(PUBLIEK, relatief));
  if (!vol.startsWith(PUBLIEK)) return new Response('Niet toegestaan', { status: 403 });
  try {
    const inhoud = await readFile(vol);
    return new Response(inhoud, { headers: { 'Content-Type': TYPES[path.extname(vol)] || 'application/octet-stream' } });
  } catch {
    return new Response('Niet gevonden', { status: 404 });
  }
}

// ---------- Afdrukken ----------

/** Druk de huidige pagina af; de afdruk-CSS toont dan enkel de bon. */
function drukAf(webContents) {
  // Enkel voor tests: de afdruk als PDF bewaren in plaats van naar een printer te sturen.
  if (process.env.CRYSTAL_TEST_PDF) {
    return webContents.printToPDF({ pageSize: { width: 3.15, height: 11.7 }, margins: { marginType: 'none' } })
      .then((pdf) => writeFile(process.env.CRYSTAL_TEST_PDF, pdf))
      .then(() => ({ ok: true }));
  }
  return new Promise((resolve) => {
    // printableArea: de bon begint waar de printer kan drukken, zodat er links of rechts niets wegvalt.
    webContents.print(
      { silent: Boolean(instellingen.printer), deviceName: instellingen.printer || undefined, printBackground: false, margins: { marginType: 'printableArea' } },
      (ok, fout) => resolve({ ok, fout: ok ? '' : String(fout || '') }),
    );
  });
}

async function kiesPrinter(venster) {
  const printers = await venster.webContents.getPrintersAsync();
  const namen = printers.map((p) => p.name);
  const knoppen = [...namen, 'Telkens het afdrukvenster tonen', 'Annuleren'];
  const { response } = await dialog.showMessageBox(venster, {
    type: 'question',
    title: 'Printer kiezen',
    message: 'Naar welke printer moeten de bonnen gaan?',
    detail: instellingen.printer ? `Nu: ${instellingen.printer}` : 'Nu: telkens het afdrukvenster',
    buttons: knoppen,
    cancelId: knoppen.length - 1,
  });
  if (response === knoppen.length - 1) return;
  instellingen.printer = response < namen.length ? namen[response] : '';
  await bewaarInstellingen();
}

// ---------- Back-ups ----------

async function backupOpslaan(venster) {
  const dag = new Date().toISOString().slice(0, 10);
  const { canceled, filePath } = await dialog.showSaveDialog(venster, {
    title: 'Back-up opslaan',
    defaultPath: path.join(app.getPath('documents'), `crystal-winkel-${dag}.json`),
    filters: [{ name: 'Back-up', extensions: ['json'] }],
  });
  if (canceled || !filePath) return;
  await writeFile(filePath, JSON.stringify(await leesJson(DATA(), LEEG), null, 1));
  dialog.showMessageBox(venster, { message: 'Back-up opgeslagen.', detail: filePath });
}

async function backupTerugzetten(venster) {
  const { canceled, filePaths } = await dialog.showOpenDialog(venster, {
    title: 'Back-up terugzetten',
    defaultPath: BACKUPS(),
    filters: [{ name: 'Back-up', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths?.[0]) return;
  let data;
  try {
    data = JSON.parse(await readFile(filePaths[0], 'utf8'));
    if (!Array.isArray(data.bonnen)) throw new Error();
  } catch {
    dialog.showErrorBox('Back-up terugzetten', 'Dit bestand is geen geldige back-up.');
    return;
  }
  const { response } = await dialog.showMessageBox(venster, {
    type: 'warning',
    message: `Back-up met ${data.bonnen.length} bonnen terugzetten?`,
    detail: 'De huidige bonnen worden vervangen. Er wordt eerst nog een back-up van gemaakt.',
    buttons: ['Terugzetten', 'Annuleren'],
    cancelId: 1,
  });
  if (response !== 0) return;
  await maakBackup();
  await wijzig(() => ({ staat: data }));
  venster.webContents.reload();
}

// ---------- Venster en menu ----------

/** Groter of kleiner zetten en onthouden, handig op een touchscherm. */
async function zoom(venster, stap) {
  const nieuw = stap === 0 ? 1 : Math.min(2, Math.max(0.6, Math.round((instellingen.zoom + stap) * 10) / 10));
  instellingen.zoom = nieuw;
  venster.webContents.setZoomFactor(nieuw);
  await bewaarInstellingen();
}

function maakMenu(venster) {
  return Menu.buildFromTemplate([
    {
      label: 'Bestand',
      submenu: [
        { label: 'Printer kiezen…', click: () => kiesPrinter(venster) },
        { type: 'separator' },
        { label: 'Back-up opslaan…', click: () => backupOpslaan(venster) },
        { label: 'Back-up terugzetten…', click: () => backupTerugzetten(venster) },
        { label: 'Map met automatische back-ups openen', click: async () => { await mkdir(BACKUPS(), { recursive: true }); shell.openPath(BACKUPS()); } },
        { type: 'separator' },
        { label: 'Afsluiten', role: 'quit' },
      ],
    },
    {
      label: 'Beeld',
      submenu: [
        { label: 'Vernieuwen', role: 'reload' },
        { label: 'Groter', accelerator: 'CmdOrCtrl+=', click: () => zoom(venster, 0.1) },
        { label: 'Kleiner', accelerator: 'CmdOrCtrl+-', click: () => zoom(venster, -0.1) },
        { label: 'Normale grootte', accelerator: 'CmdOrCtrl+0', click: () => zoom(venster, 0) },
        { type: 'separator' },
        { label: 'Volledig scherm', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [{
        label: 'Over Crystal Winkel',
        click: () => dialog.showMessageBox(venster, {
          message: `Crystal Winkel ${app.getVersion()}`,
          detail: `Bonnen voor strijk, was en droogkuis. Werkt volledig offline.\n\nGegevens: ${DATA()}\nPrinter: ${instellingen.printer || 'afdrukvenster'}`,
        }),
      }],
    },
  ]);
}

function maakVenster() {
  // Zo groot als het scherm (zonder taakbalk), en daarna ook echt gemaximaliseerd.
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const venster = new BrowserWindow({
    width,
    height,
    minWidth: 380,
    title: 'Crystal Winkel',
    show: false,
    icon: path.join(HIER, 'build', 'icon.png'),
    backgroundColor: '#F5F3EE',
    webPreferences: { preload: path.join(HIER, 'preload.cjs'), contextIsolation: true, sandbox: true },
  });
  Menu.setApplicationMenu(maakMenu(venster));

  // Links naar WhatsApp, e-mail of telefoon openen in het juiste programma van Windows.
  venster.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
  venster.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('app://')) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  // Meteen schermvullend openen (handig op een touchscherm), op de onthouden grootte.
  venster.once('ready-to-show', () => {
    venster.maximize();
    venster.show();
  });
  venster.webContents.on('did-finish-load', () => venster.webContents.setZoomFactor(instellingen.zoom || 1));

  venster.loadURL('app://winkel/');
  return venster;
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const v = BrowserWindow.getAllWindows()[0];
    if (v) { if (v.isMinimized()) v.restore(); v.focus(); }
  });

  app.whenReady().then(async () => {
    await laadInstellingen();
    await maakBackup().catch((e) => console.error('Back-up mislukt', e));
    await ruimOp().catch((e) => console.error('Opruimen mislukt', e));
    protocol.handle('app', (request) => {
      const { pathname } = new URL(request.url);
      return pathname === '/api/bonnen' ? api(request) : bestand(pathname);
    });
    ipcMain.handle('afdrukken', (e) => drukAf(e.sender));
    ipcMain.handle('eerste-keer', () => !instellingen.pin);
    ipcMain.handle('printer', () => instellingen.printer);
    ipcMain.handle('kies-printer', async (e) => {
      await kiesPrinter(BrowserWindow.fromWebContents(e.sender));
      return instellingen.printer;
    });
    maakVenster();
  });

  app.on('window-all-closed', () => app.quit());
}
