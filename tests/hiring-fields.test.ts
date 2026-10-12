import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_FIELD_KEYS,
  UPLOAD_KIND_LIMITS,
  defaultHiringFields,
  isUploadFieldType,
  normalizeEmail,
  normalizeFieldValue,
  normalizePhone,
  slugifyTitle,
  uniqueSlug,
  validateApplicationValues,
  type HiringFieldConfig,
} from "../lib/utils/hiring-fields";

function field(
  overrides: Partial<HiringFieldConfig> & Pick<HiringFieldConfig, "key" | "type">
): HiringFieldConfig {
  return {
    label: overrides.key,
    required: false,
    ...overrides,
  } as HiringFieldConfig;
}

describe("hiring-fields defaults", () => {
  it("ships the nine default fields with stable keys", () => {
    const fields = defaultHiringFields();
    assert.equal(fields.length, 9);
    assert.deepEqual(
      fields.map((f) => f.key),
      [
        DEFAULT_FIELD_KEYS.fullName,
        DEFAULT_FIELD_KEYS.contactNumber,
        DEFAULT_FIELD_KEYS.whatsappNumber,
        DEFAULT_FIELD_KEYS.email,
        DEFAULT_FIELD_KEYS.education,
        DEFAULT_FIELD_KEYS.age,
        DEFAULT_FIELD_KEYS.photo,
        DEFAULT_FIELD_KEYS.signature,
        DEFAULT_FIELD_KEYS.resume,
      ]
    );
  });

  it("marks the required subset correctly", () => {
    const byKey = new Map(
      defaultHiringFields().map((f) => [f.key, f.required])
    );
    assert.equal(byKey.get(DEFAULT_FIELD_KEYS.fullName), true);
    assert.equal(byKey.get(DEFAULT_FIELD_KEYS.contactNumber), true);
    assert.equal(byKey.get(DEFAULT_FIELD_KEYS.email), true);
    assert.equal(byKey.get(DEFAULT_FIELD_KEYS.photo), true);
    assert.equal(byKey.get(DEFAULT_FIELD_KEYS.signature), true);
    assert.equal(byKey.get(DEFAULT_FIELD_KEYS.resume), true);
    assert.equal(byKey.get(DEFAULT_FIELD_KEYS.whatsappNumber), false);
    assert.equal(byKey.get(DEFAULT_FIELD_KEYS.age), false);
  });

  it("never lets admin config exceed system upload limits", () => {
    assert.equal(UPLOAD_KIND_LIMITS.photo_upload.maxBytes, 2 * 1024 * 1024);
    assert.equal(UPLOAD_KIND_LIMITS.signature_upload.maxBytes, 1 * 1024 * 1024);
    assert.equal(UPLOAD_KIND_LIMITS.resume_upload.maxBytes, 3 * 1024 * 1024);
    assert.deepEqual(UPLOAD_KIND_LIMITS.resume_upload.accept, ["application/pdf"]);
  });
});

describe("slug helpers", () => {
  it("slugifies titles", () => {
    assert.equal(slugifyTitle("Delivery Executive"), "delivery-executive");
    assert.equal(slugifyTitle("  Field Executive!! "), "field-executive");
    assert.equal(slugifyTitle("!!!"), "job-application");
  });

  it("appends a counter for duplicates", () => {
    const taken = new Set(["delivery-executive", "delivery-executive-2"]);
    assert.equal(uniqueSlug("delivery-executive", taken), "delivery-executive-3");
    assert.equal(uniqueSlug("sales-executive", taken), "sales-executive");
  });
});

describe("phone/email normalisation", () => {
  it("accepts common Indian mobile formats", () => {
    assert.equal(normalizePhone("9876543210"), "9876543210");
    assert.equal(normalizePhone("+91 98765-43210"), "9876543210");
    assert.equal(normalizePhone("09876543210"), "9876543210");
  });

  it("rejects invalid numbers", () => {
    assert.equal(normalizePhone("12345"), null);
    assert.equal(normalizePhone("5876543210"), null); // must start 6-9
    assert.equal(normalizePhone(""), null);
  });

  it("normalises and validates emails", () => {
    assert.equal(normalizeEmail("  Rajesh.K@Gmail.COM "), "rajesh.k@gmail.com");
    assert.equal(normalizeEmail("not-an-email"), null);
    assert.equal(normalizeEmail("a@b"), null);
  });
});

