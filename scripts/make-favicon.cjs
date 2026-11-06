const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "public", "images", "scrapi-logo.png");

function buildIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const entries = [];
  let offset = 6 + 16 * count;
  const bufs = [];
  for (const { buf, size } of images) {
    const e = Buffer.alloc(16);
    const dim = size === 256 ? 0 : size; // 0 means 256 in ICO entries
    e.writeUInt8(dim, 0); // width
    e.writeUInt8(dim, 1); // height
    e.writeUInt16LE(1, 4); // planes
    e.writeUInt16LE(32, 6); // bit count
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    entries.push(e);
    bufs.push(buf);
    offset += buf.length;
  }
  return Buffer.concat([header, ...entries, ...bufs]);
}

(async () => {
  const meta = await sharp(SRC).metadata();
  console.log("src", meta.width, meta.height);

  // Left region of the lockup holds the recycle-style S mark (no wordmark letters).
  const left = 100;
  const top = 15;
  const width = 180;
  const height = 280;
  console.log("crop box", { left, top, width, height });

  const croppedPath = path.join(ROOT, "public", "images", "s-mark-cropped.png");
  const extracted = await sharp(SRC)
    .extract({ left, top, width, height })
    .png()
    .toBuffer();
  await sharp(extracted).trim({ threshold: 8 }).png().toFile(croppedPath);

  const croppedMeta = await sharp(croppedPath).metadata();
  console.log("trimmed S", croppedMeta.width, croppedMeta.height);

  const side = Math.max(croppedMeta.width, croppedMeta.height);
  const pad = Math.round(side * 0.08);
  const canvas = side + pad * 2;

  const padded = await sharp(croppedPath)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .resize(canvas, canvas, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const previewPath = path.join(ROOT, "public", "images", "s-mark-preview.png");
  await sharp(padded).resize(256, 256).png().toFile(previewPath);

  const sizes = [16, 32, 48, 64];
  const icoImages = [];
  for (const size of sizes) {
    icoImages.push({ size, buf: await sharp(padded).resize(size, size).png().toBuffer() });
  }
  const icoBuf = buildIco(icoImages);
  fs.writeFileSync(path.join(ROOT, "app", "favicon.ico"), icoBuf);
  fs.writeFileSync(path.join(ROOT, "public", "favicon.ico"), icoBuf);

  await sharp(padded).resize(48, 48).png().toFile(path.join(ROOT, "app", "icon.png"));

  console.log("wrote app/favicon.ico, public/favicon.ico, app/icon.png, preview");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
