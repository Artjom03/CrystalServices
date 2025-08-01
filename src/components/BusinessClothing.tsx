import Image from "next/image";

export default function BusinessClothing() {
  return (
    <section className="py-16 bg-gray-900 text-white">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <Image
              src="/images/business_clothing.webp"
              alt="Bedrijfskleding"
              width={600}
              height={400}
              className="rounded-lg shadow-lg w-full"
            />
          </div>
          <div>
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              bedrijfskleding
            </h2>
            <p className="text-lg mb-8">
              U kunt uw bedrijfskleding door ons op professionele wijze laten wassen zodat u 
              altijd over een schoon en frisse outfit beschikt. Behalve dat dit een 
              veelzeggende indruk achterlaat bij uw klanten, geeft dit ook meer zelfvertrouwen aan de 
              werknemer zelf.
            </p>
            <a 
              href="#contact" 
              className="inline-block bg-white text-gray-900 px-8 py-3 hover:bg-gray-100 transition-colors text-lg font-semibold"
            >
              Contact
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
