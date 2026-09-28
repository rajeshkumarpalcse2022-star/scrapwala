"use client";

import { useEffect, useState } from "react";
import { Plus, Edit, Clock, Trash2, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminModal from "@/components/admin/AdminModal";

interface TimeSlotRow {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  capacity: number;
  isActive: boolean;
  sortOrder: number;
  booked: number;
}

export default function AdminTimeSlotsPage() {
  const [slots, setSlots] = useState<TimeSlotRow[]>([]);
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
      try {
        const res = await fetch("/api/admin/time-slots", { cache: "no-store" });
        const json = await res.json();
        if (cancelled) return;
        if (!json?.success) {
          setError(json?.message || "Failed to load time slots");
          setSlots([]);
          return;
        }
        setSlots(json.data?.timeSlots ?? []);
        setError("");
      } catch (err) {
        if (cancelled) return;
        setSlots([]);
        setError(err instanceof Error ? err.message : "Failed to load time slots");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const loadSlots = () => {
    setLoading(true);
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

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Pickup Time Slots"
        subtitle="Manage available pickup time windows."
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

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-16 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading time slots…
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-500">No time slots configured.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-600">Time Slot</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Capacity</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Booked</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Available</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {slots.map((slot) => {
                  const available = Math.max(0, slot.capacity - slot.booked);
                  const ratio = slot.capacity > 0 ? slot.booked / slot.capacity : 0;
                  return (
                    <tr key={slot.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="font-medium text-gray-900">{slot.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{slot.capacity}</td>
                      <td className="px-4 py-3 text-gray-600">{slot.booked}</td>
                      <td className="px-4 py-3 text-gray-600">{available}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
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
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              slot.isActive
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {slot.isActive ? "Active" : "Inactive"}
                          </span>
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
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid gap-4 md:hidden">
            {slots.map((slot) => {
              const available = Math.max(0, slot.capacity - slot.booked);
              const ratio = slot.capacity > 0 ? slot.booked / slot.capacity : 0;
              return (
                <div key={slot.id} className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <h3 className="font-medium text-gray-900">{slot.label}</h3>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        slot.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {slot.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                    <div>
                      <span className="text-gray-400">Capacity: </span>{slot.capacity}
                    </div>
                    <div>
                      <span className="text-gray-400">Booked: </span>{slot.booked}
                    </div>
                    <div>
                      <span className="text-gray-400">Avail: </span>{available}
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
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
                  <button
                    onClick={() => openEdit(slot)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    <Edit className="h-3.5 w-3.5" />
                    Edit
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      <AdminModal open={addOpen} onClose={() => setAddOpen(false)} title="Add Time Slot">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
          <div className="grid grid-cols-2 gap-4">
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
    </div>
  );
}
