import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Algemene Voorwaarden - Crystal Services",
  description: "Lees de algemene voorwaarden van Crystal Services voor onze wasophaling en haal- en brengservice.",
  keywords: "algemene voorwaarden, Crystal Services, wasophaling, voorwaarden, service",
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
                  Crystal Services en de klant met betrekking tot wasophaling.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 2</h2>
                <p className="text-gray-700">
                  De kosten van wasophaling bedragen minimaal €50.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 3</h2>
                <p className="text-gray-700">
                  Binnen een straal van 3 kilometer van het adres van Crystal Services (Lodewijk van 
                  Berckenlaan 189, 2140 Antwerpen) is de ophaling gratis.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 4</h2>
                <p className="text-gray-700 space-y-2">
                  <span className="block">
                    Binnen een straal van 3 kilometer van het adres van Crystal Services is de ophaling gratis.
                  </span>
                  <span className="block">
                    Voor ophalingen buiten een straal van 3 kilometer wordt telefonisch contact 
                    opgenomen om de kosten te bespreken.
                  </span>
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 5</h2>
                <p className="text-gray-700">
                  De klant dient de was klaar te leggen in een afgesloten zak, tas of mand.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 6</h2>
                <p className="text-gray-700">
                  Crystal Services behoudt zich het recht voor om de was te weigeren indien deze niet 
                  voldoet aan de eisen.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 7</h2>
                <p className="text-gray-700">
                  Crystal Services zal de was op de afgesproken dag weer terugbrengen bij de klant.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 8</h2>
                <p className="text-gray-700">
                  De klant is aansprakelijk voor eventuele schade aan de was tijdens de ophaling of 
                  het transport. Crystal Services is niet aansprakelijk voor eventuele schade aan de 
                  was, ongeacht de oorzaak.
                </p>
              </div>

              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-3">Artikel 9</h2>
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
