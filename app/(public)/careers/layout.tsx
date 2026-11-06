import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers",
  description:
    "Explore current openings and apply to join the Scrapi team. Applications require a Scrapi customer account.",
  robots: { index: false, follow: false },
};

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
