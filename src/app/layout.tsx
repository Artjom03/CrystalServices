import type { Metadata } from "next";
import "./globals.css";
import ClosedNotice from "@/components/ClosedNotice";

export const metadata: Metadata = {
  title: "Crystal Services - Professionele Was- en Strijkdiensten",
  description: "Crystal Services biedt uitgebreide was-, strijk-, droog- en reinigingsdiensten in Borgerhout.",
  keywords: "wasserij, strijkservice, droogkuis, Borgerhout",
  icons: {
    icon: '/icon.svg',
    apple: '/apple-icon.svg',
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
        <ClosedNotice />
        {children}
      </body>
    </html>
  );
}
