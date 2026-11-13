# Haard & Ketel – website en planning-app

## Wat aanpassen?

| Wat | Bestand |
|---|---|
| Bedrijfsnaam, telefoon, e-mail, adres, btw, domein, werkgebied, reviews | `src/site.config.mjs` |
| Merken (eigen pagina of alleen in de lijst) | `src/merken.mjs` |
| Teksten van de pagina's | `src/pages.mjs` |

Zolang `gecontroleerd` op `false` staat of er nog voorbeeldgegevens (`voorbeeld`, `0000`) in `src/site.config.mjs`
staan, krijgt elke pagina `noindex` en wordt er geen sitemap gemaakt. Zo komt er niets onjuists in Google.

## De planning-app (`/beheer/`)

- **Planning**: per dag, per week of alles. Bellen, route, wijzigen, verplaatsen, afgewerkt.
- **+ Klant inplannen**: zelf een klant inplannen, ook in een gesloten of vol dagdeel.
- **Klanten**: zoeken, opnieuw inplannen, filter "onderhoud langer dan 1 jaar geleden".
- **Vrije momenten**: kiezen welke voor- en namiddagen klanten online kunnen boeken.
- **Gsm-agenda**: een abonnementslink voor Google Agenda of de iPhone-agenda.
- Installeerbaar als app: Android "App installeren", iPhone "Zet op beginscherm".

## Online (Netlify)

De site staat op **https://haard-en-ketel.netlify.app** (Netlify-project `haard-en-ketel`, team Crystal Services BV).
Ze is **rechtstreeks geüpload** en nog **niet gekoppeld aan GitHub**: wijzigingen in GitHub komen dus niet
vanzelf online. Zo koppel je ze (eenmalig, daarna gaat alles automatisch):

1. Netlify → project `haard-en-ketel` → **Project configuration → Build & deploy → Link repository**.
2. Kies deze GitHub-repository, branch met de site (nu `claude/modest-babbage-x8hpk3`, later `main`),
   **Base directory** `ketel-site`. Build command en publish directory staan al in `netlify.toml`.

**Beheerwachtwoord wijzigen:** Netlify → Project configuration → Environment variables → `BEHEER_WACHTWOORD`
aanpassen (minstens 8 tekens) en daarna **opnieuw deployen** (Deploys → Trigger deploy, kan pas na het koppelen
met GitHub). De link voor de gsm-agenda verandert mee met het wachtwoord.

**E-mail bij nieuwe afspraken en offertes:** Netlify → Forms → Form notifications → Add notification → Email,
voor de formulieren `afspraak` en `offerte`. Zonder dit komen ze alleen in Netlify en in de planning-app terecht.

**Eigen domein en Google:** koppel je domein onder Domain management en vul `domein` in. Zet `gecontroleerd: true`
in `src/site.config.mjs` als alle gegevens kloppen; dan pas komen de pagina's in Google en wordt er een sitemap
gemaakt. Dien die (`/sitemap.xml`) in bij Google Search Console en maak een Google-bedrijfsprofiel aan met exact
dezelfde naam, telefoon en adres.

## Voor ontwikkelaars

```bash
npm install
npm test          # agendalogica + SEO-controle van de gebouwde site
npm run build     # test en bouwt naar dist/ (Netlify doet hetzelfde; faalt een test, dan gaat er niets online)

# lokaal met de echte Netlify-functies (lokale opslag):
npm run build && BEHEER_WACHTWOORD=testwachtwoord123 npx netlify-cli dev --offline --dir dist --functions netlify/functions
```

Structuur: `build.mjs` (bouwt de site), `src/` (inhoud en opmaak), `src/static/` (lettertypes,
iconen, beheer-app), `lib/agenda.mjs` (agenda), `netlify/functions/` (API).
