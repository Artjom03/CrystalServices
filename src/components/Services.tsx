import Image from "next/image";

export default function Services() {
  return (
    <section id="services" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Diensten
          </h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Service 1 */}
          <div className="text-center">
            <div className="mb-6">
              <Image
                src="/images/ironing_service.webp"
                alt="Strijken van kleding"
                width={400}
                height={300}
                className="rounded-lg shadow-lg w-full h-64 object-cover"
              />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Strijken van kleding
            </h3>
            <p className="text-gray-700">
              Het strijken van kleding zorgt voor een glad en verzorgd uiterlijk.
            </p>
          </div>

          {/* Service 2 */}
          <div className="text-center">
            <div className="mb-6">
              <Image
                src="/images/washing_service.webp"
                alt="Wassen en drogen"
                width={400}
                height={300}
                className="rounded-lg shadow-lg w-full h-64 object-cover"
              />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Wassen en drogen
            </h3>
            <p className="text-gray-700">
              Het wassen en drogen van beddengoed en handdoeken zorgt voor een frisse en 
              schone slaap- en badervaring.
            </p>
          </div>

          {/* Service 3 */}
          <div className="text-center">
            <div className="mb-6">
              <Image
                src="/images/dry_cleaning_service.webp"
                alt="Reiniging van delicate kledingstukken"
                width={400}
                height={300}
                className="rounded-lg shadow-lg w-full h-64 object-cover"
              />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Reiniging van delicate kledingstukken
            </h3>
            <p className="text-gray-700">
              Reiniging van delicate kledingstukken zorgt ervoor dat items zoals jurken en 
              colberts op een veilige en effectieve manier gereinigd worden zonder schade aan de stoffen.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
