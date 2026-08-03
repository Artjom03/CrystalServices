import type { Metadata } from "next";
import "./globals.css";

export const metadata = {
  title: "Crystal Services | Wasserij & Strijkservice Borgerhout",
  description: "Professionele was-, strijk- en droogkuisdienst in Borgerhout. Snel, betrouwbaar, ook met dienstencheques. Bel 0494 40 38 41.",
  keywords: ["wasserij Borgerhout", "strijkservice Antwerpen", "droogkuis Borgerhout", "dienstencheques strijken"],
  openGraph: {
    title: "Crystal Services | Wasserij & Strijkservice Borgerhout",
    description: "Professionele was-, strijk- en droogkuisdienst in Borgerhout.",
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
    }),
  }}
/>
        {children}
      </body>
    </html>
  );
}
