import Link from "next/link";
import { Recycle } from "lucide-react";
import Container from "@/components/common/Container";

const footerLinks = {
  navigation: [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/scrap-categories", label: "Scrap Categories" },
    { href: "/scrap-rates", label: "Scrap Rates" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/contact", label: "Contact" },
  ],
  customer: [
    { href: "/pickup", label: "Schedule Pickup" },
  ],
  legal: [
    { href: "/terms", label: "Terms & Conditions" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-border" style={{ backgroundColor: "#E4F0E7" }}>
      <Container>
        <div className="py-12 lg:py-16">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <Link href="/" className="inline-flex items-center gap-2.5 font-bold text-xl text-primary">
                <Recycle className="h-6 w-6" aria-hidden="true" />
                <span>ScrapWala</span>
              </Link>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
                A modern doorstep scrap pickup and recycling platform. Turn your unused scrap into value
                while contributing to a greener planet.
              </p>
            </div>

            {/* Navigation */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Navigation
              </h3>
              <ul className="mt-4 space-y-3">
                {footerLinks.navigation.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Customer */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Customer
              </h3>
              <ul className="mt-4 space-y-3">
                {footerLinks.customer.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact & Legal */}
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                Contact
              </h3>
              <ul className="mt-4 space-y-3 text-sm text-muted">
                <li>hello@scrapwala.example</li>
              </ul>
              <h3 className="mt-6 text-sm font-semibold uppercase tracking-wider text-foreground">
                Legal
              </h3>
              <ul className="mt-4 space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border py-6 text-center text-sm text-muted">
          &copy; {new Date().getFullYear()} ScrapWala. All rights reserved.
        </div>
      </Container>
    </footer>
  );
}
