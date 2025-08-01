"use client";

export default function Contact() {
  const handleEmailClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // Try to open email client
    const mailtoLink = "mailto:info@crystal-services.be?subject=Contact%20via%20Crystal%20Services%20website";
    
    // Create a temporary link to test if mailto works
    const tempLink = document.createElement('a');
    tempLink.href = mailtoLink;
    
    try {
      // Try to trigger mailto
      window.location.href = mailtoLink;
      
      // If mailto doesn't work after a short delay, redirect to contact page
      setTimeout(() => {
        if (document.hasFocus()) {
          // If the page still has focus after 1 second, mailto probably didn't work
          window.location.href = '/contact';
        }
      }, 1000);
    } catch (error) {
      // If mailto fails, redirect to contact page
      window.location.href = '/contact';
    }
  };

  return (
    <section id="contact" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Contact
          </h2>
          <p className="text-xl text-gray-600">
            Wilt u ons contacteren? we zijn er voor u
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-lg text-gray-700 mb-4">
              Heeft u geen tijd of zin meer om uw kleding zelf te wassen en strijken? Of heeft 
              u een dure jurk die u liever niet in de wasmachine doet? Dan bent u bij Crystal 
              Services aan het juiste adres! Wij zijn gespecialiseerd in het wassen, 
              strijken, drogen en droogkuis van kleding en textiel.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Address */}
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-4xl mb-4">📍</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Adres
              </h3>
              <p className="text-gray-700">
                Crystal Services<br />
                Lodewijk van berckenlaan 189<br />
                2140 Borgerhout
              </p>
            </div>

            {/* Phone */}
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-4xl mb-4">📞</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Telefoonnummer
              </h3>
              <p className="text-gray-700">
                <a 
                  href="tel:0494403841" 
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  0494 40 38 41
                </a>
              </p>
            </div>

            {/* Email */}
            <div className="bg-white p-6 rounded-lg shadow-md text-center">
              <div className="text-4xl mb-4">✉️</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                E-mailadres
              </h3>
              <p className="text-gray-700">
                <a 
                  href="mailto:info@crystal-services.be" 
                  className="text-blue-600 hover:text-blue-800 transition-colors"
                >
                  info@crystal-services.be
                </a>
              </p>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="text-center mt-12">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="tel:0494403841" 
                className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors text-lg font-semibold"
              >
                Bel nu
              </a>
              <button 
                onClick={handleEmailClick}
                className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 transition-colors text-lg font-semibold cursor-pointer"
              >
                E-mail versturen
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
