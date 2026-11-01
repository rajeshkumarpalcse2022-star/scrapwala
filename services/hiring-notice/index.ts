import mongoose from "mongoose";
import connectDB from "@/lib/db/mongoose";
import { destroyAsset } from "@/services/cloudinary";
import HiringNotice, { type IHiringNotice } from "@/models/HiringNotice";

const NOTICE_KEY = "careers";

export interface HiringNoticeDTO {
  imageUrl: string;
  publicId?: string;
  updatedAt: string;
}

function serialize(doc: IHiringNotice): HiringNoticeDTO {
  return {
    imageUrl: doc.imageUrl,
    publicId: doc.publicId,
    updatedAt: new Date(doc.updatedAt).toISOString(),
  };
}

export async function getHiringNotice(): Promise<HiringNoticeDTO | null> {
  await connectDB();
  const doc = await HiringNotice.findOne({ key: NOTICE_KEY });
  return doc ? serialize(doc) : null;
}

export async function saveHiringNoticeImage(
  image: { imageUrl: string; publicId?: string },
  adminId?: string
): Promise<HiringNoticeDTO> {
  await connectDB();

  const previous = await HiringNotice.findOne({ key: NOTICE_KEY });
  const doc = await HiringNotice.findOneAndUpdate(
    { key: NOTICE_KEY },
    {
      $set: {
        imageUrl: image.imageUrl,
        publicId: image.publicId,
        updatedBy:
          adminId && mongoose.Types.ObjectId.isValid(adminId)
            ? adminId
            : null,
      },
      $setOnInsert: { key: NOTICE_KEY },
    },
    { new: true, upsert: true, runValidators: true }
  );

  if (previous?.publicId && previous.publicId !== image.publicId) {
    await destroyAsset(previous.publicId);
  }

  return serialize(doc);
}

export async function deleteHiringNotice(): Promise<void> {
  await connectDB();
  const doc = await HiringNotice.findOneAndDelete({ key: NOTICE_KEY });
  if (doc?.publicId) await destroyAsset(doc.publicId);
}
