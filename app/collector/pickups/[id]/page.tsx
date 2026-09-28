"use client";

import { use, useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Navigation,
  Package,
  FileText,
  CheckCircle,
  Clock,
  Save,
  AlertCircle,
} from "lucide-react";
import PickupProgress from "@/components/collector/PickupProgress";
import PickupAddressCard from "@/components/collector/PickupAddressCard";
import PickupCustomerCard from "@/components/collector/PickupCustomerCard";
import MaterialWeightRow from "@/components/collector/MaterialWeightRow";
import AmountSummary from "@/components/collector/AmountSummary";
import { reportPickupSeen } from "@/hooks/useUnseenPickupCount";

type PickupStatus =
  | "assigned"
  | "accepted"
  | "on_the_way"
  | "arrived"
  | "weighing"
  | "payment_pending"
  | "completed"
  | "cancelled";

interface MaterialEntry {
  id: string;
  category: string;
  categoryName: string;
  material: string;
  weight: number;
  unit: string;
  ratePerKg: number;
  error?: string | null;
}

interface MaterialOption {
  id: string;
  name: string;
  unit: string;
  minRate: number | null;
  maxRate: number | null;
}

interface PickupItem {
  category: string;
  categoryName: string;
  estimatedWeight: number;
  unit: string;
  amount: number;
  actualWeight?: number;
  rate?: number;
}

interface PickupData {
  _id: string;
  pickupId: string;
  customer: { _id: string; name: string; phone: string; email?: string };
  address: {
    fullName: string;
    phone: string;
    houseFlatBuilding: string;
    streetArea: string;
    city: string;
    state: string;
    pinCode: string;
  };
  scheduledDate: string;
  timeSlot: { startTime: string; endTime: string };
  status: string;
  items: PickupItem[];
  estimatedAmount: number;
  actualAmount?: number;
  notes?: string;
}

const STATUS_LABELS: Record<string, string> = {
  assigned: "Assigned",
  accepted: "Accepted",
  on_the_way: "On the Way",
  arrived: "Arrived",
  weighing: "Weighing",
  payment_pending: "Payment Integration Pending",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  assigned: "bg-blue-100 text-blue-700",
  accepted: "bg-yellow-100 text-yellow-700",
  on_the_way: "bg-indigo-100 text-indigo-700",
  arrived: "bg-orange-100 text-orange-700",
  weighing: "bg-purple-100 text-purple-700",
  payment_pending: "bg-amber-100 text-amber-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
};

