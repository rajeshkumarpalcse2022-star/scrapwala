"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Recycle, Menu, X, LogOut, CalendarCheck, History } from "lucide-react";
import Container from "@/components/common/Container";
import { useAuth } from "@/hooks/useAuth";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/scrap-rates", label: "Scrap Rates" },
  { href: "/blogs", label: "Blog" },
  { href: "/terms", label: "Terms" },
];

function getDashboardHref(role: string): { href: string; label: string } | null {
  switch (role) {
    case "admin":
      return { href: "/admin", label: "Dashboard" };
    case "collector":
      return { href: "/collector", label: "Dashboard" };
    default:
      // No customer dashboard in this project — user dropdown = Pickup History + Logout.
      return null;
  }
}

function getAvatarLabel(role: string): string {
  switch (role) {
    case "admin":
      return "A";
    case "collector":
      return "C";
    case "user":
      return "U";
    default:
      return "U";
  }
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleLogout = useCallback(async () => {
    setMenuOpen(false);
    setMobileOpen(false);
    await logout();
    // Existing logout clears the session; land on the public Home page.
    router.push("/");
  }, [logout, router]);

  const avatarLabel = user ? getAvatarLabel(user.role) : "U";

  const dashboard = user ? getDashboardHref(user.role) : null;

  // Only the normal user avatar opens a menu. Admin/collector avatars are
  // identity indicators only (their dashboards own Profile/Logout).
  const canOpenMenu = user?.role === "user";

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-black/10 bg-brand-cyan">
      <Container>
        <nav className="flex h-16 items-center justify-between" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl text-foreground">
            <Recycle className="h-6 w-6" aria-hidden="true" />
            <span>ScrapWala</span>
          </Link>

          {/* Desktop links */}
          <ul className="hidden items-center gap-1 lg:flex">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-primary-light hover:text-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Desktop auth area */}
          <div className="hidden items-center gap-2 lg:flex" ref={menuRef}>
            {!isLoading && user && (
              <div className="relative">
                {canOpenMenu ? (
                  <button
                    type="button"
                    onClick={() => setMenuOpen((open) => !open)}
                    aria-label="Open user menu"
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  >
                    {avatarLabel}
                  </button>
                ) : (
                  <span
                    title={user.name}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
                  >
                    {avatarLabel}
                  </span>
                )}

                {canOpenMenu && menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl border border-border bg-card shadow-lg"
                  >
                    <div className="border-b border-border px-4 py-3">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {user.name}
                      </p>
                      {user.email && (
                        <p className="truncate text-xs text-muted">{user.email}</p>
                      )}
                    </div>

                    {canOpenMenu && (
                      <Link
                        href="/pickup-history"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-primary-light hover:text-primary"
                      >
                        <History className="h-4 w-4" aria-hidden="true" />
                        Pickup History
                      </Link>
                    )}

                  {dashboard && (
                      <Link
                        href={dashboard.href}
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-foreground transition-colors hover:bg-primary-light hover:text-primary"
                      >
                        <CalendarCheck className="h-4 w-4" aria-hidden="true" />
                        {dashboard.label}
                      </Link>
                    )}

                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-primary-light hover:text-primary"
                    >
                      <LogOut className="h-4 w-4" aria-hidden="true" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile right side */}
          <div className="flex items-center gap-2 lg:hidden">
            {!isLoading && user && (
              canOpenMenu ? (
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open user menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
                >
                  {avatarLabel}
                </button>
              ) : (
                <span
                  title={user.name}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white"
                >
                  {avatarLabel}
                </span>
              )
            )}
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg p-2 text-foreground hover:bg-muted-light"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>
        </nav>
      </Container>
      </header>

      {/* Mobile menu overlay — must live outside <header>: its
          backdrop-filter would become the containing block for these
          fixed-position elements and collapse the drawer to header height. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 flex w-full max-w-sm flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-black/10 bg-brand-cyan px-4 py-4">
              <Link
                href="/"
                className="flex items-center gap-2.5 font-bold text-xl text-foreground"
                onClick={() => setMobileOpen(false)}
              >
                <Recycle className="h-6 w-6" aria-hidden="true" />
                <span>ScrapWala</span>
              </Link>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-lg p-2 text-foreground hover:bg-muted-light"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-4 py-4" aria-label="Mobile navigation">
              <ul className="space-y-1">
                {navLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="block rounded-lg px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-primary-light hover:text-primary"
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>

              {!isLoading && user && (
                <div className="mt-6 border-t border-border pt-4">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                      {avatarLabel}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {user.name}
                      </p>
                      {user.email && (
                        <p className="truncate text-xs text-muted">{user.email}</p>
                      )}
                    </div>
                  </div>

                  {canOpenMenu && (
                    <Link
                      href="/pickup-history"
                      className="mb-1 flex items-center gap-2 rounded-lg px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-primary-light hover:text-primary"
                      onClick={() => setMobileOpen(false)}
                    >
                      <History className="h-5 w-5" aria-hidden="true" />
                      Pickup History
                    </Link>
                  )}

                  {dashboard && (
                    <Link
                      href={dashboard.href}
                      className="block rounded-lg px-3 py-2.5 text-base font-medium text-foreground transition-colors hover:bg-primary-light hover:text-primary"
                      onClick={() => setMobileOpen(false)}
                    >
                      {dashboard.label}
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-base font-medium text-foreground transition-colors hover:bg-primary-light hover:text-primary"
                  >
                    <LogOut className="h-5 w-5" aria-hidden="true" />
                    Log out
                  </button>
                </div>
              )}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}