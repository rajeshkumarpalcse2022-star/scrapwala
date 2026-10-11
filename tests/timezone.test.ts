import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  istDateKeyFromInstant,
  istDayRange,
  isValidDateKey,
  todayIstKey,
} from "../lib/utils/timezone";

describe("timezone (Asia/Kolkata, UTC+05:30)", () => {
  it("maps an instant to its IST calendar day", () => {
    // 18:30 UTC is exactly IST midnight — the start of Oct 10 in India.
    assert.equal(
      istDateKeyFromInstant(new Date("2026-10-09T18:30:00.000Z")),
      "2026-10-10"
    );
    // One millisecond before IST midnight is still the previous IST day.
    assert.equal(
      istDateKeyFromInstant(new Date("2026-10-10T18:29:59.999Z")),
      "2026-10-10"
    );
    // UTC midnight is 05:30 IST, same calendar day.
    assert.equal(
      istDateKeyFromInstant(new Date("2026-10-10T00:00:00.000Z")),
      "2026-10-10"
    );
    // 23:00 UTC is 04:30 IST next day.
    assert.equal(
      istDateKeyFromInstant(new Date("2026-10-10T23:00:00.000Z")),
      "2026-10-11"
    );
  });

  it("builds the half-open UTC range of one IST day", () => {
    const { start, end } = istDayRange("2026-10-10");
    assert.equal(start.toISOString(), "2026-10-09T18:30:00.000Z");
    assert.equal(end.toISOString(), "2026-10-10T18:30:00.000Z");
    assert.equal(end.getTime() - start.getTime(), 86_400_000);
  });

  it("round-trips every instant in a day to the same key", () => {
    const { start, end } = istDayRange("2026-12-31");
    assert.equal(istDateKeyFromInstant(start), "2026-12-31");
    assert.equal(istDateKeyFromInstant(new Date(end.getTime() - 1)), "2026-12-31");
    assert.equal(istDateKeyFromInstant(end), "2027-01-01");
  });

  it("validates date keys, rejecting impossible calendar days", () => {
    assert.equal(isValidDateKey("2026-10-10"), true);
    assert.equal(isValidDateKey("2024-02-29"), true); // leap year
    assert.equal(isValidDateKey("2026-02-30"), false);
    assert.equal(isValidDateKey("2026-13-01"), false);
    assert.equal(isValidDateKey("2026-00-10"), false);
    assert.equal(isValidDateKey("2026-1-1"), false);
    assert.equal(isValidDateKey("10-10-2026"), false);
    assert.equal(isValidDateKey(""), false);
  });

  it("throws on invalid keys when building a range", () => {
    assert.throws(() => istDayRange("nope"));
    assert.throws(() => istDayRange("2026-02-30"));
  });

  it("reports today's IST key consistently", () => {
    const now = new Date("2026-10-10T12:00:00.000Z");
    assert.equal(todayIstKey(now), "2026-10-10");
    // Just after IST midnight still counts as the new day.
    assert.equal(todayIstKey(new Date("2026-10-10T18:31:00.000Z")), "2026-10-11");
  });
});
