"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, MapPin, Loader2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminModal from "@/components/admin/AdminModal";
import type { AdminLocation, AdminLocationStatus } from "@/types/admin";

interface LocationApiDoc {
  id: string;
  name: string;
  city: string;
  state: string;
  postalCodes: string[];
  isActive: boolean;
  serviceRadius?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  updatedAt?: string;
}

function toAdminLocation(doc: LocationApiDoc): AdminLocation {
  return {
    id: doc.id,
    name: doc.name,
    city: doc.city,
    state: doc.state,
    pinCodes: (doc.postalCodes || []).join(", "),
    status: doc.isActive ? "active" : "inactive",
    serviceRadius: doc.serviceRadius ?? null,
    latitude: doc.latitude ?? null,
    longitude: doc.longitude ?? null,
    updatedAt: doc.updatedAt ? doc.updatedAt.split("T")[0] : "—",
  };
}

function parsePinCodes(raw: string): string[] {
  return raw
    .split(/[\n,]/)
    .map((pin) => pin.trim())
    .filter(Boolean);
}

function validatePins(pins: string[]): string | null {
  if (pins.length === 0) return "Please enter at least one PIN code.";
  const invalid = pins.find((pin) => !/^\d{6}$/.test(pin));
  if (invalid) return `"${invalid}" is not a valid 6-digit PIN code.`;
  return null;
}

