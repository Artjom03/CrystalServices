import Image from "next/image";

export default function Hero() {
  return (
    <section id="home" className="pt-20 bg-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Maak kennis met Crystal Services
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Jouw tevredenheid is onze prioriteit
            </p>
            <p className="text-lg text-gray-700 mb-12">
              &quot;Crystal Services biedt een uitgebreid scala aan diensten op het gebied van 
              strijken, wassen, drogen en droogkuis, zodat u meer tijd heeft voor de belangrijke 
              dingen in het leven.&quot;
            </p>
            <a 
              href="#contact" 
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold"
            >
              Contact
            </a>
          </div>
          <div className="flex justify-center">
            <Image
              src="/images/foled_towels.webp"
              alt="Gevouwen handdoeken en linnen"
              width={600}
              height={400}
              className="rounded-lg shadow-lg"
              priority
            />
          </div>
        </div>
      </div>

      {/* Ironing Service Section */}
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <Image
                src="/images/tired_woman_ironing.webp"
                alt="Vermoeide vrouw bij het strijken"
                width={600}
                height={400}
                className="rounded-lg shadow-lg w-full"
              />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                Strijken Beu? Of gewoon geen tijd? 
                Wij doen het graag voor u.
              </h2>
              <div className="bg-gray-900 text-white px-4 py-2 rounded-lg inline-block mb-6">
                <strong>Snelle Service!</strong>
                <br />
                Wij bieden een haal- en brengservice aan, ook voor strijkwerk met dienstencheques.
              </div>
              <p className="text-lg text-gray-700 mb-6">
                Is strijken voor jou een lastige klus? Of besteed je je vrije tijd liever aan 
                andere dingen? Wij hebben de oplossing! Breng je strijkgoed naar <strong>Crystal Services</strong> of laat ons het ophalen. 
                Wij zorgen ervoor dat alles netjes wordt gestreken, precies zoals jij het wilt.
              </p>
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Daarnaast bieden wij ook:</h3>
                <ul className="space-y-2 text-gray-700">
                  <li>• Was-, reinigings- en droogdiensten</li>
                </ul>
              </div>
              <p className="text-lg text-gray-700 mb-6">
                <strong>Ophalen en leveren is mogelijk na 18.30 uur.</strong>
              </p>
              <p className="text-lg text-gray-700 mb-8">
                Bij een minimale besteding van € 50,- kunt u gebruikmaken van onze gratis haal- en brengservice!
              </p>
              <a 
                href="/mijn-was-ophalen" 
                className="inline-block bg-gray-900 text-white px-8 py-3 hover:bg-gray-800 transition-colors text-lg font-semibold"
              >
                Mijn was ophalen
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Satisfaction Section */}
      <div className="bg-blue-600 py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Image
                src="/images/happy_woman_ironing.jpeg"
                alt="Tevreden vrouw bij het strijken"
                width={600}
                height={400}
                className="rounded-lg shadow-lg w-full"
              />
            </div>
            <div className="text-white">
              <h2 className="text-3xl md:text-4xl font-bold mb-8">
                Jouw tevredenheid is onze prioriteit
              </h2>
              <p className="text-lg mb-6">
                Bij ons kunt u terecht voor het reinigen en strijken van:
              </p>
              <ul className="space-y-3 text-lg">
                <li className="flex items-center">
                  <span className="mr-3">▶</span>
                  Bad- en tafellinnen
                </li>
                <li className="flex items-center">
                  <span className="mr-3">▶</span>
                  Horecakleding
                </li>
                <li className="flex items-center">
                  <span className="mr-3">▶</span>
                  Alledaagse kleding
                </li>
                <li className="flex items-center">
                  <span className="mr-3">▶</span>
                  Bedrijfskleding
                </li>
                <li className="flex items-center">
                  <span className="mr-3">▶</span>
                  Strijk- en perswerk
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
