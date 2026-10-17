"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Edit,
  Clock,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminModal from "@/components/admin/AdminModal";
import { todayIstKey } from "@/lib/utils/timezone";

type SlotStatus = "active" | "inactive" | "full";

interface TimeSlotRow {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;
  sortOrder: number;
  date: string;
  effectiveCapacity: number;
  booked: number;
  available: number;
  status: SlotStatus;
  hasOverride: boolean;
}

interface OverrideRow {
  id: string;
  date: string;
  capacity: number;
  notes?: string;
  timeSlot: {
    id: string;
    label: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
  };
  booked: number;
  available: number;
  status: SlotStatus;
}

const STATUS_STYLES: Record<SlotStatus, string> = {
  active: "bg-emerald-100 text-emerald-700",
  inactive: "bg-gray-100 text-gray-600",
  full: "bg-red-100 text-red-700",
};

const STATUS_LABELS: Record<SlotStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  full: "Full",
};

function StatusBadge({ status }: { status: SlotStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function CapacityBar({ booked, capacity }: { booked: number; capacity: number }) {
  const ratio = capacity > 0 ? booked / capacity : 0;
  return (
    <div className="h-2 w-24 overflow-hidden rounded-full bg-gray-200">
      <div
        className={`h-full rounded-full transition-all ${
          ratio >= 0.9
            ? "bg-red-500"
            : ratio >= 0.7
              ? "bg-yellow-500"
              : "bg-emerald-500"
        }`}
        style={{ width: `${Math.min(100, ratio * 100)}%` }}
      />
    </div>
  );
}

function formatDateKey(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminTimeSlotsPage() {
  const [slots, setSlots] = useState<TimeSlotRow[]>([]);
  const [overrides, setOverrides] = useState<OverrideRow[]>([]);
  const [dateKey, setDateKey] = useState<string>(() => todayIstKey());
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<TimeSlotRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formCapacity, setFormCapacity] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");

  const [overrideOpen, setOverrideOpen] = useState(false);
  const [selectedOverride, setSelectedOverride] = useState<OverrideRow | null>(
    null
  );
  const [overrideSlotId, setOverrideSlotId] = useState("");
  const [overrideDate, setOverrideDate] = useState("");
  const [overrideCapacity, setOverrideCapacity] = useState("");
  const [overrideNotes, setOverrideNotes] = useState("");
  const [confirmDeleteOverride, setConfirmDeleteOverride] =
    useState<string | null>(null);

  const formatLabel = (start: string, end: string) => {
    const toDisplay = (t: string) => {
      const [h, m] = t.split(":").map(Number);
      const suffix = h >= 12 ? "PM" : "AM";
      const hour = h % 12 || 12;
      return `${String(hour).padStart(2, "0")}:${String(m).padStart(2, "0")} ${suffix}`;
    };
    return `${toDisplay(start)} - ${toDisplay(end)}`;
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const [slotsRes, overridesRes] = await Promise.all([
          fetch(`/api/admin/time-slots?date=${dateKey}`, {
            cache: "no-store",
          }),
          fetch(`/api/admin/time-slot-overrides?date=${dateKey}`, {
            cache: "no-store",
          }),
        ]);
        const slotsJson = await slotsRes.json();
        const overridesJson = await overridesRes.json();
        if (cancelled) return;

        if (!slotsJson?.success) {
          setError(slotsJson?.message || "Failed to load time slots");
          setSlots([]);
          setOverrides([]);
          return;
        }

        setSlots(slotsJson.data?.timeSlots ?? []);
        setOverrides(
          overridesRes.ok && overridesJson?.success
            ? overridesJson.data?.overrides ?? []
            : []
        );
        setError(
          overridesRes.ok
            ? ""
            : overridesJson?.message || "Failed to load overrides"
        );
      } catch (err) {
        if (cancelled) return;
        setSlots([]);
        setOverrides([]);
        setError(
          err instanceof Error ? err.message : "Failed to load time slots"
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, dateKey]);

  const loadSlots = () => {
    setSuccess("");
    setReloadKey((key) => key + 1);
  };

  const openAdd = () => {
    setFormStart("");
    setFormEnd("");
    setFormCapacity("");
    setFormStatus("active");
    setAddOpen(true);
  };

  const openEdit = (slot: TimeSlotRow) => {
    setSelected(slot);
    setFormStart(slot.startTime);
    setFormEnd(slot.endTime);
    setFormCapacity(String(slot.capacity));
    setFormStatus(slot.isActive ? "active" : "inactive");
    setConfirmDelete(false);
    setEditOpen(true);
  };

  const handleAdd = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/time-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: formatLabel(formStart, formEnd),
          startTime: formStart,
          endTime: formEnd,
          capacity: Number(formCapacity),
          isActive: formStatus === "active",
          sortOrder: slots.length,
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        throw new Error(json?.message || "Failed to create time slot");
      }
      setAddOpen(false);
      setSuccess("Time slot created.");
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create time slot");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/time-slots/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: formatLabel(formStart, formEnd),
          startTime: formStart,
          endTime: formEnd,
          capacity: Number(formCapacity),
          isActive: formStatus === "active",
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        throw new Error(json?.message || "Failed to update time slot");
      }
      setEditOpen(false);
      setSuccess("Time slot updated.");
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update time slot");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/time-slots/${selected.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json?.success) {
        throw new Error(json?.message || "Failed to delete time slot");
      }
      setEditOpen(false);
      setSuccess("Time slot deleted.");
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete time slot");
    } finally {
      setSaving(false);
      setConfirmDelete(false);
    }
  };

  const openAddOverride = () => {
    setSelectedOverride(null);
    setOverrideSlotId(slots[0]?.id ?? "");
    setOverrideDate(dateKey);
    setOverrideCapacity("");
    setOverrideNotes("");
    setOverrideOpen(true);
  };

  const openEditOverride = (row: OverrideRow) => {
    setSelectedOverride(row);
    setOverrideSlotId(row.timeSlot.id);
    setOverrideDate(row.date);
    setOverrideCapacity(String(row.capacity));
    setOverrideNotes(row.notes ?? "");
    setOverrideOpen(true);
  };

  const handleSaveOverride = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/time-slot-overrides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          timeSlotId: overrideSlotId,
          date: overrideDate,
          capacity: Number(overrideCapacity),
          notes: overrideNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!json?.success) {
        throw new Error(json?.message || "Failed to save override");
      }
      setOverrideOpen(false);
      setSuccess(
        selectedOverride
          ? "Override updated for the selected date."
          : "Override saved for the selected date."
      );
      if (overrideDate !== dateKey) {
        setDateKey(overrideDate);
      } else {
        await loadSlots();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save override");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOverride = async (id: string) => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/time-slot-overrides/${id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json?.success) {
        throw new Error(json?.message || "Failed to remove override");
      }
      setSuccess("Override removed.");
      await loadSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove override");
    } finally {
      setSaving(false);
      setConfirmDeleteOverride(null);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Date & Time Slots"
        subtitle="Regular pickup windows and date-specific capacity overrides."
        action={
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add Time Slot
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {success}
        </div>
      )}

      {/* Which day are we inspecting? Availability is per IST day. */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <CalendarDays className="h-4 w-4 text-gray-400" />
          <span>
            Showing availability for{" "}
            <span className="font-medium text-gray-900">
              {formatDateKey(dateKey)}
            </span>
          </span>
        </div>
        <input
          type="date"
          value={dateKey}
          onChange={(e) => {
            if (e.target.value) {
              setDateKey(e.target.value);
              setConfirmDeleteOverride(null);
            }
          }}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          aria-label="Date to inspect"
        />
      </div>

      {/* ---------------- Section A: regular time slots ---------------- */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Regular time slots
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            Repeat every day. Booked and available counts are for the date
            selected above.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading time slots…
          </div>
        ) : slots.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-gray-500">No time slots configured.</p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Time Slot
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Capacity
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Booked
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Available
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {slots.map((slot) => (
                    <tr key={slot.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {slot.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <span>{slot.effectiveCapacity}</span>
                          {slot.hasOverride && (
                            <span
                              className="inline-flex items-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700"
                              title={`Regular capacity ${slot.capacity}; overridden for this date`}
                            >
                              override
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{slot.booked}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {slot.available}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <CapacityBar
                            booked={slot.booked}
                            capacity={slot.effectiveCapacity}
                          />
                          <StatusBadge status={slot.status} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openEdit(slot)}
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 md:hidden">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <h3 className="font-medium text-gray-900">
                        {slot.label}
                      </h3>
                    </div>
                    <StatusBadge status={slot.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="text-gray-400">Capacity: </span>
                      {slot.effectiveCapacity}
                      {slot.hasOverride && (
                        <span className="ml-1 rounded bg-indigo-50 px-1 text-[10px] text-indigo-700">
                          override
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-gray-400">Booked: </span>
                      {slot.booked}
                    </div>
                    <div>
                      <span className="text-gray-400">Avail: </span>
                      {slot.available}
                    </div>
                  </div>
                  <CapacityBar
                    booked={slot.booked}
                    capacity={slot.effectiveCapacity}
                  />
                  <button
                    onClick={() => openEdit(slot)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* --------------- Section B: date-specific overrides --------------- */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">
              Date-specific overrides
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Change one day&apos;s capacity without touching the regular slot.
              Showing overrides for{" "}
              {formatDateKey(dateKey)}.
            </p>
          </div>
          <button
            onClick={openAddOverride}
            disabled={slots.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Override
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading overrides…
          </div>
        ) : overrides.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">
              No overrides for {formatDateKey(dateKey)}. Every slot uses its
              regular capacity on this day.
            </p>
          </div>
        ) : (
          <>
            <div className="hidden overflow-hidden md:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Time Slot
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Override Capacity
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Booked
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Available
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Status
                    </th>
                    <th className="px-4 py-3 font-medium text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {overrides.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">
                            {row.timeSlot.label}
                          </span>
                          {!row.timeSlot.isActive && (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                              slot hidden
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{row.capacity}</td>
                      <td className="px-4 py-3 text-gray-600">{row.booked}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {row.available}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={row.status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditOverride(row)}
                            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {confirmDeleteOverride === row.id ? (
                            <button
                              onClick={() => handleDeleteOverride(row.id)}
                              disabled={saving}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              {saving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                              Confirm
                            </button>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteOverride(row.id)}
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                              title="Remove override"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-4 p-4 md:hidden">
              {overrides.map((row) => (
                <div key={row.id} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900">
                      {row.timeSlot.label}
                    </h3>
                    <StatusBadge status={row.status} />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="text-gray-400">Capacity: </span>
                      {row.capacity}
                    </div>
                    <div>
                      <span className="text-gray-400">Booked: </span>
                      {row.booked}
                    </div>
                    <div>
                      <span className="text-gray-400">Avail: </span>
                      {row.available}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditOverride(row)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      <Edit className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    {confirmDeleteOverride === row.id ? (
                      <button
                        onClick={() => handleDeleteOverride(row.id)}
                        disabled={saving}
                        className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Confirm remove
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteOverride(row.id)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <AdminModal open={addOpen} onClose={() => setAddOpen(false)} title="Add Time Slot">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
            <input
              type="number"
              value={formCapacity}
              onChange={(e) => setFormCapacity(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Max pickups per slot"
              min={1}
            />
            <p className="mt-1 text-xs text-gray-500">
              Capacity cannot go below bookings that already exist for this
              slot.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <button
              onClick={() => setFormStatus(formStatus === "active" ? "inactive" : "active")}
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
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setAddOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAdd}
              disabled={!formStart || !formEnd || !formCapacity || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      </AdminModal>

      <AdminModal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Time Slot">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                value={formStart}
                onChange={(e) => setFormStart(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                value={formEnd}
                onChange={(e) => setFormEnd(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
            <input
              type="number"
              value={formCapacity}
              onChange={(e) => setFormCapacity(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Max pickups per slot"
              min={1}
            />
            <p className="mt-1 text-xs text-gray-500">
              Capacity cannot go below bookings that already exist for this
              slot.
            </p>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <button
              onClick={() => setFormStatus(formStatus === "active" ? "inactive" : "active")}
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
          <div className="flex items-center justify-between gap-3 pt-2">
            <div>
              {confirmDelete ? (
                <button
                  onClick={handleDelete}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  Confirm delete
                </button>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setEditOpen(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEdit}
                disabled={!formStart || !formEnd || !formCapacity || saving}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save
              </button>
            </div>
          </div>
        </div>
      </AdminModal>

      <AdminModal
        open={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        title={selectedOverride ? "Edit Override" : "Add Date Override"}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time Slot
            </label>
            <select
              value={overrideSlotId}
              onChange={(e) => setOverrideSlotId(e.target.value)}
              disabled={Boolean(selectedOverride)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50"
            >
              <option value="" disabled>
                Select a time slot
              </option>
              {slots.map((slot) => (
                <option key={slot.id} value={slot.id}>
                  {slot.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              value={overrideDate}
              onChange={(e) => setOverrideDate(e.target.value)}
              disabled={Boolean(selectedOverride)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-gray-50"
            />
            <p className="mt-1 text-xs text-gray-500">
              The override applies only to this date.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacity for this date
            </label>
            <input
              type="number"
              value={overrideCapacity}
              onChange={(e) => setOverrideCapacity(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="Max pickups for this date"
              min={1}
            />
            <p className="mt-1 text-xs text-gray-500">
              Cannot be lower than bookings already made for this date.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              value={overrideNotes}
              onChange={(e) => setOverrideNotes(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              placeholder="e.g. Festival day, extra staff"
              maxLength={200}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setOverrideOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveOverride}
              disabled={
                !overrideSlotId || !overrideDate || !overrideCapacity || saving
              }
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Override
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
