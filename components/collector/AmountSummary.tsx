interface MaterialItem {
  material: string;
  weight: number;
  ratePerKg: number;
  unit?: string;
}

interface AmountSummaryProps {
  materials: MaterialItem[];
}

export default function AmountSummary({ materials }: AmountSummaryProps) {
  const total = materials.reduce((sum, m) => sum + m.weight * m.ratePerKg, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <h3 className="mb-4 text-sm font-semibold text-foreground">Amount Summary</h3>
      <div className="space-y-3">
        {materials.map((m, index) => (
          <div
            key={`${m.material}-${index}`}
            className="flex items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium text-foreground">
                {m.material || "Material not selected"}
              </span>
              <span className="block text-[10px] text-muted">
                {m.weight} {m.unit ?? "kg"} × ₹{m.ratePerKg}
              </span>
            </div>
            <span className="shrink-0 text-xs font-semibold text-foreground">
              ₹{(m.weight * m.ratePerKg).toFixed(0)}
            </span>
          </div>
        ))}
      </div>
      <div className="my-4 border-t border-border" />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-muted">Estimated Final Value</span>
        <span className="text-lg font-bold text-emerald-600">₹{total.toFixed(0)}</span>
      </div>
    </div>
  );
}
