"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Edit, Trash2, IndianRupee, Loader2 } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminModal from "@/components/admin/AdminModal";
import type { AdminCategoryDTO } from "@/services/category";
import type { AdminRateDTO } from "@/services/rate";

type Status = "active" | "inactive";
type Unit = "kg" | "piece" | "unit";

export default function AdminRatesPage() {
  const [rates, setRates] = useState<AdminRateDTO[]>([]);
  const [categories, setCategories] = useState<AdminCategoryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<AdminRateDTO | null>(null);

  const [formParentId, setFormParentId] = useState("");
  const [formSubId, setFormSubId] = useState("");
  const [formMin, setFormMin] = useState("");
  const [formMax, setFormMax] = useState("");
  const [formUnit, setFormUnit] = useState<Unit>("kg");
  const [formStatus, setFormStatus] = useState<Status>("active");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [ratesRes, catsRes] = await Promise.all([
          fetch("/api/admin/rates", { cache: "no-store" }),
          fetch("/api/admin/categories", { cache: "no-store" }),
        ]);
        const ratesJson = await ratesRes.json();
        const catsJson = await catsRes.json();
        if (cancelled) return;
        if (!ratesRes.ok || !ratesJson.success) {
          throw new Error(ratesJson.message || "Failed to load rates.");
        }
        if (!catsRes.ok || !catsJson.success) {
          throw new Error(catsJson.message || "Failed to load categories.");
        }
        setRates(ratesJson.data?.rates || []);
        setCategories(catsJson.data?.categories || []);
        setLoadError(null);
      } catch (err) {
        if (cancelled) return;
        setRates([]);
        setCategories([]);
        setLoadError(err instanceof Error ? err.message : "Unable to load rates.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const loadAll = () => {
    setIsLoading(true);
    setLoadError(null);
    setReloadKey((key) => key + 1);
  };

  const activeParents = useMemo(
    () => categories.filter((c) => c.status === "active"),
    [categories]
  );

  const subsOfParent = useMemo(() => {
    const parent = categories.find((c) => c.id === formParentId);
    return (parent?.subcategories || []).filter((s) => s.status === "active");
  }, [categories, formParentId]);

  const rateCategoryNames = useMemo(
    () => Array.from(new Set(rates.map((r) => r.category))).sort(),
    [rates]
  );

  const filtered = rates.filter((r) => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === "all" || r.category === categoryFilter;
    return matchSearch && matchCat;
  });

  const resetForm = () => {
    setFormParentId("");
    setFormSubId("");
    setFormMin("");
    setFormMax("");
    setFormUnit("kg");
    setFormStatus("active");
    setFormError(null);
  };

  const openAdd = () => {
    resetForm();
    setAddOpen(true);
  };

  const openEdit = (rate: AdminRateDTO) => {
    resetForm();
    setSelected(rate);
    const parent = categories.find((c) =>
      c.subcategories.some((s) => s.id === rate.subcategoryId)
    );
    setFormParentId(parent?.id || "");
    setFormSubId(rate.subcategoryId);
    setFormMin(String(rate.minRate));
    setFormMax(String(rate.maxRate));
    setFormUnit(rate.unit);
    setFormStatus(rate.status);
    setEditOpen(true);
  };

  const openDelete = (rate: AdminRateDTO) => {
    setSelected(rate);
    setFormError(null);
    setDeleteOpen(true);
  };

  const validateForm = (): string | null => {
    if (!formParentId) return "Please select a category.";
    if (!formSubId) return "Please select a subcategory.";
    const min = Number(formMin);
    const max = Number(formMax);
    if (formMin === "" || formMax === "" || Number.isNaN(min) || Number.isNaN(max)) {
      return "Please enter valid minimum and maximum rates.";
    }
    if (min < 0 || max < 0) return "Rates cannot be negative.";
    if (max < min) return "Maximum rate must be greater than or equal to minimum rate.";
    return null;
  };

  const handleAdd = async () => {
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/admin/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formSubId,
          minRate: Number(formMin),
          maxRate: Number(formMax),
          unit: formUnit,
          isActive: formStatus === "active",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.message || "Failed to save rate.");
        return;
      }
      setAddOpen(false);
      loadAll();
    } catch {
      setFormError("Unable to save rate. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selected) return;
    const error = validateForm();
    if (error) {
      setFormError(error);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/admin/rates/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: formSubId,
          minRate: Number(formMin),
          maxRate: Number(formMax),
          unit: formUnit,
          isActive: formStatus === "active",
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.message || "Failed to save rate.");
        return;
      }
      setEditOpen(false);
      loadAll();
    } catch {
      setFormError("Unable to save rate. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/admin/rates/${selected.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setFormError(json.message || "Failed to delete rate.");
        return;
      }
      setDeleteOpen(false);
      loadAll();
    } catch {
      setFormError("Unable to delete rate. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const renderForm = (mode: "add" | "edit") => (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Category
        </label>
        <select
          value={formParentId}
          onChange={(e) => {
            setFormParentId(e.target.value);
            setFormSubId("");
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Select a category</option>
          {activeParents.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Subcategory (scrap item)
        </label>
        <select
          value={formSubId}
          onChange={(e) => setFormSubId(e.target.value)}
          disabled={!formParentId}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:opacity-50"
        >
          <option value="">
            {formParentId ? "Select a subcategory" : "Select a category first"}
          </option>
          {subsOfParent.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {formParentId && subsOfParent.length === 0 && (
          <p className="mt-1 text-xs text-amber-600">
            This category has no active subcategories. Add one under Scrap
            Categories first.
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Min Rate (₹)
          </label>
          <input
            type="number"
            min="0"
            value={formMin}
            onChange={(e) => setFormMin(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="0"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Max Rate (₹)
          </label>
          <input
            type="number"
            min="0"
            value={formMax}
            onChange={(e) => setFormMax(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="0"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Unit
          </label>
          <select
            value={formUnit}
            onChange={(e) => setFormUnit(e.target.value as Unit)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="kg">kg</option>
            <option value="piece">piece</option>
            <option value="unit">unit</option>
          </select>
        </div>
        <div className="flex items-end">
          <div className="flex w-full items-center justify-between rounded-lg border border-gray-300 px-3 py-2">
            <label className="text-sm font-medium text-gray-700">Status</label>
            <button
              onClick={() =>
                setFormStatus(formStatus === "active" ? "inactive" : "active")
              }
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
        </div>
      </div>
      <p className="text-xs text-gray-400">
        The item name is taken from the selected subcategory. Only one active
        rate is allowed per subcategory.
      </p>
      {formError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          {formError}
        </p>
      )}
      <div className="flex justify-end gap-3 pt-2">
        <button
          onClick={() => (mode === "add" ? setAddOpen(false) : setEditOpen(false))}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={mode === "add" ? handleAdd : handleEdit}
          disabled={saving}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Scrap Rates Management"
        subtitle="Manage pricing for all scrap materials."
        action={
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Add Rate
          </button>
        }
      />

      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-16 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading rates…
        </div>
      )}

      {!isLoading && loadError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p>{loadError}</p>
          <button
            onClick={loadAll}
            className="mt-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !loadError && (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by item name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="all">All Categories</option>
              {rateCategoryNames.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
              <p className="text-sm font-medium text-gray-900">
                {rates.length === 0 ? "No rates configured yet" : "No rates found."}
              </p>
              <p className="mt-1 text-sm text-gray-500">
                {rates.length === 0
                  ? "Add a rate for a subcategory to enable weighing and payouts."
                  : "Try a different search or category filter."}
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white md:block">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-gray-200 bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 font-medium text-gray-600">Item</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Category</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Min Rate (₹)</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Max Rate (₹)</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Unit</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Last Updated</th>
                      <th className="px-4 py-3 font-medium text-gray-600">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((rate) => (
                      <tr key={rate.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">{rate.name}</td>
                        <td className="px-4 py-3 text-gray-600">{rate.category}</td>
                        <td className="px-4 py-3 text-gray-600">₹{rate.minRate}</td>
                        <td className="px-4 py-3 text-gray-600">₹{rate.maxRate}</td>
                        <td className="px-4 py-3 text-gray-600">{rate.unit}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                              rate.status === "active"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {rate.status === "active" ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {rate.updatedAt ? rate.updatedAt.split("T")[0] : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => openEdit(rate)}
                              title="Edit rate"
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openDelete(rate)}
                              title="Delete rate"
                              className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 md:hidden">
                {filtered.map((rate) => (
                  <div
                    key={rate.id}
                    className="space-y-3 rounded-xl border border-gray-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{rate.name}</h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          rate.status === "active"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {rate.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                      <div>
                        <span className="text-gray-400">Category: </span>
                        {rate.category}
                      </div>
                      <div>
                        <span className="text-gray-400">Unit: </span>
                        {rate.unit}
                      </div>
                      <div>
                        <span className="text-gray-400">Min: </span>₹{rate.minRate}
                      </div>
                      <div>
                        <span className="text-gray-400">Max: </span>₹{rate.maxRate}
                      </div>
                      <div>
                        <span className="text-gray-400">Updated: </span>
                        {rate.updatedAt ? rate.updatedAt.split("T")[0] : "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => openEdit(rate)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => openDelete(rate)}
                        className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      <AdminModal open={addOpen} onClose={() => setAddOpen(false)} title="Add Rate">
        {renderForm("add")}
      </AdminModal>

      <AdminModal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Rate">
        {renderForm("edit")}
      </AdminModal>

      <AdminModal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Rate"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete the rate for{" "}
            <span className="font-medium text-gray-900">{selected?.name}</span>{" "}
            ({selected?.category})? This action cannot be undone.
          </p>
          {formError && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              {formError}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setDeleteOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {saving ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}
