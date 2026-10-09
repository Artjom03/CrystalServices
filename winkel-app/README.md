# Crystal Winkel

App voor de winkel van Crystal Services: bonnen voor strijk, was, droogkuis, schoenen en motorkleding bijhouden.

- **Nieuwe bon:** klant, soort, stukken uit de prijslijst (of een eigen stuk met prijs), klaardatum, opmerking.
- **Klaar:** de klant verwittigen via WhatsApp, sms of e-mail met een kant-en-klaar bericht.
- **Opgehaald:** meteen noteren hoe er betaald is (cash, kaart, dienstencheques).
- **Zoeken** op naam, telefoon of bonnummer; **bon afdrukken** om aan de mand te hangen.
- Te installeren op gsm, tablet of computer ("Toevoegen aan beginscherm"), achter een pincode.
- **Klantenportaal** (`/klant/`): klanten melden zich aan met hun gsm-nummer en een code van 6 cijfers en zien al hun eigen bonnen (klaar, in behandeling, eerder). In de winkel-app tik je bij een bon op "Toegang geven"; de code verschijnt één keer en gaat via WhatsApp of sms naar de klant. Bewaard wordt enkel een hash van de code. Na 5 foute codes is het gsm-nummer 15 minuten geblokkeerd, en een nieuwe code meldt oude sessies af.

## Hoe het werkt

- `public/` is de app (gewone HTML, CSS en JavaScript, geen build nodig).
- `api/bonnen.js` is de server-functie voor de winkel (achter de winkelpincode), `api/klant.js` die voor het klantenportaal.
- De bonnen staan in één **privé**-bestand in Vercel Blob. Wijzigingen worden veilig samengevoegd als twee toestellen tegelijk bewaren.
- `public/prijzen.js` komt uit de prijslijst van de website (`src/app/api/chat/kennis.ts` in Artjom03/CrystalServices). Verandert een prijs, pas hem dan op beide plaatsen aan.

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
