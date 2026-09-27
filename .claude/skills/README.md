# Skills voor dit project

Deze map bevat skills die Claude Code automatisch oppikt wanneer er aan deze
repository gewerkt wordt. Ze zijn bedoeld om het ontwerpwerk aan de site
scherper te maken.

Alle inhoud hieronder komt van derden en staat onder een MIT-licentie. Het
licentiebestand van de oorspronkelijke maker staat telkens in dezelfde map.

| Skill | Waarvoor | Bron |
|---|---|---|
| `taste-skill/` | Voorkomt generieke, sjabloonachtige ontwerpen bij landingspagina's en redesigns | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) |
| `image-to-code-skill/` | Eerst een ontwerp als afbeelding, dat daarna nabouwen in code | [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) |
| `design-md/` | 35 ontwerptalen van bekende sites, per stijlfamilie | [rohitg00/awesome-claude-design](https://github.com/rohitg00/awesome-claude-design) |

## Wat hier niet in zit, en waarom

**Web design guidelines (Vercel)** — de repository `vercel/web-interface-guidelines`
is niet publiek te klonen. Er bestaat wel een `web-design-guidelines`-skill in de
plugin-catalogus; die installeer je via de plugin-kaart, niet via deze map.

**Playwright** — zit al in deze omgeving. Chromium is voorgeïnstalleerd op
`/opt/pw-browsers/chromium-1194/chrome-linux/chrome` en `playwright-core` kan
zonder extra installatie gebruikt worden om de site in een echte browser te
openen en te testen. Er is ook een Playwright MCP-plugin beschikbaar met een
rijkere gereedschapskist.

## Kanttekening bij image-to-code

Die skill gaat ervan uit dat de agent zelf ontwerpafbeeldingen kan genereren.
Claude Code heeft in deze omgeving geen beeldgenerator. De skill is dus
bruikbaar zodra je zelf een ontwerp of schets aanlevert — de analyse- en
implementatiestappen werken dan gewoon — maar de eerste stap, het beeld zelf
maken, kan Claude hier niet uitvoeren.

## Bijwerken

Deze bestanden zijn kopieën, geen koppelingen. Bij een nieuwe versie bij de
maker moet je ze opnieuw ophalen; ze werken zichzelf niet bij.
