import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blockPreview,
  calculateReadingTimeMinutes,
  countWords,
  extractPlainText,
  isEmptyContent,
  parseInlineText,
  sanitizeHref,
  type InlineNode,
} from "@/lib/utils/blog-content";
import {
  blogBlockSchema,
  blogStatusActionSchema,
  createBlogCategorySchema,
  createBlogSchema,
  publicBlogQuerySchema,
} from "@/lib/validations/blog";

describe("blog content utils", () => {
  describe("extractPlainText", () => {
    it("joins text from every block type", () => {
      const text = extractPlainText([
        { type: "heading", level: 2, text: "Title" },
        { type: "paragraph", text: "Body copy" },
        { type: "bulletList", items: ["one", "two"] },
        { type: "orderedList", items: ["first"] },
        { type: "blockquote", text: "Quote" },
        { type: "image", url: "https://x.test/a.png", alt: "alt text", caption: "cap" },
      ]);
      assert.equal(
        text,
        "Title Body copy one two first Quote alt text cap"
      );
    });

    it("returns an empty string for invalid input", () => {
      assert.equal(extractPlainText(null), "");
      assert.equal(extractPlainText("not an array"), "");
      assert.equal(extractPlainText([null, 42, "x"]), "");
    });
  });

  describe("countWords / calculateReadingTimeMinutes", () => {
    it("counts unicode words including hyphens and apostrophes", () => {
      assert.equal(countWords("it's a green-tomorrow"), 3);
      assert.equal(countWords(""), 0);
    });

    it("never returns less than one minute", () => {
      assert.equal(calculateReadingTimeMinutes([]), 1);
      assert.equal(
        calculateReadingTimeMinutes([{ type: "paragraph", text: "short note" }]),
        1
      );
    });

    it("scales with real word counts (≈220 wpm)", () => {
      const long = "word ".repeat(440).trim();
      assert.equal(
        calculateReadingTimeMinutes([{ type: "paragraph", text: long }]),
        2
      );
    });
  });

  describe("sanitizeHref", () => {
    it("keeps http(s) and mailto links", () => {
      assert.equal(sanitizeHref("https://scrapwala.example/x"), "https://scrapwala.example/x");
      assert.equal(sanitizeHref("http://a.test"), "http://a.test");
      assert.equal(sanitizeHref("mailto:hi@a.test"), "mailto:hi@a.test");
    });

    it("rejects javascript, data and control-character tricks", () => {
      assert.equal(sanitizeHref("javascript:alert(1)"), null);
      assert.equal(sanitizeHref("data:text/html,<script>"), null);
      assert.equal(sanitizeHref("jav\tascript:alert(1)"), null);
      assert.equal(sanitizeHref("  "), null);
      assert.equal(sanitizeHref(""), null);
    });
  });

  describe("parseInlineText", () => {
    it("returns plain text nodes when there is no markup", () => {
      assert.deepEqual(parseInlineText("hello world"), [
        { type: "text", value: "hello world" },
      ]);
      assert.deepEqual(parseInlineText(""), []);
    });

    it("parses bold, italic and nested markup", () => {
      const nodes = parseInlineText("**bold *and* fine**");
      assert.equal(nodes.length, 1);
      assert.equal(nodes[0]?.type, "strong");
      const strong = nodes[0] as Extract<InlineNode, { type: "strong" }>;
      assert.ok(strong.children.some((child) => child.type === "em"));
    });

    it("parses links with safe hrefs only", () => {
      const good = parseInlineText("[Read more](https://scrapwala.example)");
      assert.equal(good[0]?.type, "a");
      const link = good[0] as Extract<InlineNode, { type: "a" }>;
      assert.equal(link.href, "https://scrapwala.example");

      const bad = parseInlineText("[click](javascript:alert(1))");
      assert.equal(bad.every((node) => node.type === "text"), true);
    });

    it("leaves malformed markup as literal text", () => {
      assert.deepEqual(parseInlineText("**unclosed"), [
        { type: "text", value: "**unclosed" },
      ]);
      assert.deepEqual(parseInlineText("[]()"), [
        { type: "text", value: "[]()" },
      ]);
    });
  });

  describe("blockPreview / isEmptyContent", () => {
    it("previews each block type", () => {
      assert.equal(
        blockPreview({ type: "heading", level: 3, text: "H" }),
        "H"
      );
      assert.equal(
        blockPreview({ type: "bulletList", items: ["first", "second"] }),
        "first"
      );
      assert.equal(
        blockPreview({
          type: "image",
          url: "https://x.test/a.png",
          alt: "alt",
          caption: "cap",
        }),
        "cap"
      );
      assert.equal(
        blockPreview({
          type: "image",
          url: "https://x.test/a.png",
          alt: "alt",
        }),
        "alt"
      );
    });

    it("detects empty content", () => {
      assert.equal(isEmptyContent([]), true);
      assert.equal(isEmptyContent(null), true);
      assert.equal(isEmptyContent([{ type: "paragraph", text: "   " }]), true);
      assert.equal(
        isEmptyContent([{ type: "bulletList", items: [] }]),
        true
      );
      assert.equal(
        isEmptyContent([{ type: "paragraph", text: "hi" }]),
        false
      );
    });
  });
});

