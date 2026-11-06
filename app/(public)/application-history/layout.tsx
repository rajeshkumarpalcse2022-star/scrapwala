import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Application History",
  robots: { index: false, follow: false },
};

export default function ApplicationHistoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
