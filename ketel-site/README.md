# Haard & Ketel – website

Statische website met een online afsprakenagenda (voormiddag / namiddag) en een beheerpagina.

```
public/            de website (index.html, beheer.html, privacy.html)
netlify/functions/ afspraak.mjs (publieke agenda) en beheer.mjs (beheer, met wachtwoord)
lib/agenda.mjs     de agendalogica (getest in test/)
```

## Online zetten op Netlify

1. Netlify → **Add new project** → **Import an existing project** → kies deze GitHub-repository.
2. Zet **Base directory** op `ketel-site`. De rest staat al in `netlify.toml`.
3. **Project configuration → Environment variables**: voeg `BEHEER_WACHTWOORD` toe
   (minstens 8 tekens, scope *Functions*). Daarna opnieuw deployen.
4. **Forms → Form notifications**: voeg een e-mailmelding toe voor de formulieren
   `afspraak` (elke nieuwe afspraak) en `offerte` (offerte-aanvragen).
5. Optioneel: koppel een eigen domeinnaam onder **Domain management**.

## Gebruik

- Beheer: ga naar `/beheer` en meld je aan met het wachtwoord.
  - **Agenda**: alle afspraken per dag, met adres (route), telefoon en opmerking.
  - **Beschikbaarheid**: zet per dag de voormiddag en namiddag open en kies hoeveel afspraken erin passen.
- Klanten zien op de website alleen open dagdelen met nog vrije plaatsen.

## Nog aan te passen

Bedrijfsnaam, telefoonnummer, e-mailadres, btw-nummer, reviews en de gegevens in `privacy.html`
zijn nog voorbeelden.

## Testen

```bash
npm install
npm test
```
