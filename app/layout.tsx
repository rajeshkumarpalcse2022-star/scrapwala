import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Scrapi | Doorstep Scrap Pickup & Recycling",
    template: "%s | Scrapi",
  },
  description:
    "Scrapi is a smart doorstep scrap pickup and recycling service. Schedule pickups, get the best rates for your scrap, and contribute to a greener planet.",
  keywords: [
    "scrap pickup",
    "recycling",
    "doorstep collection",
    "scrap rates",
    "sell scrap",
    "eco-friendly",
    "Scrapi",
  ],
  metadataBase: new URL("https://scrapi.in"),
  openGraph: {
    type: "website",
    locale: "en_IN",
    siteName: "Scrapi",
    title: "Scrapi | Doorstep Scrap Pickup & Recycling",
    description:
      "Schedule convenient doorstep scrap pickups and get the best value for your recyclables.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scrapi | Doorstep Scrap Pickup & Recycling",
    description:
      "Schedule convenient doorstep scrap pickups and get the best value for your recyclables.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1b7a3d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
