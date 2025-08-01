export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Company Info */}
          <div>
            <h3 className="text-2xl font-bold mb-4">Crystal Services</h3>
            <p className="text-gray-300 mb-4">
              Professionele was-, strijk-, droog- en reinigingsdiensten in Borgerhout.
            </p>
            <p className="text-gray-300">
              Jouw tevredenheid is onze prioriteit.
            </p>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-xl font-semibold mb-4">Contact</h4>
            <div className="space-y-2 text-gray-300">
              <p>📍 Lodewijk van berckenlaan 189, 2140 Borgerhout</p>
              <p>📞 <a href="tel:0494403841" className="hover:text-white transition-colors">0494 40 38 41</a></p>
              <p>✉️ <a href="mailto:info@crystal-services.be" className="hover:text-white transition-colors">info@crystal-services.be</a></p>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="text-xl font-semibold mb-4">Diensten</h4>
            <ul className="space-y-2 text-gray-300">
              <li>• Strijken van kleding</li>
              <li>• Wassen en drogen</li>
              <li>• Reiniging delicate kledingstukken</li>
              <li>• Bedrijfskleding</li>
              <li>• Haal- en brengservice</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p className="text-gray-300 mb-4">
            © 2025 Crystal Services. Alle rechten voorbehouden.
          </p>
          <div className="flex justify-center">
            <a href="#" className="text-gray-400 hover:text-white transition-colors text-sm">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