describe("blog validations", () => {
  it("accepts a valid create payload and derives defaults", () => {
    const parsed = createBlogSchema.parse({
      title: "How to recycle e-waste",
      excerpt: "A practical guide to e-waste recycling.",
      content: [{ type: "paragraph", text: "Body" }],
      category: "abc123",
      authorName: "ScrapWala Team",
    });
    assert.equal(parsed.title, "How to recycle e-waste");
    assert.equal(parsed.status, undefined);
  });

  it("rejects a too-short excerpt and missing category", () => {
    const result = createBlogSchema.safeParse({
      title: "Valid title",
      excerpt: "short",
      content: [{ type: "paragraph", text: "Body" }],
      category: "",
      authorName: "Team",
    });
    assert.equal(result.success, false);
  });

  it("rejects a javascript cover image URL", () => {
    const result = createBlogSchema.safeParse({
      title: "Valid title",
      excerpt: "Long enough excerpt",
      content: [{ type: "paragraph", text: "Body" }],
      category: "abc123",
      authorName: "Team",
      coverImage: { url: "javascript:alert(1)", alt: "" },
    });
    assert.equal(result.success, false);
  });

  it("requires a valid schedule time for the status action", () => {
    const ok = blogStatusActionSchema.safeParse({
      status: "scheduled",
      scheduledAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    assert.equal(ok.success, true);

    const missing = blogStatusActionSchema.safeParse({ status: "scheduled" });
    assert.equal(missing.success, true);

    const badDate = blogStatusActionSchema.safeParse({
      status: "scheduled",
      scheduledAt: "not-a-date",
    });
    assert.equal(badDate.success, false);
  });

  it("validates public query parameters (service clamps further)", () => {
    const parsed = publicBlogQuerySchema.parse({ page: "2", limit: "9" });
    assert.equal(parsed.page, 2);
    assert.equal(parsed.limit, 9);

    assert.equal(
      publicBlogQuerySchema.safeParse({ limit: "999" }).success,
      false
    );
    assert.equal(publicBlogQuerySchema.safeParse({ page: "0" }).success, false);
  });

  it("validates blog categories separately from scrap categories", () => {
    const parsed = createBlogCategorySchema.parse({
      name: "Recycling Guides",
      description: "How-to articles",
    });
    assert.equal(parsed.isActive, true);
    assert.equal(
      createBlogCategorySchema.safeParse({ name: "x" }).success,
      false
    );
    assert.equal(
      blogBlockSchema.safeParse({ type: "paragraph", text: "ok" }).success,
      true
    );
    assert.equal(
      blogBlockSchema.safeParse({ type: "html", html: "<script>" }).success,
      false
    );
  });
});
