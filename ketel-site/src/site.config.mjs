// ============================================================
//  BEDRIJFSGEGEVENS – pas alleen dit bestand aan.
//  Zolang hier nog voorbeeldgegevens staan, blijft de website
//  verborgen voor Google (noindex) en wordt er geen sitemap gemaakt.
// ============================================================

export const site = {
  naam: 'Haard & Ketel',                 // bedrijfsnaam zoals klanten hem zien
  slogan: 'Verwarming & sanitair',
  telefoon: '03 000 00 00',              // zoals het op de site moet staan
  telefoonLink: '+3230000000',           // zelfde nummer, internationaal en zonder spaties
  email: 'info@voorbeeld.be',
  straat: '',                            // bv. 'Kerkstraat 12' (leeg laten als je geen zaak met adres hebt)
  postcode: '2000',
  gemeente: 'Antwerpen',
  btw: 'BE 0000.000.000',
  domein: '',                            // bv. 'https://www.jouwbedrijf.be' (leeg = het Netlify-adres)
  openingsuren: 'Ma–vr 8:00–18:00',
  weekendStoringen: true,                // true = "storingen ook in het weekend" tonen
  regio: 'Antwerpen en omstreken',
  werkgebied: ['Antwerpen', 'Borgerhout', 'Deurne', 'Berchem', 'Merksem', 'Wilrijk', 'Mortsel', 'Edegem', 'Schoten', 'Wijnegem', 'Kontich', 'Brasschaat'],
  // Echte reviews van klanten (met hun toestemming). Leeg = het blok wordt niet getoond.
  reviews: [
    // { tekst: 'Snel geholpen en alles netjes opgeruimd.', naam: 'Marc', gemeente: 'Deurne' },
  ],
};

/** Staan er nog voorbeeldgegevens in? Dan blijft de site uit Google. */
export const isVoorbeeld = /voorbeeld|0000/.test(site.email + site.telefoon + site.btw);
