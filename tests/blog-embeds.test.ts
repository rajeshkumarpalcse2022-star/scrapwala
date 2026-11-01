import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isSocialEmbedUrl,
  parseSocialEmbed,
  SOCIAL_EMBED_FRAME_ORIGINS,
} from "@/lib/utils/social-embeds";

describe("social embed parser", () => {
  it("normalises YouTube watch, short and Shorts links", () => {
    const watch = parseSocialEmbed("https://www.youtube.com/watch?v=abcdefghijk");
    assert.equal(watch?.provider, "youtube");
    assert.equal(watch?.url, "https://www.youtube.com/watch?v=abcdefghijk");
    assert.equal(
      watch?.embedUrl,
      "https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0"
    );

    const short = parseSocialEmbed("https://youtu.be/abcdefghijk");
    assert.equal(short?.url, "https://www.youtube.com/watch?v=abcdefghijk");

    const shorts = parseSocialEmbed(
      "https://youtube.com/shorts/abcdefghijk"
    );
    assert.equal(shorts?.url, "https://www.youtube.com/watch?v=abcdefghijk");
  });

  it("normalises Facebook, Instagram and Vimeo links", () => {
    const facebook = parseSocialEmbed(
      "https://www.facebook.com/scrapi/posts/123456"
    );
    assert.equal(facebook?.provider, "facebook");
    assert.ok(facebook?.embedUrl.startsWith("https://www.facebook.com/plugins/post.php?"));
    assert.ok(facebook?.embedUrl.includes("show_text=true"));

    const video = parseSocialEmbed(
      "https://www.facebook.com/scrapi/videos/123456"
    );
    assert.ok(video?.embedUrl.startsWith("https://www.facebook.com/plugins/video.php?"));

    const instagram = parseSocialEmbed(
      "https://instagram.com/reel/ABC123xyz/"
    );
    assert.equal(instagram?.provider, "instagram");
    assert.equal(
      instagram?.embedUrl,
      "https://www.instagram.com/reel/ABC123xyz/embed/"
    );

    const vimeo = parseSocialEmbed("https://vimeo.com/123456789");
    assert.equal(vimeo?.provider, "vimeo");
    assert.equal(vimeo?.embedUrl, "https://player.vimeo.com/video/123456789");
  });

  it("upgrades shared social links to https", () => {
    const parsed = parseSocialEmbed("http://youtu.be/abcdefghijk");
    assert.equal(parsed?.url, "https://www.youtube.com/watch?v=abcdefghijk");
  });

  it("rejects unsupported hosts and spoofed domains", () => {
    assert.equal(parseSocialEmbed("https://example.com/video/1"), null);
    assert.equal(
      parseSocialEmbed("https://youtube.com.evil.example/watch?v=abcdefghijk"),
      null
    );
    assert.equal(parseSocialEmbed("javascript:alert(1)"), null);
    assert.equal(parseSocialEmbed("https://www.youtube.com/watch?v=x"), null);
    assert.equal(parseSocialEmbed(null), null);
    assert.equal(isSocialEmbedUrl("https://vimeo.com/123456789"), true);
  });

  it("keeps the iframe allow-list in sync with rendered providers", () => {
    assert.ok(SOCIAL_EMBED_FRAME_ORIGINS.includes("https://www.youtube-nocookie.com"));
    assert.ok(SOCIAL_EMBED_FRAME_ORIGINS.includes("https://www.facebook.com"));
    assert.ok(SOCIAL_EMBED_FRAME_ORIGINS.includes("https://www.instagram.com"));
    assert.ok(SOCIAL_EMBED_FRAME_ORIGINS.includes("https://player.vimeo.com"));
  });
});
