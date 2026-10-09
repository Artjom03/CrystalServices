# Crystal Winkel

App voor de winkel van Crystal Services: bonnen voor strijk, was, droogkuis, schoenen en motorkleding bijhouden.

- **Nieuwe bon:** klant, soort, stukken uit de prijslijst (of een eigen stuk met prijs), klaardatum, opmerking.
- **Klaar:** de klant verwittigen via WhatsApp, sms of e-mail met een kant-en-klaar bericht.
- **Opgehaald:** meteen noteren hoe er betaald is (cash, kaart, dienstencheques).
- **Zoeken** op naam, telefoon of bonnummer; **bon afdrukken** om aan de mand te hangen.
- Te installeren op gsm, tablet of computer ("Toevoegen aan beginscherm"), achter een pincode.

## Hoe het werkt

- `public/` is de app (gewone HTML, CSS en JavaScript, geen build nodig).
- `api/bonnen.js` is de enige server-functie: controleert de pincode en bewaart de bonnen.
- De bonnen staan in één **privé**-bestand in Vercel Blob. Wijzigingen worden veilig samengevoegd als twee toestellen tegelijk bewaren.
- `public/prijzen.js` komt uit de prijslijst van de website (`src/app/api/chat/kennis.ts` in Artjom03/CrystalServices). Verandert een prijs, pas hem dan op beide plaatsen aan.

## Instellingen op Vercel

- `APP_PIN`: de pincode van de winkel.
- `BLOB_READ_WRITE_TOKEN`: wordt automatisch gezet door de gekoppelde Blob-opslag.

## Lokaal testen

```bash
npm install
APP_PIN=1234 npm run dev   # http://localhost:3000, bonnen in .data/
npm test
```
