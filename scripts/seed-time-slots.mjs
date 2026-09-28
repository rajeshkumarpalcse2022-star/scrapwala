/**
 * Seeds default customer time slots when the collection is empty.
 * Idempotent: never overwrites admin-configured slots.
 *
 * Usage: node scripts/seed-time-slots.mjs
 */
import mongoose from "mongoose";
import dotenv from "dotenv";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, "../.env.local") });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI not found in .env.local");
  process.exit(1);
}

const DEFAULT_SLOTS = [
  { label: "09:00 AM – 11:00 AM", startTime: "09:00", endTime: "11:00" },
  { label: "11:00 AM – 01:00 PM", startTime: "11:00", endTime: "13:00" },
  { label: "01:00 PM – 03:00 PM", startTime: "13:00", endTime: "15:00" },
  { label: "03:00 PM – 05:00 PM", startTime: "15:00", endTime: "17:00" },
  { label: "05:00 PM – 07:00 PM", startTime: "17:00", endTime: "19:00" },
];

async function run() {
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const collection = db.collection("timeslots");

  const existing = await collection.countDocuments();
  if (existing > 0) {
    console.log(`timeslots already has ${existing} document(s) — nothing to do.`);
    await mongoose.disconnect();
    return;
  }

  const now = new Date();
  const docs = DEFAULT_SLOTS.map((slot, index) => ({
    ...slot,
    capacity: 20,
    isActive: true,
    sortOrder: index,
    createdAt: now,
    updatedAt: now,
  }));

  await collection.insertMany(docs);
  console.log(`Seeded ${docs.length} default time slots.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
