import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Algemene Voorwaarden - Crystal Services",
  description: "Lees de algemene voorwaarden van Crystal Services voor onze was- en strijkdiensten.",
  keywords: "algemene voorwaarden, Crystal Services, wasserij, strijkservice, voorwaarden, service",
};

export default function AlgemeneVoorwaarden() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="pt-20">
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8 text-center">
              Algemene Voorwaarden
            </h1>
            
            <div className="bg-white rounded-lg shadow-lg p-8 space-y-8">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 1</h2>
                <p className="text-gray-700">
                  Deze algemene voorwaarden zijn van toepassing op alle overeenkomsten tussen 
                  Crystal Services en de klant met betrekking tot onze was-, strijk- en droogkuisdiensten.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 2</h2>
                <p className="text-gray-700">
                  De prijzen voor onze diensten worden duidelijk gecommuniceerd in het filiaal en/of via de
                  communicatiekanalen van Crystal Services. Eventuele wijzigingen in prijzen worden vooraf
                  bekendgemaakt.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 3</h2>
                <p className="text-gray-700">
                  De klant dient de was aan te leveren in een geschikte zak, tas of mand en is verantwoordelijk
                  voor het correct sorteren van delicate of speciale stukken.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 4</h2>
                <p className="text-gray-700">
                  Crystal Services behoudt zich het recht voor om was te weigeren indien deze niet voldoet aan
                  de hygiëne- of veiligheidseisen.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 5</h2>
                <p className="text-gray-700">
                  Crystal Services behandelt alle was met de grootst mogelijke zorg, maar is niet aansprakelijk
                  voor normale slijtage of reeds aanwezige schade aan textiel.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 6</h2>
                <p className="text-gray-700">
                  De klant wordt geïnformeerd over het moment waarop de was klaar is voor afhaling in het filiaal.
                  Was die niet tijdig wordt afgehaald, kan na een redelijke termijn kosten met zich meebrengen voor
                  opslag.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 7</h2>
                <p className="text-gray-700">
                  De klant is aansprakelijk voor het correct doorgeven van contactgegevens. Crystal Services kan
                  niet verantwoordelijk worden gehouden indien de klant onbereikbaar is.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 8</h2>
                <p className="text-gray-700">
                  Op deze algemene voorwaarden is Belgisch recht van toepassing.
                </p>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-gray-600">
                Voor vragen over deze algemene voorwaarden kunt u contact opnemen via{" "}
                <a href="mailto:info@crystal-services.be" className="text-blue-600 hover:text-blue-800 underline">
                  info@crystal-services.be
                </a>{" "}
                of{" "}
                <a href="tel:0494403841" className="text-blue-600 hover:text-blue-800 underline">
                  0494 40 38 41
                </a>.
              </p>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
