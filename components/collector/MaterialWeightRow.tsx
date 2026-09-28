"use client";

import { AlertCircle, Trash2 } from "lucide-react";

interface MaterialOption {
  id: string;
  name: string;
  unit: string;
  minRate: number | null;
  maxRate: number | null;
}

interface MaterialWeightRowProps {
  category: string;
  material: string;
  weight: number;
  unit: string;
  ratePerKg: number;
  availableMaterials: MaterialOption[];
  error?: string | null;
  onUpdate: (data: {
    category: string;
    material: string;
    weight: number;
    ratePerKg: number;
    unit: string;
  }) => void;
  onRemove: () => void;
}

export default function MaterialWeightRow({
  category,
  material,
  weight,
  unit,
  ratePerKg,
  availableMaterials,
  error,
  onUpdate,
  onRemove,
}: MaterialWeightRowProps) {
  const amount = weight * ratePerKg;
  const selected = availableMaterials.find((m) => m.id === category);

  return (
    <div
      className={`flex flex-wrap items-end gap-3 rounded-xl border p-3 ${
        error ? "border-red-300 bg-red-50/40" : "border-border bg-muted-light/50"
      }`}
    >
      <div className="flex-1 min-w-[140px]">
        <label className="mb-1 block text-[10px] font-medium text-muted">
          Material
        </label>
        <select
          value={category}
          onChange={(e) => {
            const next = availableMaterials.find((m) => m.id === e.target.value);
            onUpdate({
              category: next?.id ?? e.target.value,
              material: next?.name ?? "",
              weight,
              ratePerKg: next?.minRate ?? ratePerKg,
              unit: next?.unit ?? unit,
            });
          }}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-primary"
        >
          <option value="" disabled>
            Select material
          </option>
          {availableMaterials.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>
      <div className="w-24 min-w-[80px]">
        <label className="mb-1 block text-[10px] font-medium text-muted">
          Weight ({unit})
        </label>
        <input
          type="number"
          min={0}
          step={0.1}
          value={weight}
          onChange={(e) =>
            onUpdate({
              category,
              material,
              weight: parseFloat(e.target.value) || 0,
              ratePerKg,
              unit,
            })
          }
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-primary"
        />
      </div>
      <div className="w-24 min-w-[84px]">
        <label className="mb-1 block text-[10px] font-medium text-muted">
          Rate (₹/{unit})
        </label>
        <input
          type="number"
          min={0}
          step={0.5}
          value={ratePerKg}
          onChange={(e) =>
            onUpdate({
              category,
              material,
              weight,
              ratePerKg: parseFloat(e.target.value) || 0,
              unit,
            })
          }
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground outline-none focus:border-primary"
        />
        {selected && selected.minRate !== null && selected.maxRate !== null && (
          <p className="mt-1 text-[10px] text-muted">
            ₹{selected.minRate}–₹{selected.maxRate}
          </p>
        )}
      </div>
      <div className="w-28 min-w-[100px]">
        <label className="mb-1 block text-[10px] font-medium text-muted">
          Amount
        </label>
        <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-emerald-600">
          ₹{amount.toFixed(0)}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove material"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-500 transition-colors hover:bg-red-100"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      {error && (
        <p className="flex w-full items-start gap-1.5 text-[11px] font-medium text-red-600">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}