export default function AdminLocationsPage() {
  const [locations, setLocations] = useState<AdminLocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<AdminLocation | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");
  const [formPins, setFormPins] = useState("");
  const [formStatus, setFormStatus] = useState<AdminLocationStatus>("active");
  const [formLat, setFormLat] = useState("");
  const [formLng, setFormLng] = useState("");
  const [formRadius, setFormRadius] = useState("");

  const [reloadKey, setReloadKey] = useState(0);

  // Initial load + refreshes (retry / after save). Loading state is set by
  // event handlers only; this effect reads fresh data from the API.
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/admin/locations", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load locations.");
        }
        const docs: LocationApiDoc[] = json.data?.locations || [];
        setLocations(docs.map(toAdminLocation));
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setLocations([]);
        setLoadError(
          err instanceof Error ? err.message : "Unable to load locations."
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const loadLocations = () => {
    setIsLoading(true);
    setLoadError(null);
    setReloadKey((key) => key + 1);
  };

  const openAdd = () => {
    setFormName("");
    setFormCity("");
    setFormState("");
    setFormPins("");
    setFormStatus("active");
    setFormLat("");
    setFormLng("");
    setFormRadius("");
    setFormError(null);
    setAddOpen(true);
  };

  const openEdit = (loc: AdminLocation) => {
    setSelected(loc);
    setFormName(loc.name);
    setFormCity(loc.city);
    setFormState(loc.state);
    setFormPins(loc.pinCodes);
    setFormStatus(loc.status);
    setFormLat(loc.latitude != null ? String(loc.latitude) : "");
    setFormLng(loc.longitude != null ? String(loc.longitude) : "");
    setFormRadius(
      loc.serviceRadius != null && loc.serviceRadius > 0
        ? String(loc.serviceRadius)
        : ""
    );
    setFormError(null);
    setEditOpen(true);
  };

  const buildPayload = () => {
    const pins = parsePinCodes(formPins);
    const pinError = validatePins(pins);
    if (pinError) {
      setFormError(pinError);
      return null;
    }
    if (!formName.trim() || !formCity.trim() || !formState.trim()) {
      setFormError("Name, city and state are required.");
      return null;
    }

    const hasLat = formLat.trim() !== "";
    const hasLng = formLng.trim() !== "";
    if (hasLat !== hasLng) {
      setFormError("Enter both latitude and longitude, or leave both blank.");
      return null;
    }
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (hasLat) {
      latitude = Number(formLat);
      longitude = Number(formLng);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
        setFormError("Latitude must be a number between -90 and 90.");
        return null;
      }
      if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        setFormError("Longitude must be a number between -180 and 180.");
        return null;
      }
    }

    let serviceRadius: number | null = null;
    if (formRadius.trim() !== "") {
      serviceRadius = Number(formRadius);
      if (!Number.isFinite(serviceRadius) || serviceRadius <= 0) {
        setFormError("Service radius must be a positive number (km).");
        return null;
      }
      if (!hasLat) {
        setFormError("Service radius needs a center latitude/longitude.");
        return null;
      }
    }

    setFormError(null);
    return {
      name: formName.trim(),
      city: formCity.trim(),
      state: formState.trim(),
      postalCodes: pins,
      isActive: formStatus === "active",
      latitude,
      longitude,
      serviceRadius,
    };
  };

  const handleAdd = async () => {
    const payload = buildPayload();
    if (!payload) return;

    setSaving(true);
    try {
      const res = await fetch("/api/admin/locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.message || "Failed to save location.");
        return;
      }
      setAddOpen(false);
      loadLocations();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selected) return;
    const payload = buildPayload();
    if (!payload) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/locations/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.message || "Failed to update location.");
        return;
      }
      setEditOpen(false);
      loadLocations();
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderForm = (mode: "add" | "edit") => (
    <div className="space-y-4">
      <div>
        <label
          htmlFor={`${mode}-loc-name`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Location Name
        </label>
        <input
          id={`${mode}-loc-name`}
          type="text"
          value={formName}
          onChange={(e) => setFormName(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="e.g. Salt Lake"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`${mode}-loc-city`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            City
          </label>
          <input
            id={`${mode}-loc-city`}
            type="text"
            value={formCity}
            onChange={(e) => setFormCity(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="e.g. Kolkata"
          />
        </div>
        <div>
          <label
            htmlFor={`${mode}-loc-state`}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            State
          </label>
          <input
            id={`${mode}-loc-state`}
            type="text"
            value={formState}
            onChange={(e) => setFormState(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="e.g. West Bengal"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor={`${mode}-loc-pins`}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Pin Codes
        </label>
        <input
          id={`${mode}-loc-pins`}
          type="text"
          inputMode="numeric"
          value={formPins}
          onChange={(e) => setFormPins(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          placeholder="700001, 700002, 700003"
        />
        <p className="mt-1 text-xs text-gray-400">
          Separate multiple PIN codes with commas.
        </p>
      </div>
      <div>
        <span className="block text-sm font-medium text-gray-700 mb-1">
          Service Center <span className="font-normal text-gray-400">(optional)</span>
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <input
            id={`${mode}-loc-lat`}
            type="number"
            step="any"
            value={formLat}
            onChange={(e) => setFormLat(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Latitude"
            aria-label="Center latitude"
          />
          <input
            id={`${mode}-loc-lng`}
            type="number"
            step="any"
            value={formLng}
            onChange={(e) => setFormLng(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Longitude"
            aria-label="Center longitude"
          />
          <input
            id={`${mode}-loc-radius`}
            type="number"
            step="any"
            min={0}
            value={formRadius}
            onChange={(e) => setFormRadius(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Radius (km)"
            aria-label="Service radius in kilometers"
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">
          When set, bookings are validated against this center + radius on the map.
          Leave blank to check by PIN codes only.
        </p>
      </div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Status</label>
        <button
          type="button"
          onClick={() =>
            setFormStatus(formStatus === "active" ? "inactive" : "active")
          }
          aria-label="Toggle location status"
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
            formStatus === "active" ? "bg-emerald-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
              formStatus === "active" ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
      {formError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          {formError}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => (mode === "add" ? setAddOpen(false) : setEditOpen(false))}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={mode === "add" ? handleAdd : handleEdit}
          disabled={
            saving || !formName.trim() || !formCity.trim() || !formState.trim()
          }
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saving ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Serviceable Locations"
        subtitle="Manage areas where ScrapWala operates."
        action={
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add Location
          </button>
        }
      />

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-500">Loading locations...</p>
        </div>
      ) : loadError ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-red-600">{loadError}</p>
          <button
            type="button"
            onClick={loadLocations}
            className="mt-3 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Retry
          </button>
        </div>
      ) : locations.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-500">
            No locations yet. Add your first serviceable location.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {locations.map((loc) => (
            <div
              key={loc.id}
              className="rounded-xl border border-gray-200 bg-white p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100">
                    <MapPin className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-900 break-words">
                      {loc.name}
                    </h3>
                    <p className="text-xs text-gray-500 break-words">
                      {loc.city}, {loc.state}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    loc.status === "active"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {loc.status === "active" ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="space-y-1 text-sm text-gray-600">
                <p className="break-words">
                  <span className="text-gray-400">Pin Codes: </span>
                  {loc.pinCodes}
                </p>
                {loc.latitude != null && loc.longitude != null && (
                  <p className="break-words">
                    <span className="text-gray-400">Center: </span>
                    {loc.latitude.toFixed(4)}, {loc.longitude.toFixed(4)}
                    {loc.serviceRadius ? ` · ${loc.serviceRadius} km` : ""}
                  </p>
                )}
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-gray-400">
                  Updated {loc.updatedAt}
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(loc)}
                  aria-label={`Edit ${loc.name}`}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Location"
      >
        {renderForm("add")}
      </AdminModal>

      <AdminModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Location"
      >
        {renderForm("edit")}
      </AdminModal>
    </div>
  );
}
