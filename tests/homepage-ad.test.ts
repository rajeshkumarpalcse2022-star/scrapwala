import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  createHomepageAdSchema,
  updateHomepageAdSchema,
} from "@/lib/validations/homepage-ad";

const validImage = {
  url: "https://res.cloudinary.com/demo/image/upload/ad.png",
  publicId: "scrapwala/homepage-ads/ad",
  alt: "Monsoon sale banner",
};

const validBase = {
  title: "Monsoon Sale — Extra 10% on scrap",
  image: validImage,
};

describe("homepage-ad validations", () => {
  describe("createHomepageAdSchema", () => {
    it("accepts a minimal valid ad and defaults isActive to false", () => {
      const parsed = createHomepageAdSchema.parse(validBase);
      assert.equal(parsed.isActive, false);
      assert.equal(parsed.linkUrl ?? null, null);
      assert.equal(parsed.startsAt, undefined);
      assert.equal(parsed.endsAt, undefined);
    });

    it("accepts an active ad with link and schedule", () => {
      const parsed = createHomepageAdSchema.parse({
        ...validBase,
        linkUrl: "https://scrapwala.example/offers",
        isActive: true,
        startsAt: "2026-11-01T00:00:00.000Z",
        endsAt: "2026-11-30T23:59:59.000Z",
      });
      assert.equal(parsed.isActive, true);
      assert.equal(parsed.linkUrl, "https://scrapwala.example/offers");
      assert.equal(parsed.startsAt, "2026-11-01T00:00:00.000Z");
      assert.equal(parsed.endsAt, "2026-11-30T23:59:59.000Z");
    });

    it("rejects a title shorter than 2 characters", () => {
      assert.throws(() =>
        createHomepageAdSchema.parse({ ...validBase, title: "x" })
      );
    });

    it("rejects a non-https image URL", () => {
      assert.throws(() =>
        createHomepageAdSchema.parse({
          ...validBase,
          image: { ...validImage, url: "http://insecure.test/ad.png" },
        })
      );
    });

    it("rejects an empty image URL", () => {
      assert.throws(() =>
        createHomepageAdSchema.parse({
          ...validBase,
          image: { ...validImage, url: "" },
        })
      );
    });

    it("rejects a non-https link URL", () => {
      assert.throws(() =>
        createHomepageAdSchema.parse({
          ...validBase,
          linkUrl: "javascript:alert(1)",
        })
      );
    });

    it("allows an empty linkUrl (treated as no link)", () => {
      const parsed = createHomepageAdSchema.parse({
        ...validBase,
        linkUrl: "",
      });
      assert.equal(parsed.linkUrl, null);
    });

    it("rejects an invalid start date", () => {
      assert.throws(() =>
        createHomepageAdSchema.parse({ ...validBase, startsAt: "not-a-date" })
      );
    });

    it("rejects endsAt before startsAt", () => {
      assert.throws(() =>
        createHomepageAdSchema.parse({
          ...validBase,
          startsAt: "2026-11-30T00:00:00.000Z",
          endsAt: "2026-11-01T00:00:00.000Z",
        })
      );
    });

    it("allows endsAt equal to startsAt? no — strictly after is required", () => {
      assert.throws(() =>
        createHomepageAdSchema.parse({
          ...validBase,
          startsAt: "2026-11-01T00:00:00.000Z",
          endsAt: "2026-11-01T00:00:00.000Z",
        })
      );
    });

    it("accepts null schedule dates", () => {
      const parsed = createHomepageAdSchema.parse({
        ...validBase,
        startsAt: null,
        endsAt: null,
      });
      assert.equal(parsed.startsAt, null);
      assert.equal(parsed.endsAt, null);
    });

    it("defaults image.alt to an empty string when omitted", () => {
      const parsed = createHomepageAdSchema.parse({
        ...validBase,
        image: { url: validImage.url },
      });
      assert.equal(parsed.image.alt, "");
    });
  });

  describe("updateHomepageAdSchema", () => {
    it("accepts a partial toggle-only update", () => {
      const parsed = updateHomepageAdSchema.parse({ isActive: true });
      assert.equal(parsed.isActive, true);
      assert.equal(parsed.title, undefined);
      assert.equal(parsed.linkUrl, undefined);
    });

    it("accepts a title-only update", () => {
      const parsed = updateHomepageAdSchema.parse({ title: "New title" });
      assert.equal(parsed.title, "New title");
    });

    it("accepts an image-only update", () => {
      const parsed = updateHomepageAdSchema.parse({ image: validImage });
      assert.equal(parsed.image?.url, validImage.url);
    });

    it("rejects an invalid link URL on update", () => {
      assert.throws(() =>
        updateHomepageAdSchema.parse({ linkUrl: "ftp://nope" })
      );
    });

    it("rejects endsAt before startsAt on update", () => {
      assert.throws(() =>
        updateHomepageAdSchema.parse({
          startsAt: "2026-12-02T00:00:00.000Z",
          endsAt: "2026-12-01T00:00:00.000Z",
        })
      );
    });

    it("accepts clearing the schedule with nulls", () => {
      const parsed = updateHomepageAdSchema.parse({
        startsAt: null,
        endsAt: null,
      });
      assert.equal(parsed.startsAt, null);
      assert.equal(parsed.endsAt, null);
    });
  });
});
