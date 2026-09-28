import { IconCloud } from "@/components/ui/icon-cloud";

// Fluent Emoji Flat set (consistent colorful style) served by the Iconify CDN.
// Swap these for local files under /public/images/scrap-icons when available.
const ICONIFY = "https://api.iconify.design/fluent-emoji-flat";

const SCRAP_MATERIAL_ICONS = [
  { src: `${ICONIFY}/newspaper.svg`, alt: "Newspaper" },
  { src: `${ICONIFY}/books.svg`, alt: "Books" },
  { src: `${ICONIFY}/package.svg`, alt: "Cardboard" },
  { src: `${ICONIFY}/t-shirt.svg`, alt: "Clothes" },
  { src: `${ICONIFY}/lotion-bottle.svg`, alt: "Bottles and plastic" },
  { src: `${ICONIFY}/chains.svg`, alt: "Iron" },
  { src: `${ICONIFY}/nut-and-bolt.svg`, alt: "Metals" },
];

export default function ScrapMaterialIconCloud() {
  return (
    <div
      className="relative flex w-[260px] items-center justify-center sm:w-[340px] lg:w-[420px]"
      aria-label="Scrap materials we collect"
    >
      <IconCloud images={SCRAP_MATERIAL_ICONS.map((icon) => icon.src)} />
    </div>
  );
}
