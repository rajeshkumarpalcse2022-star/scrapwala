import { IconCloud } from "@/components/ui/icon-cloud";

const SCRAP_MATERIAL_ICONS = [
  { src: "/images/scrap-icons/stack-of-books.svg", alt: "Books" },
  { src: "/images/scrap-icons/box.svg", alt: "Cardboard" },
  { src: "/images/scrap-icons/tshirt.svg", alt: "Clothes" },
  { src: "/images/scrap-icons/bottle.svg", alt: "Bottles" },
  { src: "/images/scrap-icons/plastic-bottle.svg", alt: "Plastic" },
  { src: "/images/scrap-icons/drink.svg", alt: "Drink cans" },
  { src: "/images/scrap-icons/copper-wire.svg", alt: "Copper wire" },
  { src: "/images/scrap-icons/metal.svg", alt: "Metals" },
  { src: "/images/scrap-icons/plastic.svg", alt: "Plastic waste" },
  { src: "/images/scrap-icons/bolt.svg", alt: "Bolts" },
  { src: "/images/scrap-icons/phone.svg", alt: "Old phones" },
  { src: "/images/scrap-icons/broken-screen.svg", alt: "Broken screens" },
  { src: "/images/scrap-icons/beer.svg", alt: "Glass bottles" },
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
