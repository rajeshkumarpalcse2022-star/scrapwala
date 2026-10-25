import Link from "next/link";
import Logo from "@/components/common/Logo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <Logo className="h-8 w-auto" priority />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted">
        &copy; {new Date().getFullYear()} ScrapWala. All rights reserved.
      </footer>
    </div>
  );
}