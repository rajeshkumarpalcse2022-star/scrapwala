import crypto from "crypto";
import { ApiError } from "@/lib/utils/api-error";

const MAX_SVG_BYTES = 2 * 1024 * 1024;
const UPLOAD_FOLDER = "scrapwala/subcategories";

interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

function getConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new ApiError(
      503,
      "Image upload is not configured. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET to .env.local.",
      "CLOUDINARY_NOT_CONFIGURED"
    );
  }

  return { cloudName, apiKey, apiSecret };
}

function sign(params: string, secret: string): string {
  return crypto.createHash("sha1").update(params + secret).digest("hex");
}

const SVG_HEAD =
  /^\s*(<\?xml[^>]*\?>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i;

const SVG_DANGEROUS =
  /<script[\s>]|javascript:|\son(click|load|error|focus|blur|mouseover|mouseenter|mouseleave|submit|change)\s*=/i;

export async function assertValidSvg(file: File): Promise<string> {
  if (file.size <= 0) {
    throw new ApiError(400, "Please choose an SVG file", "INVALID_FILE");
  }
  if (file.size > MAX_SVG_BYTES) {
    throw new ApiError(
      400,
      "SVG file must be smaller than 2 MB",
      "FILE_TOO_LARGE"
    );
  }

  const originalName = file.name || "upload.svg";
  if (!originalName.toLowerCase().endsWith(".svg")) {
    throw new ApiError(
      400,
      "Only SVG files are allowed (.svg)",
      "INVALID_FILE_TYPE"
    );
  }

  if (file.type && !/svg/i.test(file.type)) {
    throw new ApiError(
      400,
      "Only SVG images are allowed",
      "INVALID_FILE_TYPE"
    );
  }

  const text = await file.text();
  const byteLength = Buffer.byteLength(text, "utf8");
  if (byteLength > MAX_SVG_BYTES) {
    throw new ApiError(
      400,
      "SVG file must be smaller than 2 MB",
      "FILE_TOO_LARGE"
    );
  }

  if (!SVG_HEAD.test(text)) {
    throw new ApiError(
      400,
      "File does not look like a valid SVG image",
      "INVALID_SVG"
    );
  }

  if (SVG_DANGEROUS.test(text)) {
    throw new ApiError(
      400,
      "SVG must not contain scripts or event handlers",
      "UNSAFE_SVG"
    );
  }

  return text;
}

export interface UploadResult {
  imageUrl: string;
  cloudinaryPublicId: string;
}

export async function uploadSvg(file: File): Promise<UploadResult> {
  const svgText = await assertValidSvg(file);
  const config = getConfig();

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign(
    `folder=${UPLOAD_FOLDER}&timestamp=${timestamp}`,
    config.apiSecret
  );

  const form = new FormData();
  const safeName = (file.name || "upload.svg").replace(/[^a-zA-Z0-9._-]/g, "-");
  form.append(
    "file",
    new Blob([svgText], { type: "image/svg+xml" }),
    safeName
  );
  form.append("api_key", config.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", UPLOAD_FOLDER);
  form.append("signature", signature);

  let json: { secure_url?: string; public_id?: string; error?: { message?: string } } | null =
    null;
  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/upload`,
      { method: "POST", body: form }
    );
    json = await res.json().catch(() => null);

    if (!res.ok || !json?.secure_url || !json?.public_id) {
      const reason = json?.error?.message ? ` (${json.error.message})` : "";
      throw new ApiError(
        502,
        `Failed to upload image to Cloudinary${reason}`,
        "CLOUDINARY_UPLOAD_FAILED"
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      502,
      "Could not reach Cloudinary to upload the image",
      "CLOUDINARY_UNREACHABLE"
    );
  }

  return {
    imageUrl: json.secure_url,
    cloudinaryPublicId: json.public_id,
  };
}

/**
 * Best-effort cleanup of a replaced/removed Cloudinary asset.
 * Never throws: image lifecycle must not block database operations.
 */
export async function destroyAsset(publicId: string): Promise<boolean> {
  try {
    const config = getConfig();

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = sign(
      `public_id=${publicId}&timestamp=${timestamp}`,
      config.apiSecret
    );

    const form = new FormData();
    form.append("public_id", publicId);
    form.append("api_key", config.apiKey);
    form.append("timestamp", String(timestamp));
    form.append("signature", signature);

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/image/destroy`,
      { method: "POST", body: form }
    );
    const json = await res.json().catch(() => null);
    return res.ok && json?.result === "ok";
  } catch {
    return false;
  }
}

const cloudinaryService = { uploadSvg, destroyAsset, assertValidSvg };

export default cloudinaryService;
