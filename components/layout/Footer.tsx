import Link from "next/link";
import { Clock, Mail, MessageCircle, Phone } from "lucide-react";
import Container from "@/components/common/Container";
import Logo from "@/components/common/Logo";
import { legalDocs } from "@/components/legal/LegalPage";
import {
  SITE_URL,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
  getWhatsAppLink,
} from "@/lib/constants/site";

const footerLinks = {
  navigation: [
    { href: "/", label: "Home" },
    { href: "/about", label: "About" },
    { href: "/scrap-categories", label: "Scrap Categories" },
    { href: "/scrap-rates", label: "Scrap Rates" },
    { href: "/how-it-works", label: "How It Works" },
    { href: "/blogs", label: "Blog" },
    { href: "/careers", label: "Careers" },
    { href: "/contact", label: "Contact" },
  ],
  customer: [
    { href: "/pickup", label: "Schedule Pickup" },
    { href: "/scrap-rates", label: "Check Scrap Rates" },
    { href: "/pickup-history", label: "Pickup History" },
    { href: "/application-history", label: "Application History" },
  ],
};

function ColumnHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground">{children}</h3>
  );
}

function FooterList({ items }: { items: { href: string; label: string }[] }) {
  return (
    <ul className="mt-4 space-y-2.5">
      {items.map((link) => (
        <li key={`${link.href}-${link.label}`}>
          <Link
            href={link.href}
            className="text-sm text-muted transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border" style={{ backgroundColor: "#E4F0E7" }}>
      <Container>
        <div className="grid grid-cols-1 gap-10 py-12 sm:grid-cols-2 sm:gap-8 lg:grid-cols-12 lg:py-16">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-4 lg:pr-6">
            <Link
              href="/"
              className="inline-flex items-center rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Logo className="h-10 w-auto sm:h-12" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              A modern doorstep scrap pickup and recycling platform. Turn your unused scrap into
              value while contributing to a greener planet.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/pickup"
                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Schedule Pickup
              </Link>
              <a
                href={getWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 bg-card px-5 py-2.5 text-sm font-semibold text-primary transition-colors hover:border-primary hover:bg-primary-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                WhatsApp Us
              </a>
            </div>
          </div>

          {/* Navigation */}
          <nav aria-label="Footer navigation" className="lg:col-span-2">
            <ColumnHeading>Navigation</ColumnHeading>
            <FooterList items={footerLinks.navigation} />
          </nav>

          {/* Customer */}
          <nav aria-label="Customer links" className="lg:col-span-2">
            <ColumnHeading>Customer</ColumnHeading>
            <FooterList items={footerLinks.customer} />
          </nav>

          {/* Contact */}
          <div className="lg:col-span-2">
            <ColumnHeading>Contact</ColumnHeading>
            <ul className="mt-4 space-y-3 text-sm text-muted">
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="flex items-start gap-2 break-all transition-colors hover:text-primary"
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{SUPPORT_EMAIL}</span>
                </a>
              </li>
              <li>
                <a
                  href={`tel:${SUPPORT_PHONE_TEL}`}
                  className="flex items-start gap-2 transition-colors hover:text-primary"
                >
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>{SUPPORT_PHONE_DISPLAY}</span>
                </a>
              </li>
              <li className="flex items-start gap-2">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  Mon &ndash; Sat
                  <br />
                  9:00 AM &ndash; 6:00 PM
                </span>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <nav aria-label="Legal links" className="sm:col-span-2 lg:col-span-2">
            <ColumnHeading>Legal</ColumnHeading>
            <ul className="mt-4 space-y-2.5">
              {legalDocs.map((doc) => (
                <li key={doc.id}>
                  <Link
                    href={doc.href}
                    className="text-sm text-muted transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
                  >
                    {doc.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs leading-relaxed text-muted/80">
              By using Scrapi you agree to our published policies.
            </p>
          </nav>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-center gap-3 border-t border-border py-6 text-center text-sm text-muted sm:flex-row sm:justify-between sm:text-left">
          <p>
            &copy; {year} Scrapi. All rights reserved.{" "}
            <span className="hidden sm:inline">
              &middot; {SITE_URL.replace(/^https?:\/\//, "")}
            </span>
          </p>
          <ul className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {legalDocs.map((doc) => (
              <li key={`bar-${doc.id}`}>
                <Link
                  href={doc.href}
                  className="transition-colors hover:text-primary focus-visible:text-primary focus-visible:outline-none"
                >
                  {doc.shortLabel}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
