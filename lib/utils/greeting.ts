/** India Standard Time is UTC+05:30 and has no daylight saving. */
const IST_OFFSET_MINUTES = 330;

/** Hour (0-23) in IST, regardless of the device/server timezone. */
export function getIstHour(now: Date = new Date()): number {
  const utcMillis = now.getTime() + now.getTimezoneOffset() * 60_000;
  return new Date(utcMillis + IST_OFFSET_MINUTES * 60_000).getHours();
}

/**
 * Time-of-day greeting pinned to IST.
 * Buckets: 05-11 morning, 12-16 afternoon, 17-20 evening, 21-04 night.
 */
export function getGreeting(now: Date = new Date()): string {
  const hour = getIstHour(now);

  if (hour >= 5 && hour < 12) return "Good Morning";
  if (hour >= 12 && hour < 17) return "Good Afternoon";
  if (hour >= 17 && hour < 21) return "Good Evening";
  return "Good Night";
}
