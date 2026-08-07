import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Wassalon — Crystal Services | Was klaar binnen 60 minuten met Speed Queen",
  description:
    "Zelfbedieningswassalon van Crystal Services in Borgerhout: was uw kleding of linnen zelf met onze Amerikaanse Speed Queen machines, klaar binnen 60 minuten.",
};

const NAVY = "#0E1F42";
const NAVY_DEEP = "#081430";
const GOLD = "#B98D4A";
const GOLD_DEEP = "#96712F";
const INK = "#1B2422";
const INK_SOFT = "#565B63";
const LINE = "#DCD5C4";
const BG = "#F6F4EF";

const heading = { fontFamily: "'Fraunces', serif" };
const mono = { fontFamily: "'IBM Plex Mono', monospace" };

const stappen = [
  { num: "01", title: "Kom binnen", text: "Geen reservatie nodig — loop gewoon binnen tijdens de openingsuren." },
  { num: "02", title: "Kies uw machine", text: "7 kg en 14 kg machines beschikbaar — van een gewone was tot dekens en dekbedden." },
  { num: "03", title: "Was & droog", text: "Onze Speed Queen machines wassen snel en krachtig — klaar in ± 60 minuten." },
  { num: "04", title: "Klaar", text: "Netjes gewassen en droog, zo weer mee naar huis." },
];

const redenen = [
  "Snelle, krachtige wasbeurten — klaar binnen ± 60 minuten.",
  "Commerciële, robuuste machines voor een consistent resultaat.",
  "7 kg en 14 kg machines — ook geschikt voor grote lading: dekens, dekbedden, grote lakens.",
  "Hulp nodig? Wij staan vooraan in de zaak en helpen graag even.",
];

const uren: [string, string][] = [
  ["Maandag", "8:00 – 22:00"],
  ["Dinsdag", "8:00 – 22:00"],
  ["Woensdag", "8:00 – 22:00"],
  ["Donderdag", "8:00 – 22:00"],
  ["Vrijdag", "8:00 – 22:00"],
  ["Zaterdag", "8:00 – 22:00"],
  ["Zondag & feestdagen", "8:00 – 22:00"],
];

