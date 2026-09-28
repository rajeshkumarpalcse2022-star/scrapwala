"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

const OTP_RESEND_SECONDS = 40;

type Step = "credentials" | "otp" | "password";

export default function LoginPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("credentials");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Collector first-login state
  const [collectorUserId, setCollectorUserId] = useState<string | null>(null);
  const [collectorEmail, setCollectorEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [verifiedCode, setVerifiedCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCountdown = useCallback(() => {
    setCountdown(OTP_RESEND_SECONDS);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownRef.current) clearInterval(countdownRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const requestCollectorOtp = useCallback(
    async (email: string) => {
      setIsSendingOtp(true);
      try {
        const res = await fetch("/api/auth/otp/request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, purpose: "collector_first_login" }),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.message || "Unable to send OTP. Please try again.");
          return false;
        }
        startCountdown();
        return true;
      } catch {
        setError("Network error. Please try again.");
        return false;
      } finally {
        setIsSendingOtp(false);
      }
    },
    [startCountdown]
  );

  const handleCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim() || !password) {
      setError("Please enter your Gmail / ID and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || "Invalid credentials. Please try again.");
        setIsSubmitting(false);
        return;
      }

      const data = result.data ?? {};

      // Collector first login → OTP verification → set password.
      if (data.requiresPasswordChange) {
        setCollectorUserId(data.userId);
        setCollectorEmail(data.email || identifier.trim().toLowerCase());
        setStep("otp");
        setIsSubmitting(false);
        await requestCollectorOtp(data.email || identifier.trim().toLowerCase());
        return;
      }

      // All roles land on the public Home page after login. Role dashboards
      // stay reachable through the avatar dropdown in the navbar.
      router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.trim().length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/collector/first-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: collectorEmail,
          code: otp.trim(),
          purpose: "collector_first_login",
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Invalid or expired OTP.");
        setIsSubmitting(false);
        return;
      }

      // Use the userId returned from the first-login API (from the OTP record)
      // to ensure consistency with the user that was verified
      if (json.data?.userId) {
        setCollectorUserId(json.data.userId);
      }
      setVerifiedCode(otp.trim());
      setStep("password");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!collectorUserId) {
      setError("Session expired. Please log in again.");
      setStep("credentials");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/collector/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: collectorUserId,
          code: verifiedCode,
          newPassword,
          confirmPassword,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.message || "Unable to set password. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Collector first-login flow completed → same Home destination.
      router.push("/");
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (step === "otp") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-foreground">Verify your email</h1>
        <p className="mt-2 text-sm text-muted">
          We sent a 6-digit OTP to <span className="font-medium">{collectorEmail}</span>.
          It expires in 40 seconds.
        </p>

        <form onSubmit={handleVerifyOtp} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="otp" className="mb-1 block text-sm font-medium text-foreground">
              Enter OTP
            </label>
            <input
              id="otp"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-center text-lg tracking-[0.4em] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              isSubmitting && "cursor-not-allowed opacity-70"
            )}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Verifying..." : "Verify OTP"}
          </button>

          <button
            type="button"
            disabled={countdown > 0 || isSendingOtp}
            onClick={() => requestCollectorOtp(collectorEmail)}
            className={cn(
              "w-full rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted-light",
              (countdown > 0 || isSendingOtp) && "cursor-not-allowed opacity-60"
            )}
          >
            {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
          </button>
        </form>
      </div>
    );
  }

  if (step === "password") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-foreground">Set a new password</h1>
        <p className="mt-2 text-sm text-muted">
          Your temporary password can no longer be used. Choose a new password to continue.
        </p>

        <form onSubmit={handleSetPassword} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="newPassword" className="mb-1 block text-sm font-medium text-foreground">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                placeholder="At least 8 characters"
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

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-foreground">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                placeholder="Re-enter your new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-destructive">{error}</p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={cn(
              "flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
              isSubmitting && "cursor-not-allowed opacity-70"
            )}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSubmitting ? "Saving..." : "Set Password & Continue"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
      <p className="mt-2 text-sm text-muted">
        Log in to schedule and manage your scrap pickups.
      </p>

      <form onSubmit={handleCredentials} className="mt-6 space-y-4" noValidate>
        <div>
          <label
            htmlFor="identifier"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Gmail / ID
          </label>
          <input
            type="text"
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Gmail / ID"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1 block text-sm font-medium text-foreground"
          >
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary pr-12"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
            isSubmitting && "cursor-not-allowed opacity-70"
          )}
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        New to ScrapWala?{" "}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}