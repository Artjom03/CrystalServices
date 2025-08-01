export default function OpeningHours() {
  const hours = [
    { day: "MAANDAG", time: "8:00 - 18:00" },
    { day: "DINSDAG", time: "8:00 - 18:00" },
    { day: "WOENSDAG", time: "8:00 - 18:00" },
    { day: "DONDERDAG", time: "8:00 - 18:00" },
    { day: "VRIJDAG", time: "8:00 - 18:00" },
    { day: "ZATERDAG", time: "GESLOTEN" },
    { day: "ZONDAG EN FEESTDAGEN", time: "GESLOTEN" }
  ];

  return (
    <section id="hours" className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Openingstijden
          </h2>
        </div>
        
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {hours.map((item, index) => (
              <div 
                key={index}
                className={`flex justify-between items-center p-4 ${
                  index !== hours.length - 1 ? "border-b border-gray-200" : ""
                } ${
                  item.time === "GESLOTEN" ? "bg-red-50" : "bg-white"
                }`}
              >
                <span className="font-semibold text-gray-900">{item.day}</span>
                <span className={`font-medium ${
                  item.time === "GESLOTEN" ? "text-red-600" : "text-gray-700"
                }`}>
                  {item.time}
                </span>
              </div>
            ))}
          </div>
          
          <div className="mt-8 text-center">
            <p className="text-gray-600 mb-4">
              Ophalen en leveren is mogelijk na 18.30 uur
            </p>
            <div className="bg-green-100 border border-green-300 rounded-lg p-4">
              <p className="text-green-800 font-medium">
                💡 Bij een minimale besteding van € 50,- kunt u gebruikmaken van onze gratis haal- en brengservice!
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