describe("validateApplicationValues", () => {
  const uploadField = field({
    key: "resume_upload",
    label: "Resume Upload",
    type: "resume_upload",
    required: true,
  });

  it("requires missing values", () => {
    const errors = validateApplicationValues(
      [
        field({ key: "full_name", label: "Full Name", type: "short_text", required: true }),
        field({ key: "notes", label: "Notes", type: "short_text", required: false }),
      ],
      {}
    );
    assert.deepEqual(errors, { full_name: "Full Name is required." });
  });

  it("validates email and phone values", () => {
    const errors = validateApplicationValues(
      [
        field({ key: "gmail_email", label: "Email", type: "email", required: true }),
        field({ key: "contact_number", label: "Phone", type: "phone", required: true }),
      ],
      { gmail_email: "bad", contact_number: "1111" }
    );
    assert.match(errors.gmail_email, /valid email/);
    assert.match(errors.contact_number, /10-digit/);
  });

  it("enforces numeric min/max", () => {
    const errors = validateApplicationValues(
      [field({ key: "age", label: "Age", type: "number", min: 18, max: 70 })],
      { age: "15" }
    );
    assert.match(errors.age, /at least 18/);
  });

  it("checks option membership for select/radio/checkbox", () => {
    const errors = validateApplicationValues(
      [
        field({
          key: "experience",
          label: "Experience",
          type: "select",
          options: [
            { label: "0-1 years", value: "0_1" },
            { label: "1+ years", value: "1_plus" },
          ],
        }),
      ],
      { experience: "unknown_option" }
    );
    assert.match(errors.experience, /listed options/);
  });

  it("requires upload presence only when the field is required", () => {
    const errors = validateApplicationValues(
      [uploadField],
      {},
      {}
    );
    assert.match(errors.resume_upload, /required/);

    const ok = validateApplicationValues([uploadField], {}, {
      resume_upload: { id: "abc123" },
    });
    assert.deepEqual(ok, {});
  });

  it("enforces text length limits", () => {
    const errors = validateApplicationValues(
      [field({ key: "summary", label: "Summary", type: "short_text", maxLength: 20 })],
      { summary: "a".repeat(21) }
    );
    assert.match(errors.summary, /20 characters/);
  });

  it("accepts a complete valid submission", () => {
    const fields = defaultHiringFields();
    const errors = validateApplicationValues(
      fields,
      {
        full_name: "Rajesh Kumar",
        contact_number: "9876543210",
        whatsapp_number: "",
        gmail_email: "rajesh@gmail.com",
        education: "B.A.",
        age: "25",
      },
      {
        photo_upload: { id: "p1" },
        signature_upload: { id: "s1" },
        resume_upload: { id: "r1" },
      }
    );
    assert.deepEqual(errors, {});
  });
});

describe("normalizeFieldValue", () => {
  it("normalises per type", () => {
    assert.equal(
      normalizeFieldValue(field({ key: "phone", type: "phone" }), "+91 98765 43210"),
      "9876543210"
    );
    assert.equal(
      normalizeFieldValue(field({ key: "email", type: "email" }), "A@B.Com"),
      "a@b.com"
    );
    assert.equal(
      normalizeFieldValue(field({ key: "skills", type: "checkbox" }), ["a", "b"]),
      "a, b"
    );
    assert.equal(
      normalizeFieldValue(field({ key: "bio", type: "long_text" }), "line1\r\nline2"),
      "line1\nline2"
    );
  });
});

describe("isUploadFieldType", () => {
  it("identifies upload field types", () => {
    assert.equal(isUploadFieldType("photo_upload"), true);
    assert.equal(isUploadFieldType("signature_upload"), true);
    assert.equal(isUploadFieldType("resume_upload"), true);
    assert.equal(isUploadFieldType("short_text"), false);
  });
});
