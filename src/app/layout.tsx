import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crystal Services - Professionele Was- en Strijkdiensten",
  description: "Crystal Services biedt uitgebreide was-, strijk-, droog- en reinigingsdiensten in Borgerhout. Haal- en brengservice beschikbaar.",
  keywords: "wasserij, strijkservice, droogkuis, Borgerhout, haal- en brengservice",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.svg', type: 'image/svg+xml' }
    ],
    apple: [
      { url: '/apple-icon.svg', sizes: '180x180', type: 'image/svg+xml' }
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
