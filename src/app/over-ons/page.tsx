import Image from "next/image";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Over ons - Crystal Services",
  description: "Leer meer over Crystal Services, een familiebedrijf met meer dan 25 jaar ervaring in professionele was- en strijkdiensten in Borgerhout.",
  keywords: "over ons, Crystal Services, familiebedrijf, ervaring, wasserij, strijkservice",
};

export default function OverOns() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="pt-20">
        {/* Hero Section */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <Image
                  src="/images/clean_business_clothing.webp"
                  alt="Schone bedrijfskleding"
                  width={600}
                  height={400}
                  className="rounded-lg shadow-lg w-full"
                />
              </div>
              <div>
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-8">
                  Over ons
                </h1>
                <div className="space-y-6 text-gray-700">
                  <p>
                    <strong>Crystal Services</strong> is een recent opgericht familiebedrijf (gestart in 2018). 
                    Ondanks dat we een jong bedrijf zijn, bieden we hoogwaardige services 
                    dankzij onze jarenlange ervaring en de geavanceerde apparatuur waarmee 
                    we werken.
                  </p>
                  
                  <p>
                    Met meer dan 25 jaar ervaring als technicus en programmeur van 
                    professionele en industriële wasserijaparatuur, heb ik een grondige 
                    expertise opgebouwd in deze sector. Mijn vrouw brengt daarnaast meer 
                    dan 15 jaar ervaring in de wasserij- en strijkbranche met zich mee. 
                    Hierdoor kunt u erop vertrouwen dat uw kleding bij ons in goede handen is.
                  </p>
                  
                  <p>
                    Ons doel is om van <strong>Crystal Services</strong> een toonaangevende naam te maken 
                    die bekendstaat om uitstekende kwaliteit en service.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
