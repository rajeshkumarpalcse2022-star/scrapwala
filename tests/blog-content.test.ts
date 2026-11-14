import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  blockPreview,
  calculateReadingTimeMinutes,
  countWords,
  extractPlainText,
  inlineText,
  isEmptyContent,
  parseInlineText,
  sanitizeHref,
  type InlineNode,
} from "@/lib/utils/blog-content";
import {
  blogBlockSchema,
  blogContentSchema,
  blogStatusActionSchema,
  createBlogCategorySchema,
  createBlogSchema,
  publicBlogQuerySchema,
} from "@/lib/validations/blog";
import { blockToEditorHtml } from "@/lib/utils/rich-blog-content";

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

    it("includes searchable titles from embeds and link cards", () => {
      const text = extractPlainText([
        {
          type: "embed",
          provider: "youtube",
          url: "https://youtu.be/abcdefghijk",
          embedUrl: "https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0",
          title: "Recycling video",
        },
        {
          type: "link",
          url: "https://example.com/guide",
          title: "Recycling guide",
          description: "A practical handbook",
        },
      ]);
      assert.equal(text, "Recycling video Recycling guide A practical handbook");
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
      assert.equal(sanitizeHref("https://scrapi.in/x"), "https://scrapi.in/x");
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
      const good = parseInlineText("[Read more](https://scrapi.in)");
      assert.equal(good[0]?.type, "a");
      const link = good[0] as Extract<InlineNode, { type: "a" }>;
      assert.equal(link.href, "https://scrapi.in");

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

    it("parses underline and escaped literal markers", () => {
      const underline = parseInlineText("__important__");
      assert.equal(underline[0]?.type, "underline");

      const literal = parseInlineText("\\*not italic\\* and \\_plain\\_");
      assert.equal(inlineText("\\*not italic\\* and \\_plain\\_"), "*not italic* and _plain_");
      assert.equal(
        literal.every((node) => node.type === "text"),
        true
      );
    });
  });

  describe("rich editor HTML", () => {
    it("converts safe inline markup and escaped literals to editor HTML", () => {
      const html = blockToEditorHtml({
        type: "paragraph",
        text: "Use **bold**, __underline__ and [a link](https://scrapi.in)",
      });
      assert.match(html, /<strong>bold<\/strong>/);
      assert.match(html, /<u>underline<\/u>/);
      assert.match(html, /href="https:\/\/scrapi\.in"/);

      const literal = blockToEditorHtml({
        type: "paragraph",
        text: "\\*literal\\*",
      });
      assert.equal(literal.includes("<em>"), false);
      assert.match(literal, /\*literal\*/);
    });

    it("renders media and embeds as non-editable editor cards", () => {
      const html = blockToEditorHtml({
        type: "embed",
        provider: "youtube",
        url: "https://www.youtube.com/watch?v=abcdefghijk",
        embedUrl: "https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0",
        title: "A video",
      });
      assert.match(html, /data-blog-block="embed"/);
      assert.match(html, /data-blog-action="remove-media"/);
      assert.equal(html.includes("<iframe"), false);
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
      assert.equal(
        blockPreview({
          type: "link",
          url: "https://x.test",
          title: "Guide",
        }),
        "Guide"
      );
    });

    it("detects empty content and treats media blocks as content", () => {
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
      assert.equal(
        isEmptyContent([
          {
            type: "embed",
            provider: "vimeo",
            url: "https://vimeo.com/123456789",
            embedUrl: "https://player.vimeo.com/video/123456789",
          },
        ]),
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
      authorName: "Scrapi Team",
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

  it("accepts only canonical allow-listed social embeds", () => {
    const valid = blogContentSchema.safeParse([
      {
        type: "embed",
        provider: "youtube",
        url: "https://youtu.be/abcdefghijk",
        embedUrl: "https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0",
      },
    ]);
    assert.equal(valid.success, true);

    const unsupported = blogContentSchema.safeParse([
      {
        type: "embed",
        provider: "facebook",
        url: "https://example.com/post/1",
        embedUrl: "https://www.facebook.com/plugins/post.php?href=x",
      },
    ]);
    assert.equal(unsupported.success, false);

    const mismatched = blogContentSchema.safeParse([
      {
        type: "embed",
        provider: "youtube",
        url: "https://youtu.be/abcdefghijk",
        embedUrl: "https://evil.example/embed",
      },
    ]);
    assert.equal(mismatched.success, false);
  });

  it("accepts external link cards with safe URLs", () => {
    const result = createBlogSchema.safeParse({
      title: "Recycling links",
      excerpt: "Useful reading for every household.",
      category: "abc123",
      authorName: "Team",
      content: [
        {
          type: "link",
          url: "https://example.com/guide",
          title: "The recycling guide",
          description: "Everything you need to know.",
        },
      ],
    });
    assert.equal(result.success, true);
  });
});
