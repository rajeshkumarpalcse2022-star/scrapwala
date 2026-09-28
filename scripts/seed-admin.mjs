import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import dotenv from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: resolve(__dirname, "../.env.local") })

async function seedAdmin() {
  const uri = process.env.MONGODB_URI
  const adminEmail = process.env.ADMIN_INITIAL_EMAIL
  const adminPassword = process.env.ADMIN_INITIAL_PASSWORD

  if (!uri) {
    console.error("MONGODB_URI not found")
    process.exit(1)
  }

  if (!adminEmail || !adminPassword) {
    console.error("ADMIN_INITIAL_EMAIL and ADMIN_INITIAL_PASSWORD must be set in .env.local")
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
  }, { timestamps: true }))

  const existing = await User.findOne({ email: adminEmail.toLowerCase().trim() })
  if (existing) {
    console.log(`Admin already exists with email: ${adminEmail}`)
    await mongoose.disconnect()
    return
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 12)

  await User.create({
    name: "Admin",
    email: adminEmail.toLowerCase().trim(),
    phone: "9000000000",
    role: "admin",
    password: hashedPassword,
    isActive: true,
    isVerified: true,
  })

  console.log(`Admin created successfully with email: ${adminEmail}`)

  await mongoose.disconnect()
  console.log("Disconnected from MongoDB")
}

seedAdmin().catch(console.error)
