import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pickup History",
  robots: { index: false, follow: false },
};

export default function PickupHistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
