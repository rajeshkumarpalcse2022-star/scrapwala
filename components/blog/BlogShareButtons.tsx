"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import {
  Check,
  Facebook,
  Link2,
  Linkedin,
  MessageCircle,
  Share2,
  Twitter,
} from "lucide-react";

/**
 * Share row for the article page: native share (where supported), copy-link,
 * WhatsApp, X, Facebook, LinkedIn. Rendered server-side with `absoluteUrl`
 * from the page's canonical URL.
 */
interface BlogShareButtonsProps {
  title: string;
  absoluteUrl: string;
}

// The native-share capability never changes while the page is open, so the
// external store never needs to notify subscribers.
function subscribeToNothing() {
  return () => {};
}

export default function BlogShareButtons({
  title,
  absoluteUrl,
}: BlogShareButtonsProps) {
  const [copied, setCopied] = useState(false);
  const canNativeShare = useSyncExternalStore(
    subscribeToNothing,
    () => typeof navigator !== "undefined" && "share" in navigator,
    () => false,
  );

  const encodedUrl = encodeURIComponent(absoluteUrl);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      icon: MessageCircle,
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100",
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      icon: Twitter,
      className:
        "border-border bg-foreground text-white hover:border-foreground/80 hover:bg-foreground/90",
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: Facebook,
      className:
        "border-blue-200 bg-blue-50 text-blue-700 hover:border-blue-300 hover:bg-blue-100",
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: Linkedin,
      className:
        "border-sky-200 bg-sky-50 text-sky-700 hover:border-sky-300 hover:bg-sky-100",
    },
  ];

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(absoluteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (permissions/insecure context) — the link is
      // visible in the address bar, so this is a non-blocking convenience.
    }
  }, [absoluteUrl]);

  const shareNatively = useCallback(async () => {
    if (typeof navigator === "undefined" || !("share" in navigator)) return;
    try {
      await navigator.share({ title, url: absoluteUrl });
    } catch {
      // User dismissed the share sheet or sharing failed; ignore.
    }
  }, [title, absoluteUrl]);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            Share this guide
          </p>
          <p className="mt-0.5 text-xs text-muted">
            Help a friend recycle smarter.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canNativeShare && (
            <button
              type="button"
              onClick={shareNatively}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Share2 className="h-3.5 w-3.5" aria-hidden />
              Share
            </button>
          )}

          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-primary" aria-hidden />
            ) : (
              <Link2 className="h-3.5 w-3.5" aria-hidden />
            )}
            {copied ? "Link copied" : "Copy link"}
          </button>

          {links.map((link) => {
            const Icon = link.icon;
            return (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Share on ${link.label}`}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${link.className}`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {link.label}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
