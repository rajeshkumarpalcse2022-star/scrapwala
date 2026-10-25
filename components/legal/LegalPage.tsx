import Link from "next/link";
import { CalendarDays, ChevronRight, Globe, Mail, Phone, ShieldCheck } from "lucide-react";
import Container from "@/components/common/Container";
import {
  SITE_URL,
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_PHONE_TEL,
} from "@/lib/constants/site";

export type LegalDocId = "privacy-policy" | "terms" | "cancellation-refund";

interface LegalDoc {
  id: LegalDocId;
  href: string;
  label: string;
  shortLabel: string;
  description: string;
}

export const legalDocs: LegalDoc[] = [
  {
    id: "privacy-policy",
    href: "/privacy-policy",
    label: "Privacy Policy",
    shortLabel: "Privacy Policy",
    description: "How we collect, use, store and protect your personal information.",
  },
  {
    id: "terms",
    href: "/terms",
    label: "Terms & Conditions",
    shortLabel: "Terms & Conditions",
    description: "The rules that apply when you use our website and book a pickup.",
  },
  {
    id: "cancellation-refund",
    href: "/cancellation-refund",
    label: "Cancellation & Refund Policy",
    shortLabel: "Cancellation & Refund",
    description: "How cancellations, failed payments and refund requests are handled.",
  },
];

interface LegalPageProps {
  id: LegalDocId;
  title: string;
  summary: string;
  effectiveDate: string;
  children: React.ReactNode;
}

/**
 * Shared shell for the public legal documents (Privacy, Terms, Refunds):
 * breadcrumb hero, long-form prose column, contact card and cross-links to
 * the other policies.
 */
export default function LegalPage({ id, title, summary, effectiveDate, children }: LegalPageProps) {
  const others = legalDocs.filter((doc) => doc.id !== id);

  return (
    <>
      {/* Hero */}
      <section className="border-b border-border bg-primary-light py-12 sm:py-16">
        <Container>
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted">
            <Link href="/" className="transition-colors hover:text-primary">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium text-foreground" aria-current="page">
              {title}
            </span>
          </nav>

          <div className="mt-5 flex items-start gap-3">
            <span className="mt-1 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary sm:flex">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
                {summary}
              </p>
            </div>
          </div>

          <p className="mt-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>
              Effective Date: <span className="font-medium text-foreground">{effectiveDate}</span>
            </span>
          </p>
        </Container>
      </section>

      {/* Document body */}
      <section className="py-12 sm:py-16">
        <Container>
          <div className="mx-auto max-w-3xl">
            <article className="legal-prose">{children}</article>

            {/* Contact card */}
            <div className="mt-12 rounded-2xl border border-border bg-card p-6 sm:p-8">
              <h2 className="text-base font-semibold uppercase tracking-wider text-foreground">
                Contact Us
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                For questions about this document, please reach out using the details below.
              </p>
              <ul className="mt-5 grid gap-3 text-sm text-muted sm:grid-cols-2">
                <li className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <a href={`mailto:${SUPPORT_EMAIL}`} className="break-all transition-colors hover:text-primary">
                    {SUPPORT_EMAIL}
                  </a>
                </li>
                <li className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <a href={`tel:${SUPPORT_PHONE_TEL}`} className="transition-colors hover:text-primary">
                    {SUPPORT_PHONE_DISPLAY}
                  </a>
                </li>
                <li className="flex items-start gap-3 sm:col-span-2">
                  <Globe className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <a
                    href={SITE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all transition-colors hover:text-primary"
                  >
                    {SITE_URL.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </Container>
      </section>

      {/* Cross-links to the other policies */}
      <section className="border-t border-border bg-muted-light py-12 sm:py-14">
        <Container>
          <div className="mx-auto max-w-4xl">
            <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-muted">
              Related Policies
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {others.map((doc) => (
                <Link
                  key={doc.id}
                  href={doc.href}
                  className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-card-hover"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-semibold text-foreground">{doc.label}</span>
                    <ChevronRight
                      className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="mt-2 block text-sm leading-relaxed text-muted">
                    {doc.description}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
