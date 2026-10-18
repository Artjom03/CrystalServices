# Crystal Winkel

App voor de winkel van Crystal Services: bonnen voor strijk, was, droogkuis, schoenen en motorkleding bijhouden.

- **Nieuwe bon:** klant (gekende klanten worden voorgesteld op naam of gsm-nummer), soort, stukken, klaardatum, locatie, opmerking.
- **Stukken toevoegen:** tik op een tegel met de meest gebruikte stukken, of zoek ("hemd", "mantel"). Staat iets niet in de lijst, dan voeg je het toe als strijk, was, droogkuis of overige. Aantal met − en +, prijs per stuk aan te passen.
- **Locatie:** waar de kleren liggen of hangen (rek, plank, mand). Staat in de lijst, op het mandticket en is apart te wijzigen bij de bon.
- **Klaar:** de klant verwittigen via WhatsApp, sms of e-mail met een kant-en-klaar bericht.
- **Opgehaald:** meteen noteren hoe er betaald is (cash, kaart, dienstencheques); de afhaalbon komt uit de printer.
- **Zoeken** op naam (ook zonder accenten), gsm-nummer in elke schrijfwijze, bonnummer of locatie. Zijn alle gevonden bonnen van één klant, dan staat bovenaan een klantkaart met "+ Nieuwe bon".
- **Streepjescode:** op de klantenbon en het mandticket (Code 128, het bonnummer: een willekeurig getal van 6 cijfers, bv. 483920). Een USB-scanner werkt als toetsenbord; de app herkent de snelle cijfers + Enter (ook met AZERTY) en opent de bon meteen om af te rekenen. De testbon (00-000) toont enkel dat de scanner werkt.
- **Afdrukken klein of groot:** elke bon kan op de bonprinter (klein bonnetje) of op A4. Het standaardformaat kies je in ⚙ Instellingen; in het Windows-programma kies je een aparte bonprinter en A4-printer.
- **Klantenbon en mandticket:** bij een nieuwe bon komen er twee bonnen uit de printer: een korte klantenbon en een mandticket voor op de mand. Op het mandticket staan de stukken per plaats in de winkel (bv. lingerie in een kast, hemden op een rek), met een vakje om af te vinken. De plaatsen en welke stukken erbij horen kies je in ⚙ Instellingen → Indeling van de winkel; een stuk komt bij de eerste plaats waarvan een woord in de naam staat. Het Windows-programma stuurt ze als twee opdrachten (de bonprinter snijdt ertussen) en drukt het mandticket altijd op de bonprinter, ook als de klant een A4 krijgt.
- **Vlekken:** bij elk stuk kan je met "⚠ Vlek" aanduiden hoeveel stukken een vlek hebben (bv. 3 van 10 servetten); op de bonnen staat dan "met vlek", zonder waar. Klanten met het vinkje "Speciale A4-bon met vlekkencontrole" (Klanten) krijgen altijd een aparte A4-bon met bovenaan of er vlekken zijn en per stuk vlek ja/nee.
- **A4:** een volle pagina in de huisstijl met enkel de stukken van de bon.
- **Factuur aanvragen:** vraagt een klant een factuur, dan drukt de medewerker bij de bon op "Factuur aanvragen" (gegevens zoals adres en btw-nummer mogen erbij, hoeven niet). De aanvragen staan in de kassa en op het dagoverzicht; de zaakvoerder maakt de factuur zelf (via Peppol) en vinkt ze af met "Gemaakt ✓". Een bon met een open aanvraag wordt niet gewist.
- **Klantenbestand:** alle klanten blijven bewaard, ook als hun bonnen na de bewaartermijn gewist zijn. Via "Klanten" vul je adres, btw-nummer en een notitie aan.
- **Kassa:** elke dag vraagt het programma eerst hoeveel cash er in de kassa zit. Betalingen worden genoteerd per betaalwijze (cash, kaart, dienstencheques, overschrijving). Geld in/uit de kassa (wisselgeld, naar de bank) noteer je met een reden. Bij "Dag afsluiten" tel je de kassa; het verschil met wat erin hoort te zitten wordt getoond en het dagoverzicht komt uit de printer. Elk dagoverzicht is later opnieuw af te drukken.
- **Kassa verbeteren:** zolang de dag open is, tik je in de kassa op het beginbedrag, een "geld in/uit" of een betaling om ze te verbeteren (bedrag, betaalwijze) of te schrappen. Een geschrapte betaling zet de bon terug op niet betaald. Elke verbetering blijft zichtbaar in de kassa en op het dagoverzicht. Is de dag al afgesloten, dan eerst "Opnieuw openen".
- **Kassa bewaren:** de kassa en alle betalingen blijven altijd bewaard, ook als de opgehaalde bonnen gewist worden. Met "Maand exporteren" download je de kassa van een maand als bestand voor Excel (per dag de ontvangsten per betaalwijze, het verschil bij het afsluiten, en alle betalingen) om aan de boekhouder te geven.
- **Aanraakscherm:** bij ⚙ Instellingen > Scherm (automatisch, aan of uit; per toestel) worden alle knoppen groter en krijgen de bedragen in de kassa een cijferklavier op het scherm.
- **Instellingen (⚙):** automatisch afdrukken, printers, testbon, aanraakscherm en de indeling van de winkel.
- **Prijslijsten:** afdrukken op A4 (strijken & wassen, eventueel met de actie, en nieuwkuis/droogkuis met luxe, zijde en linnen), een staande A4 "niet aansprakelijk voor schade aan de stoffen" waarop de klant bonnummer, naam, datum en handtekening zet, en de prijzen aanpassen. Nieuwe prijzen gelden voor nieuwe bonnen.
- **Stukken zonder typen:** bij een nieuwe bon kies je een groep (bv. Linnen of Droogkuis) en tik je het stuk aan.
- Te installeren op gsm, tablet of computer ("Toevoegen aan beginscherm"), achter een pincode.
- **Klantenportaal** (`/klant/`): klanten melden zich aan met hun gsm-nummer en een code van 6 cijfers en zien al hun eigen bonnen (klaar, in behandeling, eerder). In de winkel-app tik je bij een bon op "Toegang geven"; de code verschijnt één keer en gaat via WhatsApp of sms naar de klant. Bewaard wordt enkel een hash van de code. Na 5 foute codes is het gsm-nummer 15 minuten geblokkeerd, en een nieuwe code meldt oude sessies af.

## Hoe het werkt

- `public/` is de app (gewone HTML, CSS en JavaScript, geen build nodig).
- `api/bonnen.js` is de server-functie voor de winkel (achter de winkelpincode), `api/klant.js` die voor het klantenportaal.
- De bonnen staan in één **privé**-bestand in Vercel Blob. Wijzigingen worden veilig samengevoegd als twee toestellen tegelijk bewaren.
- `public/prijzen.js` is de standaardprijslijst, overgenomen van de papieren prijslijsten van de winkel (strijk/was en nieuwkuis). Past de winkel prijzen aan via Prijslijsten, dan worden die samen met de bonnen bewaard; de website verandert daar niet door.
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

- **Gegevens:** de bonnen staan in `%APPDATA%\Crystal Winkel\bonnen.json`. Er worden geen automatische back-ups gemaakt; een verwijderde bon is meteen weg. Via **Bestand → Back-up opslaan** maak je zelf een kopie, bv. op een USB-stick.
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
