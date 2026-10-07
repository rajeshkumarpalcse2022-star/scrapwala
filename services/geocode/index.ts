import { ApiError } from "@/lib/utils/api-error";

/**
 * Server-side reverse geocoding for the pickup booking flow.
 *
 * Uses the public OpenStreetMap Nominatim API (no API key required).
 * All requests leave the server so nothing is exposed to the browser.
 *
 * Nominatim usage-policy compliance:
 *  - a descriptive User-Agent identifying the app is sent on every request
 *  - outbound requests are throttled to max 1/second
 *  - identical coordinates are served from an in-memory cache (24h TTL)
 *  - concurrent lookups for the same coordinates are coalesced
 *  - upstream failures are surfaced as errors, never faked
 */

export interface ReverseGeocodeResult {
  /** Best-effort city (may be empty — Nominatim does not always return one). */
  city: string;
  state: string;
  pinCode: string;
}

const NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT =
  "ScrapWala/1.0 (+https://github.com/rajeshkumarpalcse2022-star/scrapwala)";

/** Nominatim policy: never more than one request per second. */
const MIN_REQUEST_INTERVAL_MS = 1000;
/** Abort slow upstream calls so the client gets a fast, friendly failure. */
const UPSTREAM_TIMEOUT_MS = 8000;

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;
/** Reject runaway callers instead of queueing unbounded work. */
const MAX_QUEUE_DEPTH = 25;

/** ~1m precision — enough to avoid re-geocoding when the pin barely moves. */
const CACHE_PRECISION = 5;

interface CacheEntry {
  value: ReverseGeocodeResult;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<ReverseGeocodeResult>>();

let throttleChain: Promise<unknown> = Promise.resolve();
let lastRequestAt = 0;
let queueDepth = 0;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(CACHE_PRECISION)},${longitude.toFixed(
    CACHE_PRECISION
  )}`;
}

function readCache(key: string): ReverseGeocodeResult | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.value;
}

function writeCache(key: string, value: ReverseGeocodeResult): void {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

/** Serializes upstream calls and enforces the 1 request/second policy. */
function schedule<T>(task: () => Promise<T>): Promise<T> {
  if (queueDepth >= MAX_QUEUE_DEPTH) {
    return Promise.reject(
      new ApiError(
        429,
        "Too many location lookups right now. Please try again in a moment.",
        "GEOCODE_RATE_LIMITED"
      )
    );
  }
  queueDepth += 1;

  const result = throttleChain.then(async () => {
    const wait = Math.max(0, MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt));
    if (wait > 0) await sleep(wait);
    lastRequestAt = Date.now();
    return task();
  });

  throttleChain = result.then(
    () => undefined,
    () => undefined
  );

  return result.finally(() => {
    queueDepth = Math.max(0, queueDepth - 1);
  });
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

async function fetchReverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
  const url =
    `${NOMINATIM_REVERSE_URL}?format=jsonv2` +
    `&lat=${encodeURIComponent(latitude)}` +
    `&lon=${encodeURIComponent(longitude)}` +
    `&zoom=18&addressdetails=1&accept-language=en`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Nominatim responded with status ${response.status}`);
    }

    const json: unknown = await response.json();
    const address =
      json && typeof json === "object"
        ? ((json as { address?: Record<string, unknown> }).address ?? null)
        : null;

    // No address block: the provider could not resolve this point. Return
    // empty fields (never fabricated values) so the user fills them manually.
    if (!address || typeof address !== "object") {
      return { city: "", state: "", pinCode: "" };
    }

    const city = pickString(
      address.city,
      address.town,
      address.village,
      address.municipality
    );

    return {
      city,
      state: pickString(address.state),
      pinCode: pickString(address.postcode),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Reverse-geocodes numeric coordinates into city/state/PIN.
 * Throws ApiError(400) for invalid coordinates and ApiError(502/429) when
 * the lookup cannot be completed — callers should treat these as "no data"
 * and let the user enter the address manually.
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new ApiError(400, "Invalid coordinates", "INVALID_COORDINATES");
  }

  const key = cacheKey(latitude, longitude);

  const cached = readCache(key);
  if (cached) return cached;

  const existing = inflight.get(key);
  if (existing) return existing;

  const request = schedule(() => fetchReverseGeocode(latitude, longitude))
    .then((value) => {
      writeCache(key, value);
      return value;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}
