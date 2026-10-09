# Crystal Winkel

App voor de winkel van Crystal Services: bonnen voor strijk, was, droogkuis, schoenen en motorkleding bijhouden.

- **Nieuwe bon:** klant (gekende klanten worden voorgesteld op naam of gsm-nummer), soort, stukken, klaardatum, locatie, opmerking.
- **Stukken toevoegen:** tik op een tegel met de meest gebruikte stukken, of zoek ("hemd", "mantel"). Staat iets niet in de lijst, dan voeg je het toe als strijk, was, droogkuis of overige. Aantal met − en +, prijs per stuk aan te passen.
- **Locatie:** waar de kleren liggen of hangen (rek, plank, mand). Staat in de lijst, op het mandlabel en is apart te wijzigen bij de bon.
- **Klaar:** de klant verwittigen via WhatsApp, sms of e-mail met een kant-en-klaar bericht.
- **Opgehaald:** meteen noteren hoe er betaald is (cash, kaart, dienstencheques); de afhaalbon komt uit de printer.
- **Zoeken** op naam (ook zonder accenten), gsm-nummer in elke schrijfwijze, bonnummer of locatie. Zijn alle gevonden bonnen van één klant, dan staat bovenaan een klantkaart met "+ Nieuwe bon".
- **Streepjescode:** op de afgiftebon en het mandlabel (Code 128, het bonnummer zonder streepje: 26-001 wordt 26001). Een USB-scanner werkt als toetsenbord; de app herkent de snelle cijfers + Enter (ook met AZERTY) en opent de bon meteen om af te rekenen. De testbon (00-000) toont enkel dat de scanner werkt.
- **Instellingen (⚙):** hoe lang opgehaalde bonnen bewaard blijven (1 tot 24 maanden, standaard 12, gerekend vanaf het ophalen; niet-opgehaalde bonnen blijven altijd), automatisch afdrukken, testbon, en de **prijslijst** aanpassen (prijzen, stukken toevoegen of weghalen, standaard terugzetten). Nieuwe prijzen gelden voor nieuwe bonnen.
- Te installeren op gsm, tablet of computer ("Toevoegen aan beginscherm"), achter een pincode.
- **Klantenportaal** (`/klant/`): klanten melden zich aan met hun gsm-nummer en een code van 6 cijfers en zien al hun eigen bonnen (klaar, in behandeling, eerder). In de winkel-app tik je bij een bon op "Toegang geven"; de code verschijnt één keer en gaat via WhatsApp of sms naar de klant. Bewaard wordt enkel een hash van de code. Na 5 foute codes is het gsm-nummer 15 minuten geblokkeerd, en een nieuwe code meldt oude sessies af.

## Hoe het werkt

- `public/` is de app (gewone HTML, CSS en JavaScript, geen build nodig).
- `api/bonnen.js` is de server-functie voor de winkel (achter de winkelpincode), `api/klant.js` die voor het klantenportaal.
- De bonnen staan in één **privé**-bestand in Vercel Blob. Wijzigingen worden veilig samengevoegd als twee toestellen tegelijk bewaren.
- `public/prijzen.js` is de standaardprijslijst, overgenomen uit de website (`src/app/api/chat/kennis.ts` in Artjom03/CrystalServices). Past de winkel prijzen aan via ⚙ Instellingen, dan worden die samen met de bonnen bewaard; de website verandert daar niet door.
- Over de bewaartermijn heen: bij elke wijziging worden opgehaalde bonnen die te oud zijn gewist, en de app toont ze ook niet meer.

## Online

- Adres: https://crystal-services-winkel.vercel.app (Vercel-project `crystal-winkel` in het team van bogdan-mg).
- Functies draaien in Frankfurt (fra1), de Blob-opslag `crystal-winkel-bonnen` is privé en staat ook in Frankfurt.

### Instellingen op Vercel

- `APP_PIN`: de pincode van de winkel. Na het wijzigen opnieuw deployen.
- `BLOB_READ_WRITE_TOKEN`: wordt automatisch gezet door de gekoppelde Blob-opslag.

### Een nieuwe versie online zetten

Het Vercel-project is niet aan deze GitHub-repo gekoppeld: de Vercel-GitHub-koppeling van bogdan-mg kan Artjom03/CrystalServices niet lezen. Daarom is het zo opgezet:

- `api/` en `lib/` worden rechtstreeks naar Vercel geüpload.
- Het buildcommando haalt `public/` uit deze repo op een vaste commit:
  `curl -fsSL https://codeload.github.com/Artjom03/CrystalServices/tar.gz/<commit> | tar -xz --strip-components=2 --wildcards '*/winkel-app/public/*'`

Voor een update: commit naar `main`, en deploy daarna opnieuw met de nieuwe commit in dat buildcommando en de nieuwe `api/` en `lib/`.

Eenvoudiger wordt het als bogdan-mg in Vercel de GitHub-koppeling ook toegang geeft tot Artjom03/CrystalServices. Dan kan het project gekoppeld worden met root directory `winkel-app`, en gaat elke push vanzelf online.

## Lokaal testen

```bash
npm install
APP_PIN=1234 npm run dev   # http://localhost:3000, bonnen in .data/
npm test
```

## Windows-programma (volledig offline)

In `desktop/` staat dezelfde app als Windows-programma. Alles staat op de pc zelf, zonder internet:

- **Gegevens:** de bonnen staan in `%APPDATA%\Crystal Winkel\bonnen.json`, met elke dag een automatische back-up in `back-ups\` (de laatste 60 dagen; daarin kunnen gewiste bonnen nog tot 60 dagen staan). Via **Bestand → Back-up opslaan** maak je zelf een kopie, bv. op een USB-stick.
- **Afdrukken:** gaat rechtstreeks naar de printer die je kiest via **⚙ Instellingen → Printer kiezen** (of **Bestand → Printer kiezen**), zonder afdrukvenster. Elke bonnenprinter met een Windows-stuurprogramma werkt (bv. Epson TM-T20IV of de 123inkt RP-T100), met papier van 80 mm. De bon past zich aan de printbreedte aan (max. 72 mm).
- **Touchscherm:** het programma opent schermvullend; knoppen worden groter op een touchscherm. **Beeld → Groter/Kleiner** wordt onthouden.
- **Pincode:** de eerste keer kies je een pincode van 4 tot 8 cijfers.
- **Wat er niet in zit:** geen klantenportaal (dat heeft internet nodig). WhatsApp- en e-maillinks openen in de programma's van Windows.

Het installatiebestand bouwen (op Linux is daarvoor Wine nodig, ook de 32-bitversie):

```bash
cd desktop
npm install
npm run dist     # maakt dist/Crystal-Winkel-Setup-<versie>.exe
npm start        # het programma meteen openen om te testen
```

`npm run dist` neemt eerst `public/` en `lib/bonnen.js` over, zodat web en Windows dezelfde app gebruiken. Verhoog `version` in `desktop/package.json` bij elke nieuwe versie.