export default function PickupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [pickup, setPickup] = useState<PickupData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [savingWeighing, setSavingWeighing] = useState(false);

  const [currentStatus, setCurrentStatus] = useState<PickupStatus>("assigned");
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<MaterialOption[]>([]);
  const [weighingError, setWeighingError] = useState<string | null>(null);
  const [weighingSuccess, setWeighingSuccess] = useState(false);

  // Always-current copy of the admin catalog for use inside callbacks.
  const catalogRef = useRef<MaterialOption[]>([]);

  function applyCatalogDefaults(
    entries: MaterialEntry[],
    options: MaterialOption[]
  ): MaterialEntry[] {
    return entries.map((entry) => {
      const option = options.find((o) => o.id === entry.category);
      if (!option) return entry;
      return {
        ...entry,
        material: option.name,
        categoryName: option.name,
        unit: option.unit,
        ratePerKg:
          entry.ratePerKg > 0 ? entry.ratePerKg : (option.minRate ?? entry.ratePerKg),
      };
    });
  }

  useEffect(() => {
    let cancelled = false;

    async function fetchCatalog() {
      try {
        const catsRes = await fetch("/api/categories");
        const catsData = await catsRes.json();
        const parents: { id: string; name: string }[] = catsData?.data?.categories ?? [];

        const options: MaterialOption[] = [];
        await Promise.all(
          parents.map(async (parent) => {
            try {
              const subRes = await fetch(`/api/categories/${parent.id}/subcategories`);
              const subData = await subRes.json();
              const subs: { id: string; name: string }[] =
                subData?.data?.subcategories ?? [];
              subs.forEach((sub) => {
                options.push({
                  id: sub.id,
                  name: sub.name,
                  unit: "kg",
                  minRate: null,
                  maxRate: null,
                });
              });
            } catch {
              // A single failed parent fetch should not break the dropdown.
            }
          })
        );

        try {
          const ratesRes = await fetch("/api/rates");
          const ratesData = await ratesRes.json();
          const rates: {
            subcategoryId: string;
            minRate: number;
            maxRate: number;
            unit: string;
          }[] = ratesData?.data?.rates ?? [];
          rates.forEach((rate) => {
            const option = options.find((o) => o.id === rate.subcategoryId);
            if (option) {
              option.minRate = rate.minRate;
              option.maxRate = rate.maxRate;
              option.unit = rate.unit || "kg";
            }
          });
        } catch {
          // Rates are optional for display; the server enforces them on save.
        }

        options.sort((a, b) => a.name.localeCompare(b.name));

        if (!cancelled) {
          catalogRef.current = options;
          setAvailableMaterials(options);
          setMaterials((prev) => applyCatalogDefaults(prev, options));
        }
      } catch {
        // Leave the catalog empty; the server still validates every save.
      }
    }

    fetchCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchPickup() {
      try {
        const res = await fetch(`/api/collector/pickups/${id}`);
        const data = await res.json();

        if (!cancelled) {
          if (data.success) {
            setPickup(data.data.pickup);
            setCurrentStatus(data.data.pickup.status as PickupStatus);
            initializeMaterials(data.data.pickup);
            // Actually opened this pickup's detail: clear its unseen state.
            reportPickupSeen("collector", id);
          } else {
            setError(data.message || "Pickup not found");
          }
        }
      } catch {
        if (!cancelled) {
          setError("Failed to load pickup");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPickup();

    return () => {
      cancelled = true;
    };
  }, [id]);

  function initializeMaterials(pickupData: PickupData) {
    const materialEntries: MaterialEntry[] = pickupData.items.map((item, index) => ({
      id: `m${index}`,
      category: item.category,
      categoryName: item.categoryName,
      material: item.categoryName,
      weight: item.actualWeight ?? 0,
      unit: item.unit ?? "kg",
      ratePerKg: item.rate ?? 0,
      error: null,
    }));

    setMaterials(applyCatalogDefaults(materialEntries, catalogRef.current));
  }

  const handleStatusAdvance = async () => {
    const statusFlow: PickupStatus[] = [
      "assigned",
      "accepted",
      "on_the_way",
      "arrived",
      "weighing",
      "payment_pending",
    ];
    const currentIdx = statusFlow.indexOf(currentStatus);
    if (currentIdx < statusFlow.length - 1) {
      const nextStatus = statusFlow[currentIdx + 1];
      await updateStatus(nextStatus);
    }
  };

  const updateStatus = async (newStatus: PickupStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/collector/pickups/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (data.success) {
        setCurrentStatus(newStatus);
        if (data.data.pickup) {
          setPickup(data.data.pickup);
          if (newStatus === "weighing") {
            initializeMaterials(data.data.pickup);
          }
        }
      } else {
        alert(data.message || "Failed to update status");
      }
    } catch {
      alert("Failed to update status");
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateMaterial = (
    index: number,
    data: {
      category: string;
      material: string;
      weight: number;
      ratePerKg: number;
      unit: string;
    }
  ) => {
    setMaterials((prev) =>
      prev.map((m, i) =>
        i === index
          ? {
              ...m,
              category: data.category,
              categoryName: data.material,
              material: data.material,
              weight: data.weight,
              ratePerKg: data.ratePerKg,
              unit: data.unit,
              error: null,
            }
          : m
      )
    );
    setWeighingError(null);
    setWeighingSuccess(false);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials((prev) => prev.filter((_, i) => i !== index));
  };

  function validateMaterials(): MaterialEntry[] {
    return materials.map((m) => {
      const option = catalogRef.current.find((o) => o.id === m.category);

      if (!m.material.trim()) {
        return { ...m, error: "Please select a material" };
      }
      if (!Number.isFinite(m.weight) || m.weight <= 0) {
        return {
          ...m,
          error: `Weight for "${m.material}" must be greater than 0`,
        };
      }
      if (!Number.isFinite(m.ratePerKg) || m.ratePerKg < 0) {
        return {
          ...m,
          error: `The entered rate for ${m.material} is invalid`,
        };
      }
      if (option && option.minRate !== null && m.ratePerKg < option.minRate) {
        return {
          ...m,
          error: `The entered rate for ${m.material} is below the minimum allowed rate of ₹${option.minRate}/${option.unit}.`,
        };
      }
      if (option && option.maxRate !== null && m.ratePerKg > option.maxRate) {
        return {
          ...m,
          error: `The entered rate for ${m.material} is above the maximum allowed rate of ₹${option.maxRate}/${option.unit}.`,
        };
      }
      return { ...m, error: null };
    });
  }

  const handleSaveWeighing = async () => {
    if (materials.length === 0) {
      setWeighingError("Please add at least one material with weight");
      setWeighingSuccess(false);
      return;
    }

    const rows = validateMaterials();
    if (rows.some((r) => r.error)) {
      setMaterials(rows);
      setWeighingError("Please fix the errors below");
      setWeighingSuccess(false);
      return;
    }

    setMaterials(rows);
    setSavingWeighing(true);
    setWeighingError(null);
    setWeighingSuccess(false);

    try {
      const res = await fetch(`/api/collector/pickups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: materials.map((m) => ({
            category: m.category,
            categoryName: m.material,
            actualWeight: m.weight,
            rate: m.ratePerKg,
            unit: m.unit,
          })),
        }),
      });

      const data = await res.json();

      if (data.success) {
        setWeighingSuccess(true);
        setPickup(data.data.pickup);
        initializeMaterials(data.data.pickup);
        setTimeout(() => setWeighingSuccess(false), 3000);
      } else {
        const message = data.message || "Failed to save weighing";
        setWeighingError(message);
        const matchingRows = materials.filter(
          (m) =>
            m.material &&
            (message.includes(`for ${m.material} `) ||
              message.includes(`"${m.material}"`))
        );
        if (matchingRows.length === 1) {
          const target = matchingRows[0];
          setMaterials((prev) =>
            prev.map((m) => (m.id === target.id ? { ...m, error: message } : m))
          );
        }
      }
    } catch {
      setWeighingError("Failed to save weighing. Please try again.");
    } finally {
      setSavingWeighing(false);
    }
  };

  const handleProceedToPayment = () => {
    const rows = validateMaterials();
    if (rows.some((r) => r.error)) {
      setMaterials(rows);
      setWeighingError("Please fix the errors below before proceeding");
      setWeighingSuccess(false);
      return;
    }
    handleStatusAdvance();
  };

  const finalAmount = materials.reduce((sum, m) => sum + m.weight * m.ratePerKg, 0);

  const weighingReady =
    materials.length > 0 &&
    materials.every(
      (m) =>
        m.material &&
        m.category &&
        Number.isFinite(m.weight) &&
        m.weight > 0 &&
        Number.isFinite(m.ratePerKg) &&
        m.ratePerKg > 0
    );

  const getActionButton = () => {
    switch (currentStatus) {
      case "assigned":
        return (
          <button
            type="button"
            onClick={handleStatusAdvance}
            disabled={updating}
            className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-600 min-h-11 disabled:opacity-50"
          >
            {updating ? "Updating..." : "Accept Pickup"}
          </button>
        );
      case "accepted":
        return (
          <button
            type="button"
            onClick={handleStatusAdvance}
            disabled={updating}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 min-h-11 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Navigation className="h-4 w-4" />
            {updating ? "Updating..." : "Start Navigation"}
          </button>
        );
      case "on_the_way":
        return (
          <button
            type="button"
            onClick={handleStatusAdvance}
            disabled={updating}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 min-h-11 disabled:opacity-50"
          >
            {updating ? "Updating..." : "Mark Arrived"}
          </button>
        );
      case "arrived":
        return (
          <button
            type="button"
            onClick={handleStatusAdvance}
            disabled={updating}
            className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 min-h-11 disabled:opacity-50"
          >
            {updating ? "Updating..." : "Start Weighing"}
          </button>
        );
      case "weighing":
        return (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleSaveWeighing}
              disabled={savingWeighing || updating}
              className="flex-1 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 min-h-11 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              {savingWeighing ? "Saving..." : "Save Weighing"}
            </button>
            <button
              type="button"
              onClick={handleProceedToPayment}
              disabled={savingWeighing || updating || !weighingReady}
              className="w-64 rounded-xl bg-primary py-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 min-h-11 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? "Updating..." : "Proceed to Payment"}
            </button>
          </div>
        );
      case "payment_pending":
        return (
          <div className="w-full rounded-xl bg-amber-100 border border-amber-200 py-3 px-4 min-h-11">
            <div className="flex items-center gap-2 text-amber-800 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span className="font-medium">Payment Integration Pending</span>
            </div>
            <p className="mt-1 text-xs text-amber-700">
              Final amount calculated. Waiting for payment integration.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-muted">Loading pickup details...</p>
      </div>
    );
  }

  if (error || !pickup) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4">
        <Package className="h-16 w-16 text-muted" />
        <h1 className="text-xl font-bold text-foreground">Pickup not found</h1>
        <p className="text-sm text-muted">
          {error || "The pickup you&apos;re looking for doesn&apos;t exist."}
        </p>
        <button
          type="button"
          onClick={() => router.push("/collector/pickups")}
          className="mt-2 flex items-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pickups
        </button>
      </div>
    );
  }

  const categories = pickup.items.map((item) => item.categoryName);
  const totalWeight = pickup.items.reduce((sum, item) => sum + item.estimatedWeight, 0);

  // Catalog options + any stale pickup items that are no longer in the catalog,
  // so saved rows always render their material in the select.
  const selectOptions: MaterialOption[] = (() => {
    const map = new Map<string, MaterialOption>();
    availableMaterials.forEach((o) => map.set(o.id, o));
    materials.forEach((m) => {
      if (m.category && !map.has(m.category)) {
        map.set(m.category, {
          id: m.category,
          name: m.material,
          unit: m.unit,
          minRate: null,
          maxRate: null,
        });
      }
    });
    return Array.from(map.values());
  })();

  return (
    <div className="pb-24 lg:pb-8">
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <button
          type="button"
          onClick={() => router.push("/collector/pickups")}
          className="mb-4 flex items-center gap-2 text-sm font-medium text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Pickups
        </button>

        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              {pickup.pickupId}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {pickup.customer?.name ?? "Unknown"}
            </p>
          </div>
          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[currentStatus]}`}
          >
            {STATUS_LABELS[currentStatus]}
          </span>
        </div>

        <div className="mb-6">
          <PickupProgress currentStatus={currentStatus} />
        </div>

        {currentStatus === "completed" && (
          <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-800">
                  Pickup Completed
                </h3>
                <p className="text-xs text-emerald-600">
                  Final Amount: ₹{(pickup.actualAmount ?? finalAmount).toFixed(0)}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <PickupCustomerCard
              customerName={pickup.customer?.name ?? "Unknown"}
              customerPhone={pickup.customer?.phone ?? ""}
            />
            <PickupAddressCard
              address={`${pickup.address.houseFlatBuilding}, ${pickup.address.streetArea}`}
              city={pickup.address.city}
            />
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="mb-4 text-sm font-semibold text-foreground">
                Pickup Details
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted" />
                  <div>
                    <p className="text-xs text-muted">Scheduled Time</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(pickup.scheduledDate).toLocaleDateString("en-IN")} at {pickup.timeSlot.startTime} - {pickup.timeSlot.endTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Package className="h-4 w-4 mt-0.5 text-muted" />
                  <div>
                    <p className="text-xs text-muted">Categories</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {categories.map((cat) => (
                        <span
                          key={cat}
                          className="rounded-full bg-muted-light px-2.5 py-0.5 text-[11px] font-medium text-foreground"
                        >
                          {cat}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted" />
                  <div>
                    <p className="text-xs text-muted">Estimated Quantity</p>
                    <p className="text-sm font-medium text-foreground">
                      {totalWeight > 0 ? `${totalWeight} kg` : `${pickup.items.length} item(s)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted" />
                  <div>
                    <p className="text-xs text-muted">Estimated Value</p>
                    <p className="text-sm font-medium text-foreground">
                      ₹{pickup.estimatedAmount.toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
                {pickup.notes && (
                  <div className="flex items-start gap-3">
                    <FileText className="h-4 w-4 mt-0.5 text-muted" />
                    <div>
                      <p className="text-xs text-muted">Notes</p>
                      <p className="text-sm text-foreground">
                        {pickup.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {(currentStatus === "weighing" ||
              currentStatus === "payment_pending" ||
              currentStatus === "completed") && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">
                    Record Scrap Weight
                  </h3>
                  {currentStatus === "weighing" && (
                    <div className="flex items-center gap-2">
                      {weighingSuccess && (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Saved
                        </span>
                      )}
                      {weighingError && (
                        <span className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                          <AlertCircle className="h-3.5 w-3.5" />
                          {weighingError}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-3">
                  {materials.map((m, index) => (
                    <MaterialWeightRow
                      key={m.id}
                      category={m.category}
                      material={m.material}
                      weight={m.weight}
                      unit={m.unit}
                      ratePerKg={m.ratePerKg}
                      availableMaterials={selectOptions}
                      error={m.error}
                      onUpdate={(data) => handleUpdateMaterial(index, data)}
                      onRemove={() => handleRemoveMaterial(index)}
                    />
                  ))}
                </div>
                {currentStatus !== "completed" && (
                  <button
                    type="button"
                    onClick={() => {
                      setMaterials((prev) => [
                        ...prev,
                        {
                          id: `m${Date.now()}`,
                          category: "",
                          categoryName: "",
                          material: "",
                          weight: 0,
                          unit: "kg",
                          ratePerKg: 0,
                          error: null,
                        },
                      ]);
                      setWeighingError(null);
                      setWeighingSuccess(false);
                    }}
                    className="mt-3 w-full rounded-xl border-2 border-dashed border-border py-2.5 text-xs font-medium text-muted transition-colors hover:border-primary hover:text-primary min-h-11"
                  >
                    + Add Material
                  </button>
                )}
                {materials.length > 0 && (
                  <div className="mt-4">
                    <AmountSummary
                      materials={materials.map((m) => ({
                        material: m.material || "Material not selected",
                        weight: m.weight,
                        ratePerKg: m.ratePerKg,
                        unit: m.unit,
                      }))}
                    />
                  </div>
                )}
              </div>
            )}

            {currentStatus === "payment_pending" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-amber-800">
                    Payment Integration Pending
                  </h3>
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700">
                    <span className="relative flex h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                    <span className="ml-1.5">Pending</span>
                  </span>
                </div>
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs text-amber-700">Final Amount</span>
                  <span className="text-lg font-bold text-amber-800">
                    ₹{(pickup.actualAmount ?? finalAmount).toFixed(0)}
                  </span>
                </div>
                <div className="rounded-xl bg-white p-4 border border-amber-100">
                  <div className="flex items-center gap-2 text-xs text-amber-700">
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span>
                      Payment integration is not yet available. This pickup will remain in
                      Payment Integration Pending status until the payment system is configured.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {currentStatus !== "completed" && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-white p-4 lg:hidden">
          {getActionButton()}
        </div>
      )}

      <div className="mt-6 hidden lg:block">
        <div className="max-w-7xl mx-auto px-4">
          {currentStatus !== "completed" && (
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.push("/collector/pickups")}
                className="rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted-light min-h-11"
              >
                Back to List
              </button>
              <div className="w-80">{getActionButton()}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}