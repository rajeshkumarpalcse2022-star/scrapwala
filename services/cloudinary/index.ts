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

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const PHOTO_FOLDER = "scrapwala/pickup-photos";
const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

type PhotoType = "image/jpeg" | "image/png" | "image/webp";

/**
 * Detect the real image type from file signatures so a renamed text/binary
 * file that merely carries an image extension (or MIME type) is rejected.
 */
function sniffPhotoType(bytes: Uint8Array): PhotoType | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function uploadPickupPhoto(file: File): Promise<UploadResult> {
  if (file.size <= 0) {
    throw new ApiError(400, "Please choose an image file", "INVALID_FILE");
  }
  if (file.size > MAX_PHOTO_BYTES) {
    throw new ApiError(
      400,
      "Each photo must be smaller than 5 MB",
      "FILE_TOO_LARGE"
    );
  }
  if (!PHOTO_MIME_TYPES.includes(file.type)) {
    throw new ApiError(
      400,
      "Only JPEG, PNG and WebP images are allowed",
      "INVALID_FILE_TYPE"
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffPhotoType(bytes);
  if (!sniffed || sniffed !== file.type) {
    throw new ApiError(
      400,
      "File content does not match a valid JPEG, PNG or WebP image",
      "INVALID_FILE_TYPE"
    );
  }

  const config = getConfig();

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign(
    `folder=${PHOTO_FOLDER}&timestamp=${timestamp}`,
    config.apiSecret
  );

  const extension =
    sniffed === "image/jpeg" ? "jpg" : sniffed === "image/png" ? "png" : "webp";
  const form = new FormData();
  form.append(
    "file",
    new Blob([bytes], { type: sniffed }),
    `scrap-photo.${extension}`
  );
  form.append("api_key", config.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", PHOTO_FOLDER);
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
        `Failed to upload photo to Cloudinary${reason}`,
        "CLOUDINARY_UPLOAD_FAILED"
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      502,
      "Could not reach Cloudinary to upload the photo",
      "CLOUDINARY_UNREACHABLE"
    );
  }

  return {
    imageUrl: json.secure_url,
    cloudinaryPublicId: json.public_id,
  };
}

/* ── Blog imagery (cover / inline / social) ─────────────────────────────── */

const BLOG_FOLDER = "scrapwala/blog-images";
const BLOG_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const BLOG_MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const BLOG_ACCEPT_LABEL = "JPEG, PNG or WebP";

export function blogImageLimits(): { maxBytes: number; mimeTypes: string[] } {
  return { maxBytes: BLOG_MAX_IMAGE_BYTES, mimeTypes: [...BLOG_MIME_TYPES] };
}

/**
 * Validate and upload a blog image (cover, inline or social) as a public
 * Cloudinary asset. File content is signature-sniffed so a renamed text or
 * executable file can never be served as an image. Runs server-side only:
 * the API secret never reaches the browser.
 */
export async function uploadBlogImage(file: File): Promise<UploadResult> {
  if (file.size <= 0) {
    throw new ApiError(400, "Please choose an image file", "INVALID_FILE");
  }
  if (file.size > BLOG_MAX_IMAGE_BYTES) {
    throw new ApiError(
      400,
      "Image must be smaller than 5 MB",
      "FILE_TOO_LARGE"
    );
  }
  if (!BLOG_MIME_TYPES.includes(file.type)) {
    throw new ApiError(
      400,
      `Only ${BLOG_ACCEPT_LABEL} images are allowed`,
      "INVALID_FILE_TYPE"
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffPhotoType(bytes);
  if (!sniffed || sniffed !== file.type) {
    throw new ApiError(
      400,
      "File content does not match a valid JPEG, PNG or WebP image",
      "INVALID_FILE_TYPE"
    );
  }

  const config = getConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = sign(
    `folder=${BLOG_FOLDER}&timestamp=${timestamp}`,
    config.apiSecret
  );

  const extension =
    sniffed === "image/jpeg" ? "jpg" : sniffed === "image/png" ? "png" : "webp";
  const form = new FormData();
  const safeName = (file.name || `blog.${extension}`)
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(-60);
  form.append(
    "file",
    new Blob([bytes], { type: sniffed }),
    safeName.includes(".") ? safeName : `${safeName}.${extension}`
  );
  form.append("api_key", config.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", BLOG_FOLDER);
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

const cloudinaryService = {
  uploadSvg,
  uploadPickupPhoto,
  uploadBlogImage,
  destroyAsset,
  assertValidSvg,
};

export default cloudinaryService;

/* ──────────────────────────────────────────────────────────────────────────
 * Hiring applicant documents (photo / signature / resume).
 *
 * These are uploaded as PRIVATE Cloudinary assets: no permanent public URL
 * is ever stored or exposed. Server-side access checks mint short-lived
 * signed delivery URLs on demand for the owning user or an admin.
 * ────────────────────────────────────────────────────────────────────────── */

export type HiringUploadKind = "photo" | "signature" | "document";

export interface HiringUploadResult {
  cloudinaryPublicId: string;
  resourceType: "image" | "raw";
  format: string;
  size: number;
  width?: number;
  height?: number;
}

const HIRING_FOLDER = "scrapwala/hiring-documents";

const HIRING_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function hiringUploadLimits(kind: HiringUploadKind): {
  maxBytes: number;
  mimeTypes: string[];
  acceptLabel: string;
} {
  if (kind === "document") {
    return {
      maxBytes: 3 * 1024 * 1024,
      mimeTypes: ["application/pdf"],
      acceptLabel: "PDF",
    };
  }
  if (kind === "signature") {
    return {
      maxBytes: 1 * 1024 * 1024,
      mimeTypes: [...HIRING_IMAGE_MIME_TYPES],
      acceptLabel: "JPEG, PNG or WebP",
    };
  }
  return {
    maxBytes: 2 * 1024 * 1024,
    mimeTypes: [...HIRING_IMAGE_MIME_TYPES],
    acceptLabel: "JPEG, PNG or WebP",
  };
}

function sniffPdf(bytes: Uint8Array): boolean {
  return (
    bytes.length >= 4 &&
    bytes[0] === 0x25 && // %
    bytes[1] === 0x50 && // P
    bytes[2] === 0x44 && // D
    bytes[3] === 0x46 // F
  );
}

/**
 * Validate + upload one hiring document as a private Cloudinary asset.
 * Real file content is signature-sniffed so a renamed executable or text
 * file can never masquerade as an image or PDF.
 */
export async function uploadHiringDocument(
  file: File,
  kind: HiringUploadKind
): Promise<HiringUploadResult> {
  const limits = hiringUploadLimits(kind);

  if (file.size <= 0) {
    throw new ApiError(400, "Please choose a file to upload", "INVALID_FILE");
  }
  if (file.size > limits.maxBytes) {
    const mb = (limits.maxBytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, "");
    throw new ApiError(
      400,
      `File must be smaller than ${mb} MB`,
      "FILE_TOO_LARGE"
    );
  }
  if (!limits.mimeTypes.includes(file.type)) {
    throw new ApiError(
      400,
      `Only ${limits.acceptLabel} files are allowed`,
      "INVALID_FILE_TYPE"
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  let resourceType: "image" | "raw";
  let format: string;
  let safeExtension: string;

  if (kind === "document") {
    if (file.type !== "application/pdf" || !sniffPdf(bytes)) {
      throw new ApiError(
        400,
        "File content does not match a valid PDF document",
        "INVALID_FILE_TYPE"
      );
    }
    resourceType = "raw";
    format = "pdf";
    safeExtension = "pdf";
  } else {
    const sniffed = sniffPhotoType(bytes);
    if (!sniffed || !limits.mimeTypes.includes(sniffed)) {
      throw new ApiError(
        400,
        "File content does not match a valid JPEG, PNG or WebP image",
        "INVALID_FILE_TYPE"
      );
    }
    resourceType = "image";
    format =
      sniffed === "image/jpeg" ? "jpg" : sniffed === "image/png" ? "png" : "webp";
    safeExtension = format;
  }

  const config = getConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  // Params are signed alphabetically: folder, timestamp, type.
  const signature = sign(
    `folder=${HIRING_FOLDER}&timestamp=${timestamp}&type=private`,
    config.apiSecret
  );

  const form = new FormData();
  const baseName = `hiring-${kind}-${timestamp}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  form.append(
    "file",
    new Blob([bytes], { type: resourceType === "raw" ? "application/pdf" : file.type }),
    `${baseName}.${safeExtension}`
  );
  form.append("api_key", config.apiKey);
  form.append("timestamp", String(timestamp));
  form.append("folder", HIRING_FOLDER);
  form.append("type", "private");
  form.append("signature", signature);

  let json: {
    secure_url?: string;
    public_id?: string;
    bytes?: number;
    width?: number;
    height?: number;
    format?: string;
    error?: { message?: string };
  } | null = null;

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/upload`,
      { method: "POST", body: form }
    );
    json = await res.json().catch(() => null);

    if (!res.ok || !json?.public_id) {
      const reason = json?.error?.message ? ` (${json.error.message})` : "";
      throw new ApiError(
        502,
        `Failed to upload document to Cloudinary${reason}`,
        "CLOUDINARY_UPLOAD_FAILED"
      );
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      502,
      "Could not reach Cloudinary to upload the document",
      "CLOUDINARY_UNREACHABLE"
    );
  }

  return {
    cloudinaryPublicId: json.public_id,
    resourceType,
    format: json.format || format,
    size: json.bytes ?? bytes.length,
    width: json.width,
    height: json.height,
  };
}

/**
 * Mint a short-lived signed delivery URL for a private hiring asset.
 *
 * Uses Cloudinary's authenticated download endpoint (`private_download_url`
 * style): the signature covers `public_id`, `type`, `timestamp` (and `format`
 * for images); `expires` bounds how long the URL stays valid. The response is
 * served with `Content-Disposition: inline`, so browsers render images/PDFs
 * directly instead of forcing a download.
 */
export function createHiringDeliveryUrl(params: {
  publicId: string;
  resourceType: "image" | "raw";
  format: string;
  expiresInSeconds?: number;
}): string {
  const config = getConfig();
  const timestamp = Math.floor(Date.now() / 1000);
  const expires = timestamp + (params.expiresInSeconds ?? 600);

  // Raw public ids already include their extension; image ids do not, so the
  // format directive is only signed for images. `expires` is enforced by the
  // endpoint but is deliberately not part of the signed string.
  const signedParams: Record<string, string | number> = {
    public_id: params.publicId,
    type: "private",
    timestamp,
  };
  if (params.resourceType === "image") signedParams.format = params.format;

  const toSign = Object.keys(signedParams)
    .sort()
    .map((key) => `${key}=${signedParams[key]}`)
    .join("&");
  const signature = sign(toSign, config.apiSecret);

  const query = new URLSearchParams({
    api_key: config.apiKey,
    public_id: params.publicId,
    type: "private",
    expires: String(expires),
    timestamp: String(timestamp),
    signature,
  });
  if (params.resourceType === "image") query.set("format", params.format);

  return `https://api.cloudinary.com/v1_1/${config.cloudName}/${params.resourceType}/download?${query}`;
}

/** Best-effort destroy for private hiring assets (image or raw). */
export async function destroyHiringAsset(
  publicId: string,
  resourceType: "image" | "raw"
): Promise<boolean> {
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
      `https://api.cloudinary.com/v1_1/${config.cloudName}/${resourceType}/destroy`,
      { method: "POST", body: form }
    );
    const json = await res.json().catch(() => null);
    return res.ok && json?.result === "ok";
  } catch {
    return false;
  }
}
