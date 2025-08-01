"use client";

export default function InteractiveMap() {
  return (
    <div className="w-full">
      <div className="w-full h-96 rounded-lg shadow-md overflow-hidden">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2499.123456789!2d4.4025!3d51.2194!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47c3f6f2f2f2f2f2%3A0x123456789!2sLodewijk%20van%20berckenlaan%20189%2C%202140%20Borgerhout%2C%20Belgium!5e0!3m2!1snl!2sbe!4v1234567890123!5m2!1snl!2sbe"
          width="100%"
          height="400"
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Crystal Services Locatie - Lodewijk van berckenlaan 189, 2140 Borgerhout"
        />
      </div>
      
      {/* Contact Information Below Map */}
      <div className="bg-white p-6 mt-4 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          <div>
            <div className="mb-3">
              <svg className="w-8 h-8 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Adres</h3>
            <p className="text-gray-600">
              Lodewijk van berckenlaan 189<br />
              2140 Borgerhout
            </p>
          </div>
          
          <div>
            <div className="mb-3">
              <svg className="w-8 h-8 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Telefoon</h3>
            <p className="text-gray-600">
              <a href="tel:0494403841" className="hover:text-blue-600 transition-colors">
                0494 40 38 41
              </a>
            </p>
          </div>
          
          <div>
            <div className="mb-3">
              <svg className="w-8 h-8 mx-auto text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
            <p className="text-gray-600">
              <a href="mailto:info@crystal-services.be" className="hover:text-blue-600 transition-colors">
                info@crystal-services.be
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
