"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Users,
  Truck,
  Tag,
  IndianRupee,
  MapPin,
  Clock,
  CreditCard,
  Receipt,
  BarChart3,
  Bell,
  Settings,
  X,
  LogOut,
} from "lucide-react";
import UnseenCountBadge from "@/components/UnseenCountBadge";
import { useUnseenPickupCount } from "@/hooks/useUnseenPickupCount";

const NAV_SECTIONS = [
  {
    label: "OVERVIEW",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { href: "/admin/pickups", label: "Pickups", icon: Package },
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/collectors", label: "Collectors", icon: Truck },
    ],
  },
  {
    label: "CATALOG",
    items: [
      { href: "/admin/categories", label: "Scrap Categories", icon: Tag },
      { href: "/admin/rates", label: "Scrap Rates", icon: IndianRupee },
    ],
  },
  {
    label: "SERVICE",
    items: [
      { href: "/admin/locations", label: "Locations", icon: MapPin },
      { href: "/admin/time-slots", label: "Time Slots", icon: Clock },
    ],
  },
  {
    label: "FINANCE",
    items: [
      { href: "/admin/payments", label: "Payments", icon: CreditCard },
      { href: "/admin/transactions", label: "Transactions", icon: Receipt },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "SYSTEM",
    items: [
      { href: "/admin/notifications", label: "Notifications", icon: Bell },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

interface AdminSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ open, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const unseenPickups = useUnseenPickupCount("admin");

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(href + "/");
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white">
      <div className="flex items-center justify-between px-6 py-5">
        <span className="text-xl font-bold text-green-600">
          ♻ ScrapWala Admin
        </span>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive(href)
                      ? "bg-primary text-white"
                      : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                  {href === "/admin/pickups" && (
                    <UnseenCountBadge count={unseenPickups} />
                  )}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t px-3 py-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            AD
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              Admin
            </p>
            <p className="text-xs text-gray-500 truncate">Super Admin</p>
          </div>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" });
            router.push("/");
          }}
          className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
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
          <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
          <div className="fixed inset-y-0 left-0 z-50 w-64">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
