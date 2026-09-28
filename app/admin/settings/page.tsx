"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function AdminSettingsPage() {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const body: Record<string, string> = { currentPassword };
      if (email.trim()) body.email = email.trim();
      if (newPassword.trim()) body.newPassword = newPassword.trim();

      if (!body.email && !body.newPassword) {
        setError("Please provide a new email or password.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();

      if (!json.success) {
        setError(json.message || "Failed to update");
        return;
      }

      setSuccess("Credentials updated successfully.");
      setEmail("");
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Admin Settings</h1>

      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">Change Login Credentials</h2>

        <form onSubmit={handleUpdate} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-destructive">{error}</div>
          )}
          {success && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-700">{success}</div>
          )}

          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground">
              New Gmail / Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Leave blank to keep current"
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="currentPassword" className="mb-1.5 block text-sm font-medium text-foreground">
              Current Password<span className="ml-1 text-destructive">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? "text" : "password"}
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary pr-12"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                aria-label={showCurrentPassword ? "Hide password" : "Show password"}
              >
                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="newPassword" className="mb-1.5 block text-sm font-medium text-foreground">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary pr-12"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                aria-label={showNewPassword ? "Hide password" : "Show password"}
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update Credentials"}
          </button>
        </form>
      </div>
    </div>
  );
}
