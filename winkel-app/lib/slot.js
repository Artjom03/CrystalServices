// Blokkeren na te veel foute pincodes (puur rekenwerk, zodat het te testen is).
// - 5 fouten binnen 15 minuten: 15 minuten geblokkeerd.
// - 15 fouten binnen 24 uur: 24 uur geblokkeerd.
// - Online ook voor iedereen samen (tegen raden vanaf veel adressen): 50 fouten binnen een uur: een uur dicht.
// Een juiste pincode wist de fouten van dat adres.
const MIN = 60 * 1000;
export const REGELS = [
  { fouten: 5, binnen: 15 * MIN, blok: 15 * MIN },
  { fouten: 15, binnen: 24 * 60 * MIN, blok: 24 * 60 * MIN },
];
export const ALLEN = { fouten: 50, binnen: 60 * MIN, blok: 60 * MIN };

/** Is dit record nu geblokkeerd? Geeft het tijdstip (ms) tot wanneer, of 0. */
const LANGSTE = 24 * 60 * MIN;
export function geblokkeerdTot(rec, nu = Date.now()) {
  // Een blokkering verder dan de langste regel (bv. na een verkeerde klok) telt niet.
  return rec?.tot && rec.tot > nu && rec.tot <= nu + LANGSTE ? rec.tot : 0;
}

/** Een foute poging noteren; geeft het nieuwe record terug (met eventueel een blokkering). */
export function noteerFout(rec, nu = Date.now(), regels = REGELS) {
  const lang = Math.max(...regels.map((r) => r.binnen));
  const fouten = [...(rec?.fouten || []).filter((t) => t <= nu && nu - t < lang), nu];
  let tot = geblokkeerdTot(rec, nu);
  for (const r of regels) {
    if (fouten.filter((t) => nu - t < r.binnen).length >= r.fouten) tot = Math.max(tot, nu + r.blok);
  }
  return { fouten, tot };
}

/** Tekst voor de winkel: tot wanneer geblokkeerd. */
export function blokTekst(tot) {
  const d = new Date(tot);
  const uur = d.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Brussels' });
  const meerDagen = tot - Date.now() > 12 * 60 * MIN;
  return `Te veel foute pincodes. Geblokkeerd tot ${meerDagen ? d.toLocaleDateString('nl-BE', { weekday: 'long', timeZone: 'Europe/Brussels' }) + ' ' : ''}${uur}.`;
}
