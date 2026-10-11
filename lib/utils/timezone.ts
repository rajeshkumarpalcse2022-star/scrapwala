/**
 * Business timezone helpers pinned to Asia/Kolkata (UTC+05:30, no DST).
 *
 * Every slot-availability question in the app is scoped to an IST calendar
 * day, stored as the plain string key "YYYY-MM-DD" (never a Date), so the
 * admin panel, the customer booking flow and the capacity service can never
 * disagree about which day is meant.
 */
export const IST_OFFSET_MINUTES = 330;
const MS_PER_DAY = 86_400_000;

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateKey(value: string): boolean {
  if (!DATE_KEY_RE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  return (
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day
  );
}

/** "YYYY-MM-DD" key of the IST calendar day containing `instant`. */
export function istDateKeyFromInstant(instant: Date): string {
  const shifted = new Date(instant.getTime() + IST_OFFSET_MINUTES * 60_000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const day = String(shifted.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * UTC instant range [start, end) covering the given IST calendar day.
 * IST midnight of day D is D 00:00 +05:30, i.e. (D-1) 18:30 UTC.
 */
export function istDayRange(dateKey: string): { start: Date; end: Date } {
  if (!isValidDateKey(dateKey)) {
    throw new Error(`Invalid date key: ${dateKey}`);
  }
  const [year, month, day] = dateKey.split("-").map(Number);
  const istMidnightUtc = Date.UTC(year, month - 1, day) - IST_OFFSET_MINUTES * 60_000;
  return {
    start: new Date(istMidnightUtc),
    end: new Date(istMidnightUtc + MS_PER_DAY),
  };
}

/** IST calendar day key for "today" (defaults to now). */
export function todayIstKey(now: Date = new Date()): string {
  return istDateKeyFromInstant(now);
}
