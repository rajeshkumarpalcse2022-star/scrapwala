"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Copy, Check } from "lucide-react";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminModal from "@/components/admin/AdminModal";

interface Collector {
  id: string;
  name: string;
  email?: string;
  phone: string;
  collectorId?: string;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt?: string;
}

interface CreatedCollector {
  collectorId: string;
  temporaryPassword: string;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${label}`}
      className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" /> Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" /> Copy
        </>
      )}
    </button>
  );
}

export default function AdminCollectorsPage() {
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formMobile, setFormMobile] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState<CreatedCollector | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/collectors", { cache: "no-store" })
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled && json.success && json.data?.collectors) {
          setCollectors(json.data.collectors);
        }
      })
      .catch(() => {
        // ignore; keep list empty
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openModal = () => {
    setFormName("");
    setFormEmail("");
    setFormMobile("");
    setFormError(null);
    setCreated(null);
    setModalOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formName.trim() || !formEmail.trim() || !formMobile.trim()) {
      setFormError("All fields are required.");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/admin/collectors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim(),
          phone: formMobile.trim(),
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setFormError(json.message || "Failed to create collector.");
        setIsCreating(false);
        return;
      }

      setCreated({
        collectorId: json.data?.collector?.collectorId || "",
        temporaryPassword: json.data?.temporaryPassword || "",
      });
      setFormName("");
      setFormEmail("");
      setFormMobile("");
      await fetch("/api/admin/collectors", { cache: "no-store" }).then((r) => r.json());
    } catch {
      setFormError("Network error. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const filtered = collectors.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.collectorId || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Collector Management"
        subtitle="Create and manage scrap collection agents."
        action={
          <button
            type="button"
            onClick={openModal}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Create Collector
          </button>
        }
      />

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email or collector ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
      </div>

      {isLoading ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-500">Loading collectors...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white py-16 text-center">
          <p className="text-sm text-gray-500">No collectors found.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600">Collector ID</th>
                <th className="px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="px-4 py-3 font-medium text-gray-600">Mobile</th>
                <th className="px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 font-medium text-gray-600">First Login</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">
                    {c.collectorId || "—"}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                  <td className="px-4 py-3 text-gray-600">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-gray-600">{c.phone}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {c.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.mustChangePassword
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {c.mustChangePassword ? "Password Setup Required" : "Completed"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={created ? "Collector Created" : "Create Collector"}
      >
        {created ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Share these credentials with the collector. The temporary password is shown
              only once and must be changed on first login.
            </p>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase text-gray-500">Collector ID</p>
                  <p className="font-mono text-sm text-gray-900">{created.collectorId}</p>
                </div>
                <CopyButton value={created.collectorId} label="Collector ID" />
              </div>

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase text-gray-500">
                    Temporary Password
                  </p>
                  <p className="truncate font-mono text-sm text-gray-900">
                    {created.temporaryPassword}
                  </p>
                </div>
                <CopyButton value={created.temporaryPassword} label="Temporary Password" />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4" noValidate>
            <div>
              <label htmlFor="cName" className="mb-1 block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="cName"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Raj Kumar"
              />
            </div>

            <div>
              <label htmlFor="cEmail" className="mb-1 block text-sm font-medium text-gray-700">
                Gmail / Email
              </label>
              <input
                type="email"
                id="cEmail"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="raj@example.com"
              />
            </div>

            <div>
              <label htmlFor="cMobile" className="mb-1 block text-sm font-medium text-gray-700">
                Mobile Number
              </label>
              <input
                type="tel"
                id="cMobile"
                inputMode="numeric"
                value={formMobile}
                onChange={(e) => setFormMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="9876543210"
              />
            </div>

            {formError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{formError}</p>
            )}

            <button
              type="submit"
              disabled={isCreating}
              className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isCreating ? "Creating..." : "Create Collector"}
            </button>
          </form>
        )}
      </AdminModal>
    </div>
  );
}
