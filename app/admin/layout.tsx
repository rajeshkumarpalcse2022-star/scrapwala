"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="hidden lg:flex">
        <AdminSidebar open={false} onClose={closeSidebar} />
        <main className="flex-1 ml-64 min-h-screen overflow-y-auto">
          <AdminHeader onMenuClick={() => setSidebarOpen(true)} />
          <div className="p-6">{children}</div>
        </main>
      </div>

      <div className="lg:hidden">
        <div className="sticky top-0 z-40 bg-white border-b px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">ScrapWala Admin</h1>
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {sidebarOpen && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={closeSidebar}
              aria-hidden="true"
            />
            <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl">
              <div className="flex justify-end p-4">
                <button
                  onClick={closeSidebar}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <AdminSidebar open={sidebarOpen} onClose={closeSidebar} />
            </div>
          </div>
        )}

        <main className="min-h-screen overflow-y-auto p-4">{children}</main>
      </div>
    </div>
  );
}
