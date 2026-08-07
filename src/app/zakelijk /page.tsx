import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zakelijke klanten — Crystal Services | Was & strijk voor horeca, salons en praktijken",
  description:
    "Crystal Services verzorgt linnen en bedrijfskleding voor horeca, kapsalons, B&B's en praktijken in Borgerhout. Vaste ophaaldagen, vaste kwaliteit.",
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

const doelgroepen = [
  {
    tag: "Horeca",
    title: "Tafellinnen & keukentextiel",
    text: "Servetten, tafelkleden, keukendoeken en schorten, hygiënisch gewassen en op tijd terug.",
  },
  {
    tag: "Salons",
    title: "Handdoeken & kapmantels",
    text: "Voor kapsalons en beautysalons: altijd een frisse voorraad klaar, zonder zelf te wassen.",
  },
  {
    tag: "B&B & kleine hotels",
    title: "Lakens & badtextiel",
    text: "Zorgvuldig gewassen beddengoed en handdoeken, aangepast aan uw wisseldagen.",
  },
  {
    tag: "Praktijken & kantoren",
    title: "Bedrijfskleding",
    text: "Professionele reiniging van werkkledij, zodat uw team er elke dag verzorgd bij loopt.",
  },
];

const stappen = [
  { num: "01", title: "Wij stemmen af", text: "Korte kennismaking: welk textiel, welk volume, welke dagen passen bij uw zaak." },
  { num: "02", title: "Wij halen op", text: "Op de afgesproken dag komen wij langs — geen extra verplaatsing voor u." },
  { num: "03", title: "Wij brengen terug", text: "Gewassen, gestreken en klaar voor gebruik, telkens op hetzelfde vaste moment." },
];

const redenen = [
  "Vast aanspreekpunt — u weet altijd wie er voor uw linnen zorgt.",
  "Vaste, betrouwbare ophaal- en brengdagen.",
  "Zorgvuldige behandeling, ook van delicate stoffen.",
  "Lokaal gevestigd in Borgerhout, snel bereikbaar.",
];

