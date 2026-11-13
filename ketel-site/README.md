# Haard & Ketel – website en planning-app

## Wat aanpassen?

| Wat | Bestand |
|---|---|
| Bedrijfsnaam, telefoon, e-mail, adres, btw, domein, werkgebied, reviews | `src/site.config.mjs` |
| Merken (eigen pagina of alleen in de lijst) | `src/merken.mjs` |
| Teksten van de pagina's | `src/pages.mjs` |

Zolang er nog voorbeeldgegevens (`voorbeeld`, `0000`) in `src/site.config.mjs` staan, krijgt elke
pagina `noindex` en wordt er geen sitemap gemaakt. Zo komt er niets onjuists in Google.

## De planning-app (`/beheer/`)

- **Planning**: per dag, per week of alles. Bellen, route, wijzigen, verplaatsen, afgewerkt.
- **+ Klant inplannen**: zelf een klant inplannen, ook in een gesloten of vol dagdeel.
- **Klanten**: zoeken, opnieuw inplannen, filter "onderhoud langer dan 1 jaar geleden".
- **Vrije momenten**: kiezen welke voor- en namiddagen klanten online kunnen boeken.
- **Gsm-agenda**: een abonnementslink voor Google Agenda of de iPhone-agenda.
- Installeerbaar als app: Android "App installeren", iPhone "Zet op beginscherm".

## Online zetten (Netlify)

1. Netlify → Add new project → Import from GitHub → deze repository, **Base directory** `ketel-site`.
2. Environment variables → `BEHEER_WACHTWOORD` (minstens 8 tekens) → opnieuw deployen.
3. Forms → zet formulierdetectie aan en voeg e-mailmeldingen toe voor `afspraak` en `offerte`.
4. Eigen domein: Domain management, en vul `domein` in `src/site.config.mjs` in.
5. Echte gegevens ingevuld? Dien `https://jouwdomein/sitemap.xml` in bij Google Search Console
   en maak een Google-bedrijfsprofiel aan met dezelfde naam, telefoon en adres.

## Voor ontwikkelaars

```bash
npm install
npm test          # agendalogica + SEO-controle van de gebouwde site
npm run build     # bouwt naar dist/
```

Structuur: `build.mjs` (bouwt de site), `src/` (inhoud en opmaak), `src/static/` (lettertypes,
iconen, beheer-app), `lib/agenda.mjs` (agenda), `netlify/functions/` (API).
