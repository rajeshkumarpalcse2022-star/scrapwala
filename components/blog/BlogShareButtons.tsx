"use client";

import { useCallback, useState } from "react";

/**
 * Share row for the article page: native share (where supported), copy-link,
 * WhatsApp, X, Facebook, LinkedIn. Rendered server-side with `absoluteUrl`
 * from the page's canonical URL.
 */
interface BlogShareButtonsProps {
  title: string;
  absoluteUrl: string;
}

export default function BlogShareButtons({ title, absoluteUrl }: BlogShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(absoluteUrl);
  const encodedTitle = encodeURIComponent(title);

  const links = [
    {
      label: "Share on WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
    },
    {
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
    {
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
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

  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-medium text-muted">Share:</span>

      {canNativeShare && (
        <button
          type="button"
          onClick={shareNatively}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Share
        </button>
      )}

      <button
        type="button"
        onClick={copyLink}
        className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {copied ? "Link copied" : "Copy link"}
      </button>

      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={link.label}
          className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-primary/40 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {link.label.replace("Share on ", "")}
        </a>
      ))}
    </div>
  );
}
