import Image from "next/image";

interface LogoProps {
  className?: string;
  priority?: boolean;
}

/**
 * Scrapi brand lockup (recycle mark + wordmark) — exported from the
 * design asset, tagline trimmed for small display sizes.
 */
export default function Logo({ className = "h-9 w-auto", priority = false }: LogoProps) {
  return (
    <Image
      src="/images/scrapi-logo.png"
      alt="Scrapi"
      width={900}
      height={283}
      priority={priority}
      sizes="(max-width: 1024px) 200px, 240px"
      className={className}
    />
  );
}
