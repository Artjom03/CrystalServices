// Crystal Winkel voor Windows: dezelfde winkel-app, maar volledig offline.
// De bonnen staan in een bestand op deze pc; afdrukken gaat rechtstreeks naar de gekozen printer.
import { app, BrowserWindow, Menu, dialog, ipcMain, protocol, screen, shell } from 'electron';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pasToe, voorWinkel, teBewaren, Fout, LEEG, klantSleutel } from './app/lib/bonnen.js';

const HIER = path.dirname(fileURLToPath(import.meta.url));
const PUBLIEK = path.join(HIER, 'app', 'public');
const DATA = () => path.join(app.getPath('userData'), 'bonnen.json');
const INSTELLINGEN = () => path.join(app.getPath('userData'), 'instellingen.json');

// Wat de winkel mag doen; klantcodes horen bij het online klantenportaal en bestaan hier niet.
const TOEGESTAAN = ['nieuw', 'wijzig', 'status', 'locatie', 'verwittigd', 'verwijder', 'instellingen', 'prijslijst', 'klant', 'klantNieuw', 'klantWeg', 'kassaOpen', 'kassaBeweging', 'kassaSluit', 'kassaHeropen', 'kassaBewegingWijzig', 'betalingWijzig', 'dagWissen', 'factuurVraag', 'factuurGemaakt', 'klantenImport'];

