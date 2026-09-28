import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import User from "../models/User"

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error("MONGODB_URI is required")
  process.exit(1)
}

const args = process.argv.slice(2)
const roleArg: string | undefined = args.find(a => a.startsWith("--role="))?.split("=")[1]
const nameArg: string | undefined = args.find(a => a.startsWith("--name="))?.split("=")[1]
const phoneArg: string | undefined = args.find(a => a.startsWith("--phone="))?.split("=")[1]
const emailArg: string | undefined = args.find(a => a.startsWith("--email="))?.split("=")[1]
const passwordArg: string | undefined = args.find(a => a.startsWith("--password="))?.split("=")[1]

if (!roleArg || !nameArg || !phoneArg || !passwordArg) {
  console.error(
    'Usage: npx tsx scripts/create-user.ts --role=admin --name="Admin" --phone="+911234567890" --password="secret" [--email="admin@example.com"]'
  )
  process.exit(1)
}

if (!["admin", "collector"].includes(roleArg)) {
  console.error("Role must be admin or collector")
  process.exit(1)
}

async function main() {
  await mongoose.connect(MONGODB_URI as string)

  const existing = await User.findOne({ phone: phoneArg })
  if (existing) {
    console.error("A user with this phone number already exists")
    await mongoose.disconnect()
    process.exit(1)
  }

  const hash = await bcrypt.hash(passwordArg as string, 10)

  const user = await User.create({
    name: nameArg,
    phone: phoneArg,
    email: emailArg || undefined,
    role: roleArg,
    password: hash,
    isActive: true,
    isVerified: true,
  })

  console.log(`Created ${roleArg} user: ${user.name} (id: ${user._id})`)
  await mongoose.disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
