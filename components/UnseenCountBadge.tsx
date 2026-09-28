interface UnseenCountBadgeProps {
  count: number;
}

/**
 * Compact red pill showing an unseen pickup count.
 * Renders nothing at zero; shows 99+ above 99; pulses subtly via CSS
 * (animation is disabled under prefers-reduced-motion in globals.css).
 */
export default function UnseenCountBadge({ count }: UnseenCountBadgeProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <span className="unseen-badge inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold leading-none text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
