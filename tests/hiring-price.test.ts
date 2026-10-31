import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { formatHiringPrice } from "../lib/utils/hiring-fields";

describe("formatHiringPrice", () => {
  it("renders Free for zero, missing or invalid fees", () => {
    assert.equal(formatHiringPrice(0), "Free");
    assert.equal(formatHiringPrice(undefined), "Free");
    assert.equal(formatHiringPrice(null), "Free");
    assert.equal(formatHiringPrice(-5), "Free");
  });

  it("renders whole rupees without decimals", () => {
    assert.equal(formatHiringPrice(99), "₹99");
    assert.equal(formatHiringPrice(12500), "₹12,500");
  });

  it("renders paise precision with at most two decimals", () => {
    assert.equal(formatHiringPrice(99.99), "₹99.99");
    assert.equal(formatHiringPrice(0.5), "₹0.5");
  });
});
