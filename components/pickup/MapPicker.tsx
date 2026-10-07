"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Loader2 } from "lucide-react";

export interface MapCoords {
  latitude: number;
  longitude: number;
}

interface MapPickerProps {
  /** Selected pickup coordinates (kept centered on the fixed pin). */
  value: MapCoords | null;
  /**
   * Fired when the map stops moving AFTER a user interaction
   * (pan / zoom / keyboard). Programmatic moves (initial render, external
   * "current location" sync) are intentionally not reported so a default
   * map center is never mistaken for a real pickup point.
   */
  onChange: (coords: MapCoords) => void;
}

const INDIA_CENTER: MapCoords = { latitude: 20.5937, longitude: 78.9629 };

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export default function MapPicker({ value, onChange }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const onChangeRef = useRef(onChange);
  const hasUserInteractedRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [initTick, setInitTick] = useState(0);

  // Always call the latest callback without re-initializing the map.
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  // Initialize the map once (client-only; leaflet needs window).
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    const container = containerRef.current;
    setMapReady(false);
    setLoadError(false);
    hasUserInteractedRef.current = false;

    // Any direct input on the map marks it as user-driven so moveend can be
    // reported; wheel/keyboard matter because they can shift the pin too.
    const markUserInteraction = () => {
      hasUserInteractedRef.current = true;
    };
    container.addEventListener("pointerdown", markUserInteraction, {
      passive: true,
    });
    container.addEventListener("wheel", markUserInteraction, {
      passive: true,
    });
    container.addEventListener("keydown", markUserInteraction);

    (async () => {
      try {
        const L = await import("leaflet");
        if (cancelled || !containerRef.current) return;

        // Clean any previous instance (retry path).
        mapRef.current?.remove();
        mapRef.current = null;
        containerRef.current.innerHTML = "";

        const start = value ?? INDIA_CENTER;
        const startZoom = value ? 16 : 5;

        const map = L.map(containerRef.current, {
          center: [start.latitude, start.longitude],
          zoom: startZoom,
          zoomControl: true,
          attributionControl: true,
        });

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        map.on("moveend", () => {
          const center = map.getCenter();
          if (hasUserInteractedRef.current) {
            onChangeRef.current({
              latitude: round6(center.lat),
              longitude: round6(center.lng),
            });
          }
        });

        mapRef.current = map;
        setMapReady(true);
        requestAnimationFrame(() => map.invalidateSize());
      } catch (err) {
        console.error("Map failed to initialize:", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
      container.removeEventListener("pointerdown", markUserInteraction);
      container.removeEventListener("wheel", markUserInteraction);
      container.removeEventListener("keydown", markUserInteraction);
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initTick]);

  // Keep the pin on the selected coordinates (initial data, current-location
  // button, returning to this step).
  useEffect(() => {
    if (!value || !mapRef.current || !mapReady) return;
    const current = mapRef.current.getCenter();
    if (
      Math.abs(current.lat - value.latitude) > 0.0001 ||
      Math.abs(current.lng - value.longitude) > 0.0001
    ) {
      mapRef.current.setView([value.latitude, value.longitude], 16, {
        animate: false,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.latitude, value?.longitude, mapReady]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-64 w-full overflow-hidden rounded-xl border border-border bg-muted-light sm:h-80"
        role="application"
        aria-label="Pickup location map"
      />
      {!mapReady && !loadError && (
        <div className="pointer-events-none absolute inset-0 z-[1001] flex items-center justify-center rounded-xl bg-muted-light">
          <Loader2
            className="h-5 w-5 animate-spin text-primary motion-reduce:animate-none"
            aria-hidden="true"
          />
        </div>
      )}
      {loadError && (
        <div className="absolute inset-0 z-[1001] flex flex-col items-center justify-center gap-3 rounded-xl bg-muted-light px-4 text-center">
          <p className="text-sm text-muted">Map failed to load.</p>
          <button
            type="button"
            onClick={() => setInitTick((t) => t + 1)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary"
          >
            Retry
          </button>
        </div>
      )}
      {/* Fixed center pin — the map moves beneath it. */}
      {mapReady && !loadError && (
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 z-[1002] -translate-x-1/2 -translate-y-full"
          aria-hidden="true"
        >
          <svg viewBox="0 0 32 44" className="h-11 w-8 drop-shadow-lg" role="presentation">
            <path
              d="M16 0C7.163 0 0 7.163 0 16c0 12 16 28 16 28s16-16 16-28C32 7.163 24.837 0 16 0z"
              fill="#e5342b"
            />
            <circle cx="16" cy="15.5" r="6.6" fill="#ffffff" />
          </svg>
        </div>
      )}
    </div>
  );
}
