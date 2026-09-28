/* eslint-disable @next/next/no-img-element */

interface RemoteImageProps {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}

/**
 * Lightweight image tag for externally hosted assets (Cloudinary SVGs).
 * next/image would require optimizer config for remote SVGs; these assets are
 * validated server-side on upload, so a plain image tag is used instead.
 */
export default function RemoteImage({
  src,
  alt,
  className,
  loading = "lazy",
}: RemoteImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
    />
  );
}
