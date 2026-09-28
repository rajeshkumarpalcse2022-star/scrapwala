import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <span className="text-4xl font-bold text-primary">404</span>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          Page not found
        </h1>
        <p className="mb-8 text-muted">
          Sorry, the page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <Home className="h-4 w-4" />
          Go Home
        </Link>
      </div>
    </div>
  );
}
