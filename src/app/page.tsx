import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Services from "@/components/Services";
import OpeningHours from "@/components/OpeningHours";
import BusinessClothing from "@/components/BusinessClothing";
import Contact from "@/components/Contact";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Services />
      <OpeningHours />
      <BusinessClothing />
      <Contact />
      <Footer />
    </main>
  );
}
