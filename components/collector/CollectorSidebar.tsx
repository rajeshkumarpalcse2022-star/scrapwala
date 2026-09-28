"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Calendar,
  Clock,
  CheckCircle,
  Bell,
  User,
  LogOut,
  X,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/collector", label: "Dashboard", icon: LayoutDashboard },
  { href: "/collector/pickups", label: "Today's Pickups", icon: Calendar },
  { href: "/collector/pickups/upcoming", label: "Upcoming Pickups", icon: Clock },
  { href: "/collector/pickups/completed", label: "Completed", icon: CheckCircle },
  { href: "/collector/notifications", label: "Notifications", icon: Bell },
  { href: "/collector/profile", label: "Profile", icon: User },
];

interface CollectorSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function CollectorSidebar({ open, onClose }: CollectorSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) => {
    if (href === "/collector") return pathname === "/collector";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between px-6 py-5">
        <span className="text-xl font-bold text-green-600">♻ ScrapWala</span>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              isActive(href)
                ? "bg-primary text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="border-t px-3 py-3">
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/");
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          <LogOut className="h-5 w-5" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col border-r bg-white">
        {sidebarContent}
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 z-50 w-64">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
