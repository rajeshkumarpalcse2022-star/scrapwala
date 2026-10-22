/**
 * Demo blog seeder: creates categories and published articles with real
 * Cloudinary-hosted cover images. Idempotent — slugs that already exist are
 * skipped. Usage: npx tsx scripts/seed-blog.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal(): void {
  try {
    const text = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
      if (!match) continue;
      const key = match[1];
      if (key in process.env) continue;
      let value = match[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

interface Block {
  type: "heading" | "paragraph" | "bulletList" | "orderedList" | "blockquote" | "image";
  [key: string]: unknown;
}

interface ArticleDef {
  title: string;
  slug: string;
  subtitle: string;
  excerpt: string;
  categorySlug: string;
  coverSeed: string;
  coverAlt: string;
  featured?: boolean;
  publishedAt: string;
  seoMetaTitle: string;
  seoMetaDescription: string;
  blocks: Block[];
  inlineImages?: { seed: string; alt: string; caption: string; afterHeading: string }[];
}

const CATEGORIES = [
  {
    name: "Recycling Tips",
    slug: "recycling-tips",
    description: "Practical guides to sort, store and recycle household scrap.",
    sortOrder: 1,
  },
  {
    name: "Scrap Rates",
    slug: "scrap-rates",
    description: "What your iron, copper, aluminium and paper are worth today.",
    sortOrder: 2,
  },
  {
    name: "Sustainable Living",
    slug: "sustainable-living",
    description: "Small home habits that keep waste out of landfills.",
    sortOrder: 3,
  },
];

const ARTICLES: ArticleDef[] = [
  {
    title: "Turn Your Weekend Clean-Up Into Instant Cash with ScrapWala",
    slug: "weekend-cleanup-instant-cash-scrapwala",
    subtitle: "Three taps, one pickup, and your old junk becomes money in your account.",
    excerpt:
      "Old newspapers, a broken mixer, that balcony full of bottles — see how a ScrapWala pickup turns your weekend clean-up into instant cash, with zero haggling.",
    categorySlug: "recycling-tips",
    coverSeed: "scrapwala-pickup-bags",
    coverAlt: "Sorted scrap bags ready for pickup on a sunny balcony",
    featured: true,
    publishedAt: "2026-10-04T09:00:00.000Z",
    seoMetaTitle: "Weekend Scrap Clean-Up → Instant Cash | ScrapWala",
    seoMetaDescription:
      "Book a free ScrapWala pickup, sort your household scrap in minutes and get paid instantly. A simple weekend routine that clears your home and your conscience.",
    blocks: [
      {
        type: "paragraph",
        text: "Every Indian home has the same secret corner: a balcony or storeroom where old newspapers, empty bottles, a dead mixer-grinder and a decade of cables quietly multiply. This weekend, instead of another round of *jugaad*, let it earn you money.",
      },
      { type: "heading", level: 2, text: "Step 1 — Sort in five minutes" },
      {
        type: "paragraph",
        text: "You don't need ten bins. Two bags and a carton cover most homes:",
      },
      {
        type: "bulletList",
        items: [
          "**Paper & cardboard** — newspapers, cartons, tea boxes (keep them dry)",
          "**Metal** — old vessels, broken utensils, taps, wires",
          "**Plastic & glass** — bottles, containers, jars with lids",
          "**E-waste** — chargers, cables, keyboards, the dead TV remote",
        ],
      },
      { type: "heading", level: 2, text: "Step 2 — Book a free pickup" },
      {
        type: "paragraph",
        text: "Open ScrapWala, pick a slot that suits you, and confirm. Our pickup partner reaches your door at the chosen time — no calls, no *\"bhaiya, kal aa jao\"* negotiation.",
      },
      { type: "heading", level: 2, text: "Step 3 — Weigh, scan, get paid" },
      {
        type: "paragraph",
        text: "Items are weighed in front of you at **live market rates**, the amount appears on your screen, and payment lands in your UPI account before the rider leaves. The whole door-to-door routine usually takes under 15 minutes.",
      },
      {
        type: "blockquote",
        text: "The cleanest ₹800 my family ever earned was one Sunday morning — three bags of scrap and a ten-minute pickup.",
      },
      {
        type: "paragraph",
        text: "Everything we collect is traced to verified recycling partners, so that mixer-grinder becomes raw material again instead of landfill.",
      },
      { type: "heading", level: 3, text: "Ready when you are" },
      {
        type: "paragraph",
        text: "Pick a slot, tie up those newspapers, and reclaim your balcony. *Your future self — with a cleaner home and a fuller wallet — will say thanks.*",
      },
    ],
    inlineImages: [
      {
        seed: "scrapwala-sorted-paper",
        alt: "Neatly tied bundles of newspaper ready for recycling",
        caption: "Dry paper bundles fetch the best rates — keep them off the damp floor.",
        afterHeading: "Step 1 — Sort in five minutes",
      },
    ],
  },
  {
    title: "What Is Your Scrap Worth? A 2026 Guide to Scrap Rates",
    slug: "scrap-rates-guide-2026",
    subtitle: "Indicative prices for iron, copper, aluminium, brass and more.",
    excerpt:
      "Rates differ by metal, city and global demand. Here is a plain-English guide to what Indian households can typically expect per kilo in 2026 — and the three factors that move the number.",
    categorySlug: "scrap-rates",
    coverSeed: "scrapwala-copper-wire",
    coverAlt: "Coils of copper wire and metal scraps sorted by grade",
    publishedAt: "2026-10-08T09:00:00.000Z",
    seoMetaTitle: "Scrap Rates Guide 2026 | Iron, Copper & Aluminium Prices",
    seoMetaDescription:
      "Indicative per-kg scrap prices for common Indian household materials in 2026, plus the global and local factors that push rates up or down.",
    blocks: [
      {
        type: "paragraph",
        text: "\"Kitne ka hai?\" — the oldest question in Indian scrap dealing. The honest answer: it depends on the metal, the grade, and what the world market did this week. Here's how to read the number.",
      },
      { type: "heading", level: 2, text: "Indicative household rates (2026)" },
      {
        type: "paragraph",
        text: "These are ballpark ranges for clean, household-grade material. *Final price depends on grade and location.*",
      },
      {
        type: "bulletList",
        items: [
          "**Iron / steel** (utensils, grills, rods) — the volume king; steady, dependable value",
          "**Copper** (wires, old pipes) — the highest earner in most homes; keep it separate from brass",
          "**Aluminium** (vessels, window frames) — light but valuable; remove steel handles first",
          "**Brass** (taps, pooja items) — sits between copper and iron in value",
          "**Newspaper & cardboard** — low per-kg, high per-home; dry it for the best price",
          "**Plastic bottles** — modest value, major environmental win",
        ],
      },
      { type: "heading", level: 2, text: "What moves the price" },
      {
        type: "orderedList",
        items: [
          "**Global commodity markets** — London metal indices set the tone within days",
          "**Grade & purity** — a clean copper wire bundle beats a mixed tangle every time",
          "**Local demand** — cities with active foundries and recyclers pay more",
        ],
      },
      {
        type: "blockquote",
        text: "A kilo of mixed scrap is worth about the same as a kilo of sorted scrap — until a recycler has to sort it for you. That labour shows up in your price.",
      },
      { type: "heading", level: 3, text: "Sort first, earn more" },
      {
        type: "paragraph",
        text: "Five minutes of separation routinely adds *15–20%* to a household payout. See our recycling tips for the exact method.",
      },
    ],
  },
  {
    title: "5 Household Items You Didn't Know Were Recyclable",
    slug: "surprising-recyclable-household-items",
    subtitle: "From old spectacles to toothpaste tubes — these deserve a second life.",
    excerpt:
      "Most homes throw out five categories of recyclable material without a second thought. Here is where each one should actually go instead of the dustbin.",
    categorySlug: "recycling-tips",
    coverSeed: "scrapwala-electronics",
    coverAlt: "Assorted household items laid out for sorting and recycling",
    publishedAt: "2026-10-12T09:00:00.000Z",
    seoMetaTitle: "5 Surprisingly Recyclable Household Items | ScrapWala",
    seoMetaDescription:
      "Old spectacles, toothpaste tubes, winter woollens, eyeglass frames and more — five commonly binned items that can be recycled instead.",
    blocks: [
      {
        type: "paragraph",
        text: "The dustbin is where good material goes to waste. Five things in almost every Indian home are still recyclable — they just need the right destination.",
      },
      {
        type: "orderedList",
        items: [
          "**Old spectacles & frames** — optical shops and NGOs refurbish them for vision camps",
          "**Toothpaste tubes** — multi-layer plastic; collect a batch and drop them at a specialty recycler",
          "**Winter woollens & school uniforms** — donation drives keep them out of landfills entirely",
          "**Dead CDs & DVDs** — polycarbonate plastic with a metal layer; e-waste centres take them",
          "**Expired medicines** — pharmacies run take-back bins; never flush them",
        ],
      },
      { type: "heading", level: 2, text: "The one habit that helps" },
      {
        type: "paragraph",
        text: "Keep a **\"not the dustbin\" box** in a corner of your storeroom. When it fills — usually once a month — you have a bundle ready for donation, e-waste or your next ScrapWala pickup.",
      },
      {
        type: "blockquote",
        text: "Waste isn't waste until it's wasted. Almost everything has a second destination — we just stop looking for it.",
      },
      {
        type: "paragraph",
        text: "And the big four — paper, metal, plastic, glass — still go straight to your ScrapWala bags, weighed and paid at your door.",
      },
    ],
    inlineImages: [
      {
        seed: "scrapwala-donation-box",
        alt: "A box of neatly sorted household items ready for donation",
        caption: "One corner box turns \"throw it out\" into \"pass it on\".",
        afterHeading: "The one habit that helps",
      },
    ],
  },
  {
    title: "Monsoon-Ready Scrap Storage Tips for Indian Homes",
    slug: "monsoon-scrap-storage-tips",
    subtitle: "Keep paper dry, metal rust-free and your balcony usable till the rains end.",
    excerpt:
      "Damp newspapers lose half their value and rusty metal loses trust. A few monsoon storage habits protect both your scrap earnings and your balcony floor.",
    categorySlug: "sustainable-living",
    coverSeed: "scrapwala-balcony-storage",
    coverAlt: "Covered storage corner on a balcony with rain in the background",
    publishedAt: "2026-10-16T09:00:00.000Z",
    seoMetaTitle: "Monsoon Scrap Storage Tips for Homes | ScrapWala",
    seoMetaDescription:
      "Protect your recyclable scrap during the rains: keep paper dry, prevent rust on metal, and store plastics safely with simple home storage habits.",
    blocks: [
      {
        type: "paragraph",
        text: "A single waterlogged newspaper bundle is worth a fraction of a dry one — and every recycler knows it. Monsoon is when a little storage discipline pays for itself.",
      },
      { type: "heading", level: 2, text: "Paper: dry above all" },
      {
        type: "bulletList",
        items: [
          "Store newspapers in a **closed carton or woven bag**, never directly on the floor",
          "Tie bundles tight — loose sheets catch damp from the sides",
          "A sheet of plastic under the carton stops capillary moisture",
        ],
      },
      { type: "heading", level: 2, text: "Metal: rust is the enemy" },
      {
        type: "paragraph",
        text: "Iron vessels and grills left in open air grow surface rust within days. Wipe them dry, keep them under a ledge, and — for anything valuable like copper — store it **indoors** where it can't react with salt-laden air.",
      },
      { type: "heading", level: 2, text: "Plastic & glass: tidy wins" },
      {
        type: "paragraph",
        text: "Empty bottles collect rainwater and breed mosquitoes. Cap them, stack them in a crate, and the same crate doubles as your pickup-ready parcel.",
      },
      {
        type: "blockquote",
        text: "Treat your scrap corner like a pantry: dry, covered, off the floor. The price tag will thank you in October.",
      },
      {
        type: "paragraph",
        text: "When the bag is full, book a pickup — our riders carry covers for the ride down, so your careful storage isn't undone at the last metre.",
      },
    ],
  },
  {
    title: "One Aluminium Can, Half a Charge: The Real Energy of Recycling",
    slug: "aluminium-can-energy-recycling-explained",
    subtitle: "Why crushing, returning and recycling cans is one of the highest-impact habits at home.",
    excerpt:
      "Making new aluminium from bauxite is brutally energy-intensive; recycling a can uses a fraction of it. The numbers are almost unbelievable — so here they are.",
    categorySlug: "sustainable-living",
    coverSeed: "scrapwala-aluminium-cans",
    coverAlt: "Crushed aluminium beverage cans ready for recycling",
    publishedAt: "2026-10-20T09:00:00.000Z",
    seoMetaTitle: "Recycling Aluminium Cans Saves Energy — Here's How Much",
    seoMetaDescription:
      "Recycling aluminium uses up to 95% less energy than producing it from ore. See the numbers behind can recycling and how to do it right at home.",
    blocks: [
      {
        type: "paragraph",
        text: "Aluminium is a metal with a memory. It can be melted down and reformed *indefinitely* without losing quality — which is why recycling it is one of the most efficient things a household can do.",
      },
      { type: "heading", level: 2, text: "The numbers" },
      {
        type: "bulletList",
        items: [
          "Recycling aluminium saves up to **95% of the energy** needed for virgin metal",
          "A recycled can is back on a shelf as a new can in about **60 days**",
          "Every tonne recycled avoids mining several tonnes of bauxite ore",
        ],
      },
      {
        type: "paragraph",
        text: "Run those figures past a month of household beverage cans and the \"effort\" of rinsing and tossing them into your scrap bag starts to look like the easiest win in the room.",
      },
      { type: "heading", level: 2, text: "How to do it right" },
      {
        type: "orderedList",
        items: [
          "Rinse quickly — sticky residue contaminates whole batches",
          "Crush cans if you're short on space (weigh impact is minimal)",
          "Keep aluminium **separate** from steel cans; mixing grades lowers value",
        ],
      },
      {
        type: "blockquote",
        text: "The most sustainable product is the one that never becomes waste — and the second most sustainable is the one that becomes metal again.",
      },
      {
        type: "paragraph",
        text: "Add cans to your ScrapWala bag, book a pickup, and watch the smallest item in your bin produce the biggest energy saving per kilo.",
      },
    ],
  },
];

async function fetchImageFile(seed: string, width: number, height: number): Promise<File> {
  const url = `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
  const response = await fetch(url, { redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Image download failed (${response.status}) for ${url}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  const type = response.headers.get("content-type")?.split(";")[0].trim() || "image/jpeg";
  return new File([bytes], `${seed}.jpg`, { type });
}

async function main() {
  loadEnvLocal();

  const { default: connectDB } = await import("../lib/db/mongoose");
  const { default: BlogPost } = await import("../models/BlogPost");
  const { default: BlogCategory } = await import("../models/BlogCategory");
  const { createPost } = await import("../services/blog");
  const { uploadBlogImage } = await import("../services/cloudinary");

  await connectDB();

  const categoryIds: Record<string, string> = {};
  for (const def of CATEGORIES) {
    const existing = await BlogCategory.findOne({ slug: def.slug }).lean();
    if (existing) {
      categoryIds[def.slug] = String(existing._id);
      continue;
    }
    const doc = await BlogCategory.create({ ...def, isActive: true });
    categoryIds[def.slug] = String(doc._id);
    console.log("CATEGORY created:", def.name);
  }

  let created = 0;
  let skipped = 0;
  const uploadedPublicIds: string[] = [];

  for (const article of ARTICLES) {
    const exists = await BlogPost.findOne({ slug: article.slug }).select("_id").lean();
    if (exists) {
      skipped += 1;
      console.log("SKIP (exists):", article.slug);
      continue;
    }

    process.stdout.write(`UPLOAD cover: ${article.coverSeed} ... `);
    const cover = await uploadBlogImage(
      await fetchImageFile(article.coverSeed, 1200, 675)
    );
    uploadedPublicIds.push(cover.cloudinaryPublicId);
    console.log("ok");

    const blocks: Block[] = [...article.blocks];
    for (const inline of article.inlineImages ?? []) {
      process.stdout.write(`UPLOAD inline: ${inline.seed} ... `);
      const uploaded = await uploadBlogImage(
        await fetchImageFile(inline.seed, 1000, 640)
      );
      uploadedPublicIds.push(uploaded.cloudinaryPublicId);
      console.log("ok");
      const imageBlock: Block = {
        type: "image",
        url: uploaded.imageUrl,
        publicId: uploaded.cloudinaryPublicId,
        alt: inline.alt,
        caption: inline.caption,
      };
      const headingIndex = blocks.findIndex(
        (block) => block.type === "heading" && block.text === inline.afterHeading
      );
      if (headingIndex >= 0) blocks.splice(headingIndex + 1, 0, imageBlock);
      else blocks.push(imageBlock);
    }

    const post = await createPost({
      title: article.title,
      slug: article.slug,
      subtitle: article.subtitle,
      excerpt: article.excerpt,
      content: blocks as never,
      category: categoryIds[article.categorySlug],
      authorName: "ScrapWala Team",
      coverImage: {
        url: cover.imageUrl,
        publicId: cover.cloudinaryPublicId,
        alt: article.coverAlt,
      },
      socialImage: {
        url: cover.imageUrl,
        publicId: cover.cloudinaryPublicId,
        alt: article.coverAlt,
      },
      status: "published",
      isFeatured: !!article.featured,
      seoMetaTitle: article.seoMetaTitle,
      seoMetaDescription: article.seoMetaDescription,
    });

    await BlogPost.updateOne(
      { _id: post.id },
      { $set: { publishedAt: new Date(article.publishedAt) } }
    );
    created += 1;
    console.log("POST created:", post.slug);
  }

  const total = await BlogPost.countDocuments({ status: { $ne: "archived" } });
  console.log(`DONE created=${created} skipped=${skipped} totalPosts=${total}`);
  console.log("UPLOADS:", uploadedPublicIds.join(","));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("FAIL", error);
    process.exit(1);
  });
