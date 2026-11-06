import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Schedule a Scrap Pickup",
  description:
    "Book a doorstep scrap pickup with Scrapi after signing in to your customer account.",
  robots: { index: false, follow: false },
};

export default function PickupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
