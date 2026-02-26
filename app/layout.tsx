import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://findvat.co.uk"),
  title: {
    default: "FindVAT: VAT Helper",
    template: "%s | FindVAT",
  },
  description: "A simple VAT helper to calculate and check VAT instantly.",
  openGraph: {
    type: "website",
    url: "https://findvat.co.uk",
    title: "FindVAT: VAT Helper",
    description: "A simple VAT helper to calculate and check VAT instantly.",
    siteName: "FindVAT",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 576,
        alt: "FindVAT: VAT Helper",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "FindVAT: VAT Helper",
    description: "A simple VAT helper to calculate and check VAT instantly.",
    images: ["/og.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