export default function WassalonPage() {
  return (
    <main style={{ background: BG, color: INK }} className="font-sans">
      {/* HERO */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p style={{ ...mono, color: NAVY_DEEP }} className="text-xs tracking-[0.14em] uppercase mb-4 flex items-center gap-2">
              <span style={{ width: 22, height: 1, background: GOLD, display: "inline-block" }} />
              Zelfbedieningswassalon · Borgerhout
            </p>
            <h1 style={heading} className="text-4xl md:text-5xl font-semibold leading-tight mb-5">
              Was klaar binnen 60 minuten.
            </h1>
            <p style={{ color: INK_SOFT }} className="text-lg max-w-[46ch] mb-8">
              Vooraan in onze zaak vindt u onze Amerikaanse Speed Queen wasmachines: krachtige,
              commerciële machines die uw was in amper 60 minuten klaar hebben. Geen afspraak
              nodig — gewoon binnenlopen tijdens de openingsuren.
            </p>
            <div className="flex gap-3 flex-wrap">
              <a
                href="#praktisch"
                style={{ background: NAVY }}
                className="text-white px-6 py-3 rounded-full font-semibold text-sm hover:opacity-90 transition"
              >
                Bekijk openingsuren
              </a>
              <a
                href="tel:0494403841"
                style={{ borderColor: LINE, color: INK }}
                className="border px-6 py-3 rounded-full font-semibold text-sm hover:border-current transition"
              >
                Vraag naar prijzen
              </a>
            </div>
          </div>

          <div
            style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)` }}
            className="rounded-[22px] p-10 flex items-center justify-center shadow-xl"
          >
            <svg width="62%" viewBox="0 0 160 160" xmlns="http://www.w3.org/2000/svg">
              <circle cx="80" cy="80" r="66" fill="none" stroke="rgba(247,245,238,0.15)" strokeWidth="11" />
              <circle
                cx="80"
                cy="80"
                r="66"
                fill="none"
                stroke={GOLD}
                strokeWidth="11"
                strokeDasharray="415"
                strokeDashoffset="110"
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
              />
              <circle cx="80" cy="80" r="44" fill="rgba(247,245,238,0.06)" />
              <text x="80" y="76" textAnchor="middle" fontFamily="Fraunces, serif" fontSize="26" fontWeight={600} fill="#F6F4EF">
                60′
              </text>
              <text x="80" y="97" textAnchor="middle" fontFamily="IBM Plex Mono, monospace" fontSize="9" letterSpacing="1" fill={GOLD}>
                SPEED QUEEN
              </text>
            </svg>
          </div>
        </div>
      </section>

      {/* HOE HET WERKT */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl mb-10">
            <p style={{ ...mono, color: NAVY_DEEP }} className="text-xs tracking-[0.14em] uppercase mb-3">
              Hoe het werkt
            </p>
            <h2 style={heading} className="text-3xl font-semibold">
              Vier stappen naar frisse was
            </h2>
          </div>
          <div style={{ borderColor: LINE }} className="grid sm:grid-cols-2 lg:grid-cols-4 bg-white border rounded-2xl overflow-hidden">
            {stappen.map((s, i) => (
              <div
                key={s.num}
                style={{ borderColor: LINE, borderRightWidth: i < stappen.length - 1 ? 1 : 0 }}
                className="p-6 border-b lg:border-b-0"
              >
                <span style={{ ...mono, color: GOLD_DEEP }} className="text-xs tracking-wide block mb-2">
                  {s.num}
                </span>
                <h3 style={heading} className="text-[15px] font-semibold mb-1.5">
                  {s.title}
                </h3>
                <p style={{ color: INK_SOFT }} className="text-[13.5px]">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WAAROM SPEED QUEEN */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div style={{ background: NAVY_DEEP }} className="rounded-[24px] p-10 md:p-14 grid md:grid-cols-2 gap-10 items-center text-white">
            <div>
              <p style={{ ...mono, color: GOLD }} className="text-xs tracking-[0.14em] uppercase mb-3">
                Onze machines
              </p>
              <h2 style={heading} className="text-2xl md:text-3xl font-semibold text-white mb-3">
                Amerikaanse Speed Queen kwaliteit
              </h2>
              <p className="text-white/80 max-w-[42ch]">
                Speed Queen is een gevestigd Amerikaans merk, bekend van commerciële wasserettes
                wereldwijd. Robuust gebouwd voor intensief gebruik, met een hoge centrifugesnelheid
                die uw droogtijd flink verkort.
              </p>
            </div>
            <ul className="grid gap-4">
              {redenen.map((r, i) => (
                <li key={i} className="flex gap-3 text-[15px]">
                  <span style={{ background: GOLD }} className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* OPENINGSTIJDEN */}
      <section id="praktisch" className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p style={{ ...mono, color: NAVY_DEEP }} className="text-xs tracking-[0.14em] uppercase mb-3">
              Praktisch
            </p>
            <h2 style={heading} className="text-3xl font-semibold mb-3">
              Kom gerust langs
            </h2>
            <p style={{ color: INK_SOFT }} className="mb-5">
              Voor de zelfbediening is het wassalon 7 dagen op 7 open, van 8:00 tot 22:00 uur —
              ook in het weekend en op feestdagen. Geen afspraak nodig.
            </p>
            <a href="/#contact" style={{ background: GOLD }} className="inline-block text-white px-6 py-3 rounded-full font-semibold text-sm">
              Contactgegevens
            </a>
          </div>
          <div style={{ borderColor: LINE }} className="bg-white border rounded-2xl overflow-hidden shadow-lg">
            <div style={{ background: NAVY }} className="text-white px-6 py-4 flex justify-between text-[11px] tracking-widest uppercase" >
              <span style={mono}>Crystal Services</span>
              <span style={mono}>Wassalon</span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {uren.map(([dag, uur]) => (
                  <tr key={dag} style={{ borderColor: LINE }} className="border-b last:border-b-0">
                    <td className="px-6 py-3 font-semibold">{dag}</td>
                    <td
                      style={{ ...mono, color: uur === "Gesloten" ? GOLD_DEEP : INK_SOFT }}
                      className="px-6 py-3 text-right text-[13px]"
                    >
                      {uur}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CROSS-LINKS */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p style={{ ...mono, color: NAVY_DEEP }} className="text-xs tracking-[0.14em] uppercase mb-3">
              Liever dat wij het overnemen?
            </p>
            <h2 style={heading} className="text-2xl font-semibold mb-3">
              Wij wassen en strijken het ook volledig voor u
            </h2>
            <p style={{ color: INK_SOFT }} className="mb-6">
              Geen zin om zelf te wassen? Breng uw kleding of linnen naar onze wasserij — wij
              wassen, drogen en strijken alles voor u, ook met dienstencheques. En voor horeca,
              salons of B&B's werken wij ook zakelijk, met vaste ophaal- en brengdagen.
            </p>
            <div className="flex gap-3 flex-wrap">
              <a href="/#diensten" style={{ background: NAVY }} className="text-white px-6 py-3 rounded-full font-semibold text-sm">
                Bekijk onze was- en strijkservice
              </a>
              <a href="/zakelijk" style={{ borderColor: LINE, color: INK }} className="border px-6 py-3 rounded-full font-semibold text-sm">
                Zakelijke klanten
              </a>
            </div>
          </div>
          <div style={{ background: NAVY_DEEP }} className="rounded-[20px] aspect-[16/11] flex items-center justify-center">
            <svg width="42%" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: GOLD }}>
              <path
                d="M6 2v4M18 2v4M3 9h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </section>
    </main>
  );
}
