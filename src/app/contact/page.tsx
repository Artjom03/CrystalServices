import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ContactForm from "@/components/ContactForm";
import InteractiveMap from "@/components/InteractiveMap";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact - Crystal Services",
  description: "Neem contact op met Crystal Services voor al uw was- en strijkbehoeften. Contactformulier, telefoonnummer en adresgegevens.",
  keywords: "contact, Crystal Services, contactformulier, telefoonnummer, adres, Borgerhout",
};

export default function Contact() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="pt-20">
        {/* Contact Form Section */}
        <section className="py-16 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Neem contact op
              </h1>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Wilt u ons contacteren? we zijn er voor u
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <ContactForm />
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="py-0">
          <InteractiveMap />
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
