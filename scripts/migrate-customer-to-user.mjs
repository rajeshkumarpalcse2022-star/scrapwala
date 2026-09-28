import mongoose from "mongoose"
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../.env.local") })

async function migrate() {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error("MONGODB_URI not found in environment")
    process.exit(1)
  }

  await mongoose.connect(uri)
  console.log("Connected to MongoDB")

  const User = mongoose.model("User", new mongoose.Schema({
    name: String,
    email: String,
    phone: String,
    role: String,
    password: String,
    isActive: Boolean,
    isVerified: Boolean,
    collectorId: String,
    mustChangePassword: Boolean,
  }, { timestamps: true }))

  const result = await User.updateMany(
    { role: "customer" },
    { $set: { role: "user" } }
  )

  console.log(`Migration complete: ${result.modifiedCount} users migrated from "customer" to "user"`)

  const remaining = await User.countDocuments({ role: "customer" })
  console.log(`Remaining customer-role users: ${remaining}`)

  await mongoose.disconnect()
  console.log("Disconnected from MongoDB")
}

migrate().catch(console.error)
