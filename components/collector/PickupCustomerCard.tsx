import { User, Phone } from "lucide-react";

interface PickupCustomerCardProps {
  customerName: string;
  customerPhone?: string;
}

export default function PickupCustomerCard({
  customerName,
  customerPhone,
}: PickupCustomerCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{customerName}</p>
          {customerPhone && (
            <p className="text-xs text-muted">{customerPhone}</p>
          )}
        </div>
      </div>
      <a
        href={customerPhone ? `tel:${customerPhone}` : undefined}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-colors ${
          customerPhone
            ? "bg-emerald-500 text-white hover:bg-emerald-600"
            : "bg-muted-light text-muted cursor-not-allowed"
        }`}
        aria-disabled={!customerPhone}
        tabIndex={customerPhone ? 0 : -1}
      >
        <Phone className="h-4 w-4" />
        Call Customer
      </a>
    </div>
  );
}
