"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import "leaflet/dist/leaflet.css";
import { Crosshair, CheckCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MapCoords {
  latitude: number;
  longitude: number;
}

interface MapPickerProps {
  /** Confirmed coordinates (from a previous visit to this step). */
  value: MapCoords | null;
  onConfirm: (coords: MapCoords) => void;
}

const INDIA_CENTER: MapCoords = { latitude: 20.5937, longitude: 78.9629 };

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

export default function MapPicker({ value, onConfirm }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const [draft, setDraft] = useState<MapCoords>(value ?? INDIA_CENTER);
  const [locating, setLocating] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [initTick, setInitTick] = useState(0);

  // Initialize the map once (client-only; leaflet needs window).
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    setMapReady(false);
    setLoadError(false);

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
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        }).addTo(map);

        map.on("moveend", () => {
          const center = map.getCenter();
          setDraft({ latitude: round6(center.lat), longitude: round6(center.lng) });
        });

        mapRef.current = map;
        setMapReady(true);
        setDraft({ latitude: round6(start.latitude), longitude: round6(start.longitude) });
        requestAnimationFrame(() => map.invalidateSize());

        // Best-effort: center on the customer's actual position.
        if (!value && typeof navigator !== "undefined" && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              map.setView([pos.coords.latitude, pos.coords.longitude], 15, {
                animate: false,
              });
            },
            () => {
              // keep default view
            },
            { timeout: 5000, maximumAge: 60000 }
          );
        }
      } catch (err) {
        console.error("Map failed to initialize:", err);
        if (!cancelled) setLoadError(true);
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initTick]);

  // When returning to this step with confirmed coords, snap the map there.
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

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        mapRef.current?.setView(
          [pos.coords.latitude, pos.coords.longitude],
          16,
          { animate: true }
        );
        setLocating(false);
      },
      () => {
        setLocating(false);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const isConfirmed =
    value != null &&
    Math.abs(value.latitude - draft.latitude) < 1e-9 &&
    Math.abs(value.longitude - draft.longitude) < 1e-9;

  return (
    <div>
      <div className="relative">
        <div
          ref={containerRef}
          className="h-64 w-full overflow-hidden rounded-xl border border-border bg-muted-light sm:h-80"
          role="application"
          aria-label="Pickup location map"
        />
        {!mapReady && !loadError && (
          <div className="pointer-events-none absolute inset-0 z-[1001] flex items-center justify-center rounded-xl bg-muted-light">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
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
            {/* Classic red map pin with white center circle */}
            <svg
              viewBox="0 0 32 44"
              className="h-11 w-8 drop-shadow-lg"
              role="presentation"
            >
              <path
                d="M16 0C7.163 0 0 7.163 0 16c0 12 16 28 16 28s16-16 16-28C32 7.163 24.837 0 16 0z"
                fill="#e5342b"
              />
              <circle cx="16" cy="15.5" r="6.6" fill="#ffffff" />
            </svg>
          </div>
        )}
        <div className="absolute bottom-2 left-2 z-[1001] rounded-md bg-card/90 px-2 py-1 text-xs font-medium text-muted shadow-sm">
          {draft.latitude.toFixed(5)}, {draft.longitude.toFixed(5)}
        </div>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="absolute right-2 top-2 z-[1001] inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-muted-light focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-60"
        >
          <Crosshair className={cn("h-3.5 w-3.5", locating && "animate-spin")} aria-hidden="true" />
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted">
          <p className="font-medium text-foreground">Pickup Point</p>
          <p className="mt-0.5">
            Move the map so the pin sits on your pickup spot.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onConfirm(draft)}
          className={cn(
            "inline-flex shrink-0 items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            isConfirmed
              ? "border border-primary bg-primary-light text-primary"
              : "bg-primary text-white hover:bg-primary-dark"
          )}
        >
          {isConfirmed && <CheckCircle className="h-4 w-4" aria-hidden="true" />}
          {isConfirmed ? "Location Confirmed" : "Confirm Location"}
        </button>
      </div>

      {value && (
        <p className="mt-2 text-xs text-primary">
          Selected Location: {value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}
        </p>
      )}
    </div>
  );
}
