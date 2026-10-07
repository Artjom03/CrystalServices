import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://crystal-services.be"),
  alternates: { canonical: "./" },
  icons: { icon: "/favicon-48.png", apple: "/apple-touch-icon.png" },
  title: "Crystal Services | Wasserij & Droogkuis Antwerpen (Borgerhout)",
  description: "Professionele was-, strijk-, droogkuis- en wetcleaningdienst in Antwerpen. Ook schoenen en sneakers, handtassen, motorkleding en leer. Snel, betrouwbaar, ook met dienstencheques. Bel 0494 40 38 41.",
  keywords: [
    "wasserij Antwerpen",
    "droogkuis Antwerpen",
    "wetcleaning Antwerpen",
    "strijkservice Antwerpen",
    "wasserij Borgerhout",
    "wasserij Deurne",
    "wasserij Berchem",
    "wasserij Merksem",
    "schoenen reinigen Antwerpen",
    "sneakers reinigen Antwerpen",
    "dienstencheques strijken",
  ],
  openGraph: {
    title: "Crystal Services | Wasserij & Droogkuis Antwerpen (Borgerhout)",
    description: "Professionele was-, strijk-, droogkuis- en wetcleaningdienst in Antwerpen.",
    url: "https://crystal-services.be",
    siteName: "Crystal Services",
    locale: "nl_BE",
    type: "website",
    images: [{ url: "/images/deelbeeld.jpg", width: 1200, height: 630 }],
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>
        {/* Google-tag met toestemmingsmodus: zonder "Akkoord" in de cookiemelding
            van de statische pagina's blijft meten met cookies uit. */}
        <Script id="ga-consent" strategy="afterInteractive">
          {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('consent', 'default', {ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied', analytics_storage:'denied'});
try { if (localStorage.getItem('cs-cookies') === 'ja') gtag('consent', 'update', {ad_storage:'granted', ad_user_data:'granted', ad_personalization:'granted', analytics_storage:'granted'}); } catch (e) {}
gtag('js', new Date());
gtag('config', 'G-FZ10NJFRPN');`}
        </Script>
        <Script src="https://www.googletagmanager.com/gtag/js?id=G-FZ10NJFRPN" strategy="afterInteractive" />
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
          closes: "11:00",
        },
        {
          "@type": "OpeningHoursSpecification",
          dayOfWeek: ["Monday","Tuesday","Wednesday","Thursday","Friday"],
          opens: "13:00",
          closes: "17:00",
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
        "Reiniging van schoenen en sneakers",
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
