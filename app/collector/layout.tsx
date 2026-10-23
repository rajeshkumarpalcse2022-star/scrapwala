"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu } from "lucide-react";
import CollectorSidebar from "@/components/collector/CollectorSidebar";
import CollectorHeader from "@/components/collector/CollectorHeader";
import NotificationBell from "@/components/collector/NotificationBell";

export default function CollectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="hidden lg:flex">
        <CollectorSidebar open={false} onClose={closeSidebar} />
        <main className="flex-1 ml-64 min-h-screen overflow-y-auto">
          <CollectorHeader onMenuClick={() => setSidebarOpen(true)} />
          <div className="p-6">{children}</div>
        </main>
      </div>

      <div className="lg:hidden">
        <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-lg font-semibold hover:text-primary"
          >
            ScrapWala
          </Link>
          <div className="flex items-center gap-1">
            <NotificationBell />
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {sidebarOpen && (
          <CollectorSidebar open={sidebarOpen} onClose={closeSidebar} />
        )}

        <main className="min-h-screen overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  );
}
