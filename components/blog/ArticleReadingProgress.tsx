"use client";

import { useEffect, useState } from "react";

/**
 * Thin progress bar pinned below the sticky site header, reflecting how far
 * the reader has scrolled through the article. Purely decorative.
 */
export default function ArticleReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const next =
        scrollable > 0
          ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100))
          : 0;
      setProgress(next);
    };

    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className="fixed inset-x-0 top-16 z-40 h-1 bg-primary/10 print:hidden"
      aria-hidden
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-secondary to-emerald-400 transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
