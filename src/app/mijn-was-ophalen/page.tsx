import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PickupForm from "@/components/PickupForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mijn was ophalen - Crystal Services",
  description: "Plan uw gratis ophaal- en leverservice in bij Crystal Services. Minimale besteding €50 voor gratis service binnen 3km van onze locatie.",
  keywords: "was ophalen, haal- en brengservice, Crystal Services, gratis ophaalservice, wasservice, Borgerhout",
};

export default function MijnWasOphalen() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Mijn was ophalen
              </h1>
              <div className="max-w-4xl mx-auto space-y-4 text-lg text-gray-700">
                <p>
                  Ophalen en leveren is mogelijk na 18.30 uur. Bij een <span className="font-semibold">minimale besteding</span> van € 50,- kunt u gebruikmaken van onze <span className="font-semibold">gratis haal- en brengservice</span>, binnen een straal van 3 km van onze locatie!
                </p>
                
                <p>
                  Om gebruik te maken van onze haal- en brengservice vragen wij u vriendelijk het formulier in te vullen. Vermeld hierbij ook de gewenste datum en tijd waarop wij uw was kunnen ophalen.
                </p>
                
                <p>
                  Na het verzenden van het formulier nemen wij telefonisch contact met u op om de dag van ophalen en terugbrengen te bevestigen.
                </p>
              </div>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <PickupForm />
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
