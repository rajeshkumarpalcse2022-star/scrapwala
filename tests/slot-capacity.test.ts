import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  availabilityOf,
  capacityBelowBookingsMessage,
  effectiveCapacityOf,
  isSlotFull,
  parseClockToMinutes,
  remainingOf,
  slotStatus,
  windowKey,
} from "../lib/utils/slot-capacity";

describe("parseClockToMinutes", () => {
  it("parses canonical 24h values stored on TimeSlot", () => {
    assert.equal(parseClockToMinutes("00:00"), 0);
    assert.equal(parseClockToMinutes("09:00"), 540);
    assert.equal(parseClockToMinutes("11:00"), 660);
    assert.equal(parseClockToMinutes("13:00"), 780);
    assert.equal(parseClockToMinutes("23:59"), 1439);
  });

  it("parses the legacy 12h values found on old pickups", () => {
    assert.equal(parseClockToMinutes("11:00 AM"), 660);
    assert.equal(parseClockToMinutes("01:00 PM"), 780);
    assert.equal(parseClockToMinutes("12:00 AM"), 0);
    assert.equal(parseClockToMinutes("12:00 PM"), 720);
    assert.equal(parseClockToMinutes("9:05 am"), 545);
  });

  it("rejects values it cannot interpret", () => {
    assert.equal(parseClockToMinutes(""), null);
    assert.equal(parseClockToMinutes("abc"), null);
    assert.equal(parseClockToMinutes("24:00"), null);
    assert.equal(parseClockToMinutes("09:60"), null);
    assert.equal(parseClockToMinutes("13:00 PM"), null);
    assert.equal(parseClockToMinutes("9:5"), null);
    assert.equal(parseClockToMinutes(null), null);
    assert.equal(parseClockToMinutes(undefined), null);
  });
});

describe("windowKey", () => {
  it("collapses legacy and canonical spellings of the same window", () => {
    assert.equal(windowKey("11:00", "13:00"), "660-780");
    assert.equal(windowKey("11:00 AM", "01:00 PM"), "660-780");
    assert.equal(
      windowKey("11:00", "13:00"),
      windowKey("11:00 AM", "01:00 PM")
    );
  });

  it("keeps different windows distinct", () => {
    assert.notEqual(windowKey("09:00", "11:00"), windowKey("11:00", "13:00"));
  });

  it("falls back to a verbatim key when a value is unparsable", () => {
    assert.equal(windowKey("??", "??"), "raw:??|??");
    assert.equal(
      windowKey("09:00", "??"),
      windowKey("09:00", "??")
    );
  });
});

describe("capacity helpers", () => {
  it("prefers the date override over the regular capacity", () => {
    assert.equal(effectiveCapacityOf(20, 5), 5);
    assert.equal(effectiveCapacityOf(20, undefined), 20);
    assert.equal(effectiveCapacityOf(20, null), 20);
  });

  it("never reports a negative remaining count", () => {
    assert.equal(remainingOf(5, 3), 2);
    assert.equal(remainingOf(5, 7), 0);
    assert.equal(remainingOf(0, 0), 0);
  });

  it("derives availability from the effective capacity", () => {
    assert.equal(availabilityOf(20, 0), "available");
    assert.equal(availabilityOf(20, 15), "available"); // 5 left > threshold 4
    assert.equal(availabilityOf(20, 16), "limited"); // 4 left <= threshold 4
    assert.equal(availabilityOf(20, 19), "limited");
    assert.equal(availabilityOf(20, 20), "unavailable");
    assert.equal(availabilityOf(20, 25), "unavailable");
  });

  it("detects a full slot", () => {
    assert.equal(isSlotFull(5, 4), false);
    assert.equal(isSlotFull(5, 5), true);
    assert.equal(isSlotFull(5, 6), true);
  });
});

describe("slotStatus", () => {
  it("prioritises Inactive over Full", () => {
    assert.equal(
      slotStatus({ isActive: false, capacity: 5, booked: 9 }),
      "inactive"
    );
  });

  it("marks a slot Full once bookings reach capacity", () => {
    assert.equal(slotStatus({ isActive: true, capacity: 5, booked: 5 }), "full");
    assert.equal(slotStatus({ isActive: true, capacity: 5, booked: 6 }), "full");
    assert.equal(slotStatus({ isActive: true, capacity: 5, booked: 4 }), "active");
  });
});

describe("capacityBelowBookingsMessage", () => {
  it("names the booking count that blocks the reduction", () => {
    assert.equal(
      capacityBelowBookingsMessage(5),
      "Capacity cannot be lower than existing bookings (5)"
    );
  });
});
