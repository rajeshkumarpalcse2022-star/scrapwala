import mongoose from "mongoose"
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../.env.local") })

const ScrapCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    slug: { type: String, required: true, unique: true, trim: true },
    description: { type: String, required: true },
    parent: { type: mongoose.Schema.Types.ObjectId, ref: "ScrapCategory", default: null },
    image: { type: String },
    imageUrl: { type: String },
    cloudinaryPublicId: { type: String },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
)

const PARENTS = [
  {
    name: "Normal Recyclables",
    slug: "normal-recyclables",
    description: "Household paper, cardboard, books and everyday recyclables",
    sortOrder: 0,
  },
  {
    name: "Metals",
    slug: "metals",
    description: "Ferrous and non-ferrous metal scrap",
    sortOrder: 1,
  },
]

// Existing material slugs -> parent slug
const SUB_TO_PARENT = {
  newspaper: "normal-recyclables",
  books: "normal-recyclables",
  cardboard: "normal-recyclables",
  iron: "metals",
}

async function ensureParent(ScrapCategory, def) {
  const existing = await ScrapCategory.findOne({ slug: def.slug }).lean()
  if (existing) {
    console.log(`Parent exists: ${existing.name} (${existing._id})`)
    return existing
  }

  const created = await ScrapCategory.create({
    ...def,
    description: def.description,
    parent: null,
    isActive: true,
  })
  console.log(`Parent created: ${created.name} (${created._id})`)
  return created
}

async function migrate() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error("MONGODB_URI not found in environment")
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log("Connected to MongoDB")

  const ScrapCategory =
    mongoose.models.ScrapCategory ||
    mongoose.model("ScrapCategory", ScrapCategorySchema)

  const parents = {}
  for (const def of PARENTS) {
    parents[def.slug] = await ensureParent(ScrapCategory, def)
  }

  const orphans = await ScrapCategory.find({ parent: null }).lean()
  let updated = 0
  let unchanged = 0
  const unmapped = []

  for (const doc of orphans) {
    const parentSlug = SUB_TO_PARENT[doc.slug]
    if (!parentSlug) {
      unmapped.push(`${doc.name} (${doc.slug})`)
      continue
    }

    await ScrapCategory.updateOne(
      { _id: doc._id },
      { $set: { parent: parents[parentSlug]._id } }
    )
    console.log(`Assigned "${doc.name}" -> ${parents[parentSlug].name}`)
    updated += 1
  }

  const alreadyParented = await ScrapCategory.countDocuments({
    parent: { $ne: null },
  })
  unchanged = alreadyParented

  console.log("")
  console.log(`Subcategories assigned to a parent: ${updated}`)
  console.log(`Subcategories already having a parent: ${unchanged}`)
  if (unmapped.length > 0) {
    console.log(`Top-level documents left unmapped (assign manually): ${unmapped.join(", ")}`)
  }

  await mongoose.disconnect()
  console.log("Migration complete")
}

migrate().catch((err) => {
  console.error("Migration failed:", err)
  process.exit(1)
})