export default function ZakelijkPage() {
  return (
    <main style={{ background: BG, color: INK }} className="font-sans">
      {/* HERO */}
      <section className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-14 items-center">
          <div>
            <p style={{ ...mono, color: NAVY_DEEP }} className="text-xs tracking-[0.14em] uppercase mb-4 flex items-center gap-2">
              <span style={{ width: 22, height: 1, background: GOLD, display: "inline-block" }} />
              Zakelijke klanten
            </p>
            <h1 style={heading} className="text-4xl md:text-5xl font-semibold leading-tight mb-5">
              Vast linnen. Vaste dagen. Geen omkijken naar.
            </h1>
            <p style={{ color: INK_SOFT }} className="text-lg max-w-[46ch] mb-8">
              Wij halen het linnen, de handdoeken of de bedrijfskleding van uw zaak op, wassen en
              strijken alles zoals afgesproken, en brengen het terug — op vaste dagen, elke week
              opnieuw.
            </p>
            <div className="flex gap-3 flex-wrap">
              <a
                href="#contact"
                style={{ background: NAVY }}
                className="text-white px-6 py-3 rounded-full font-semibold text-sm hover:opacity-90 transition"
              >
                Vraag een offerte
              </a>
              <a
                href="#hoe"
                style={{ borderColor: LINE, color: INK }}
                className="border px-6 py-3 rounded-full font-semibold text-sm hover:border-current transition"
              >
                Hoe het werkt
              </a>
            </div>
          </div>

          <div
            style={{ background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)` }}
            className="rounded-[22px] p-10 flex items-center justify-center shadow-xl"
          >
            <div className="grid grid-cols-5 gap-2 w-full max-w-xs">
              {["MA", "DI", "WO", "DO", "VR"].map((d) => {
                const active = d === "MA" || d === "DO";
                return (
                  <div
                    key={d}
                    style={{
                      background: active ? GOLD : "rgba(247,245,238,0.10)",
                      color: active ? NAVY_DEEP : "rgba(247,245,238,0.6)",
                    }}
                    className="rounded-lg text-center py-4 text-xs font-bold"
                  >
                    {d}
                    {active && (
                      <div className="text-[9px] font-medium mt-1 opacity-90">
                        {d === "MA" ? "ophalen" : "terug"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* VOOR WIE */}
      <section id="voorwie" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl mb-10">
            <p style={{ ...mono, color: NAVY_DEEP }} className="text-xs tracking-[0.14em] uppercase mb-3">
              Voor wie
            </p>
            <h2 style={heading} className="text-3xl font-semibold mb-3">
              Wij werken voor zaken die op tijd, elke keer, verzorgd textiel nodig hebben
            </h2>
            <p style={{ color: INK_SOFT }}>
              Van tafellinnen tot bedrijfskleding: wij passen ons aan uw volume en ritme aan.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {doelgroepen.map((d) => (
              <div key={d.title} style={{ borderColor: LINE }} className="bg-white border rounded-2xl p-6">
                <span
                  style={{ background: "#E4EAF1", color: NAVY_DEEP }}
                  className="inline-block text-[11px] font-bold uppercase tracking-wide px-3 py-1 rounded-full mb-4"
                >
                  {d.tag}
                </span>
                <h3 style={heading} className="text-base font-semibold mb-2">
                  {d.title}
                </h3>
                <p style={{ color: INK_SOFT }} className="text-sm">
                  {d.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOE HET WERKT */}
      <section id="hoe" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-xl mb-10">
            <p style={{ ...mono, color: NAVY_DEEP }} className="text-xs tracking-[0.14em] uppercase mb-3">
              Hoe het werkt
            </p>
            <h2 style={heading} className="text-3xl font-semibold">
              Drie stappen, verder geen gedoe
            </h2>
          </div>
          <div style={{ borderColor: LINE }} className="grid sm:grid-cols-3 bg-white border rounded-2xl overflow-hidden">
            {stappen.map((s, i) => (
              <div
                key={s.num}
                style={{ borderColor: LINE, borderRightWidth: i < stappen.length - 1 ? 1 : 0 }}
                className="p-7 border-b sm:border-b-0"
              >
                <span style={{ ...mono, color: GOLD_DEEP }} className="text-xs tracking-wide block mb-2">
                  {s.num}
                </span>
                <h3 style={heading} className="text-base font-semibold mb-1.5">
                  {s.title}
                </h3>
                <p style={{ color: INK_SOFT }} className="text-sm">
                  {s.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WAAROM */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div style={{ background: NAVY_DEEP }} className="rounded-[24px] p-10 md:p-14 grid md:grid-cols-2 gap-10 items-center text-white">
            <div>
              <p style={{ ...mono, color: GOLD }} className="text-xs tracking-[0.14em] uppercase mb-3">
                Waarom bedrijven ons kiezen
              </p>
              <h2 style={heading} className="text-2xl md:text-3xl font-semibold text-white mb-3">
                Persoonlijk, lokaal en betrouwbaar
              </h2>
              <p className="text-white/80 max-w-[42ch]">
                Wij zijn klein en lokaal — dat betekent dat u altijd met dezelfde mensen te maken
                heeft, en dat kwaliteit en planning nooit aan het toeval overgelaten worden.
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

      {/* CONTACT CTA */}
      <section id="contact" className="py-16 px-6">
        <div
          style={{ background: "#FBEDD8", borderColor: "#EFD9AE" }}
          className="max-w-6xl mx-auto border rounded-2xl p-10 flex flex-wrap items-center justify-between gap-6"
        >
          <div>
            <h3 style={heading} className="text-xl font-semibold mb-1">
              Benieuwd wat het voor uw zaak zou kosten?
            </h3>
            <p style={{ color: INK_SOFT }} className="text-sm">
              Bel of mail ons met uw volume en wensen — wij stellen vrijblijvend een voorstel op.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <a
              href="tel:0494403841"
              style={{ background: NAVY }}
              className="text-white px-6 py-3 rounded-full font-semibold text-sm"
            >
              Bel 0494 40 38 41
            </a>
            <a
              href="mailto:info@crystal-services.be?subject=Aanvraag%20zakelijke%20samenwerking"
              style={{ borderColor: NAVY, color: NAVY_DEEP }}
              className="border px-6 py-3 rounded-full font-semibold text-sm"
            >
              E-mail ons
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
