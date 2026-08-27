import type { Metadata } from "next";
import "./globals.css";

export const metadata = {
  title: "Crystal Services | Wasserij & Droogkuis Antwerpen (Borgerhout)",
  description: "Professionele was-, strijk-, droogkuis- en wetcleaningdienst in Antwerpen. Ook handtassen, motorkleding en leer. Snel, betrouwbaar, ook met dienstencheques. Bel 0494 40 38 41.",
  keywords: [
    "wasserij Antwerpen",
    "droogkuis Antwerpen",
    "wetcleaning Antwerpen",
    "strijkservice Antwerpen",
    "wasserij Borgerhout",
    "wasserij Deurne",
    "wasserij Berchem",
    "wasserij Merksem",
    "dienstencheques strijken",
  ],
  openGraph: {
    title: "Crystal Services | Wasserij & Droogkuis Antwerpen (Borgerhout)",
    description: "Professionele was-, strijk-, droogkuis- en wetcleaningdienst in Antwerpen.",
    url: "https://crystal-services.be",
    siteName: "Crystal Services",
    locale: "nl_BE",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>
        <script
  type="application/ld+json"
  dangerouslySetInnerHTML={{
    __html: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "LaundryOrDryCleaning",
      name: "Crystal Services",
      "@id": "https://crystal-services.be",
      url: "https://crystal-services.be",
      telephone: "+32494403841",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Lodewijk van Berckenlaan 189",
        addressLocality: "Borgerhout",
        postalCode: "2140",
        addressCountry: "BE",
      },
      openingHoursSpecification: [
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"],
          opens: "08:00",
          closes: "18:00",
        },
      ],
      priceRange: "€€",
      makesOffer: [
        "Droogkuis",
        "Wetcleaning",
        "Strijken van kleding",
        "Wassen en drogen",
        "Reiniging van handtassen",
        "Reiniging van motorkleding",
        "Reiniging van leren kledij",
        "Bedrijfskleding reinigen",
      ].map((name) => ({
        "@type": "Offer",
        itemOffered: { "@type": "Service", name },
      })),
      areaServed: [
        { "@type": "City", name: "Antwerpen" },
        { "@type": "AdministrativeArea", name: "Borgerhout" },
        { "@type": "AdministrativeArea", name: "Deurne" },
        { "@type": "AdministrativeArea", name: "Berchem" },
        { "@type": "AdministrativeArea", name: "Merksem" },
      ],
    }),
  }}
/>
        {children}
      </body>
    </html>
  );
}
