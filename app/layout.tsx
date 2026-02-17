import type { Metadata } from "next";
import "./globals.css";
import { Roboto } from "next/font/google";

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kh-elevate.vercel.app"),

  title: "KH Elevate",
  description: "Strategic marketing systems built for ambitious brands.",

  openGraph: {
    title: "KH Elevate",
    description: "Strategic marketing systems built for ambitious brands.",
    url: "https://kh-elevate.vercel.app",
    siteName: "KH Elevate",
    type: "website",
    images: [
      {
        url: "/og-image.jpeg",
        width: 1200,
        height: 630,
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "KH Elevate",
    description: "Strategic marketing systems built for ambitious brands.",
    images: ["/og-image.jpeg"],
  },

  icons: {
    icon: "/logo.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${roboto.className} min-h-dvh bg-cream text-khgreen`}>
        {children}
      </body>
    </html>
  );
}