const TYPES = { '.pdf': 'application/pdf',
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

// printers: per soort bonnetje een eigen printer ('' = automatisch, 'venster' = telkens vragen).
const instellingen = { pin: '', printer: '', printerA4: '', printers: {}, zoom: 1 };
const PRINT_SOORTEN = ['klant', 'ticket', 'afhaal', 'a4', 'prijslijst', 'dag'];
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

/**
 * Eén keer: de professionele klanten (uit de klantenlijst) inladen, met de vlekkencontrole voor wie die vraagt.
 * Bestaande klanten worden enkel aangevuld.
 */
async function laadKlanten() {
  if (instellingen.klantenGeladen) return;
  const lijst = JSON.parse(await readFile(path.join(HIER, 'klanten.json'), 'utf8'));
  await wijzig((staat) => {
    let { staat: nieuw } = pasToe(staat, { op: 'klantenImport', klanten: lijst });
    for (const k of lijst.filter((x) => x.vlekkenrapport)) {
      ({ staat: nieuw } = pasToe(nieuw, { op: 'klant', sleutel: klantSleutel(k), klant: { vlekkenrapport: true } }));
    }
    return { staat: nieuw };
  });
  instellingen.klantenGeladen = true;
  await bewaarInstellingen();
}

/** Opgehaalde bonnen die over de bewaartermijn zijn, echt uit het bestand halen. */
async function ruimOp() {
  if (!existsSync(DATA())) return;
  await wijzig((staat) => ({ staat: { ...staat, bonnen: teBewaren(staat) } }));
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

/** Druk de huidige pagina af; de afdruk-CSS toont dan enkel de bon. Klein gaat naar de bonprinter, A4 naar de A4-printer. */
function drukAf(webContents, formaat, soort = '') {
  const a4 = formaat === 'a4' || formaat === 'a4-dubbel';
  // Prijslijsten voor- en achterkant: dubbelzijdig, als de printer dat kan.
  const dubbel = formaat === 'a4-dubbel' ? { duplexMode: 'longEdge' } : {};
  // Enkel voor tests: de afdruk als PDF bewaren in plaats van naar een printer te sturen.
  if (process.env.CRYSTAL_TEST_PDF) {
    const opties = a4 ? { pageSize: 'A4', landscape: false, preferCSSPageSize: true, printBackground: true } : { pageSize: { width: 3.15, height: 11.7 }, margins: { marginType: 'none' }, printBackground: true };
    return webContents.printToPDF(opties)
      .then((pdf) => writeFile(process.env.CRYSTAL_TEST_PDF, pdf))
      .then(() => ({ ok: true }));
  }
  // A4 (prijslijsten, facturen, grote bonnen) mag nooit op de bonprinter belanden:
  // is er nog geen A4-printer gekozen, dan vraagt het programma het één keer.
  const eigen = PRINT_SOORTEN.includes(soort) ? instellingen.printers?.[soort] || '' : '';
  const vraag = a4 && !eigen && !instellingen.printerA4 ? kiesPrinter(BrowserWindow.fromWebContents(webContents), 'a4') : Promise.resolve();
  return vraag.then(() => gekozenPrinters(webContents)).then(({ bon, a4: groot, alle }) => {
  // De printer die in Instellingen voor deze soort bonnetje gekozen is, gaat voor.
  const printer = eigen === 'venster' ? '' : eigen && alle.includes(eigen) ? eigen : a4 ? groot : bon;
  return new Promise((resolve) => {
    // Bonprinter: printableArea, zodat er links of rechts niets wegvalt. A4: de marges uit de pagina.
    webContents.print(
      a4
        ? { silent: Boolean(printer), deviceName: printer || undefined, printBackground: true, pageSize: 'A4', landscape: false, ...dubbel }
        : { silent: Boolean(printer), deviceName: printer || undefined, printBackground: true, margins: { marginType: 'printableArea' } },
      (ok, fout) => resolve({ ok, fout: ok ? '' : String(fout || '') }),
    );
  });
  });
}

// Printers die geen papier geven (PDF, XPS, OneNote, fax) kiest het programma nooit zelf.
const VIRTUEEL = /pdf|xps|onenote|fax|send to|document writer/i;
// Bonprinters herkennen aan hun naam: POS-58/80, Epson TM-…, Star, Xprinter, Rongta, Bixolon, "receipt", "thermal"…
const BONPRINTER = /\bpos(\b|-|\d)|receipt|thermal|\btm[- ]?[a-z]?\d|tsp\d|\bstar\b|xprinter|xp-\d|rongta|bixolon|citizen|\b(58|80) ?mm|bonprinter|kassa/i;

/**
 * De printers om naar af te drukken. Zelf gekozen gaat voor; anders kiest het programma automatisch:
 * de bonprinter op naam, en voor A4 de standaardprinter van Windows (of anders de eerste echte printer).
 * "venster" betekent: telkens het afdrukvenster tonen.
 */
async function gekozenPrinters(webContents) {
  let printers = [];
  try { printers = await webContents.getPrintersAsync(); } catch {}
  const echt = printers.filter((p) => !VIRTUEEL.test(p.name));
  const bonAuto = echt.find((p) => BONPRINTER.test(p.name))?.name || '';
  const a4Echt = echt.filter((p) => p.name !== bonAuto && p.name !== instellingen.printer && !BONPRINTER.test(p.name));
  const a4Auto = (a4Echt.find((p) => p.isDefault) || a4Echt[0])?.name || '';
  const kies = (gekozen, auto) => (gekozen === 'venster' ? '' : gekozen !== 'auto' && printers.some((p) => p.name === gekozen) ? gekozen : auto);
  return { bon: kies(instellingen.printer, bonAuto), a4: kies(instellingen.printerA4, a4Auto), alle: printers.map((p) => p.name) };
}

async function kiesPrinter(venster, soort = 'bon') {
  const veld = soort === 'a4' ? 'printerA4' : 'printer';
  const printers = await venster.webContents.getPrintersAsync();
  const namen = printers.map((p) => p.name);
  const knoppen = [...namen, 'Automatisch kiezen', 'Telkens het afdrukvenster tonen', 'Annuleren'];
  const { response } = await dialog.showMessageBox(venster, {
    type: 'question',
    title: 'Printer kiezen',
    message: soort === 'a4' ? 'Naar welke printer moeten A4-afdrukken (facturen, grote bonnen) gaan?' : 'Naar welke bonprinter moeten de kleine bonnetjes gaan?',
    detail: instellingen[veld] === 'venster' ? 'Nu: telkens het afdrukvenster' : instellingen[veld] && instellingen[veld] !== 'auto' ? `Nu: ${instellingen[veld]}` : 'Nu: automatisch',
    buttons: knoppen,
    cancelId: knoppen.length - 1,
  });
  if (response === knoppen.length - 1) return;
  instellingen[veld] = response < namen.length ? namen[response] : response === namen.length ? 'auto' : 'venster';
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
    detail: 'De huidige bonnen worden vervangen.',
    buttons: ['Terugzetten', 'Annuleren'],
    cancelId: 1,
  });
  if (response !== 0) return;
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
        { label: 'Bonprinter kiezen…', click: () => kiesPrinter(venster, 'bon') },
        { label: 'A4-printer kiezen…', click: () => kiesPrinter(venster, 'a4') },
        { type: 'separator' },
        { label: 'Back-up opslaan…', click: () => backupOpslaan(venster) },
        { label: 'Back-up terugzetten…', click: () => backupTerugzetten(venster) },
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
          detail: `Bonnen voor strijk, was en droogkuis. Werkt volledig offline.\n\nGegevens: ${DATA()}\nBonprinter: ${instellingen.printer || 'automatisch'}\nA4-printer: ${instellingen.printerA4 || 'nog niet gekozen'}`,
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
    // De prijslijsten (PDF) openen in een eigen venster van het programma, om te bekijken of af te drukken.
    if (url.startsWith('app://') && url.endsWith('.pdf')) return { action: 'allow', overrideBrowserWindowOptions: { width: 900, height: 1000, autoHideMenuBar: true } };
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
    await ruimOp().catch((e) => console.error('Opruimen mislukt', e));
    await laadKlanten().catch((e) => console.error('Klanten inladen mislukt', e));
    protocol.handle('app', (request) => {
      const { pathname } = new URL(request.url);
      return pathname === '/api/bonnen' ? api(request) : bestand(pathname);
    });
    ipcMain.handle('afdrukken', (e, formaat, soort) => drukAf(e.sender, formaat, soort));
    // Instellingen: alle printers, en welke printer per soort bonnetje.
    ipcMain.handle('printers', async (e) => {
      const g = await gekozenPrinters(e.sender);
      return { lijst: g.alle, keuze: { ...instellingen.printers }, auto: { bon: g.bon, a4: g.a4 } };
    });
    ipcMain.handle('zet-printer', async (e, soort, naam) => {
      if (!PRINT_SOORTEN.includes(soort)) return false;
      instellingen.printers = { ...instellingen.printers, [soort]: String(naam || '').slice(0, 200) };
      await bewaarInstellingen();
      return true;
    });
    ipcMain.handle('eerste-keer', () => !instellingen.pin);
    const printerInfo = async (wc) => {
      const g = await gekozenPrinters(wc);
      const tekst = (eigen, naam) => (eigen === 'venster' ? '' : naam ? naam + (eigen && eigen !== 'auto' ? '' : ' (automatisch)') : '');
      return { bon: tekst(instellingen.printer, g.bon), a4: tekst(instellingen.printerA4, g.a4) };
    };
    ipcMain.handle('printer', (e) => printerInfo(e.sender));
    ipcMain.handle('kies-printer', async (e, soort) => {
      await kiesPrinter(BrowserWindow.fromWebContents(e.sender), soort);
      return printerInfo(e.sender);
    });
    maakVenster();
  });

  app.on('window-all-closed', () => app.quit());
}
