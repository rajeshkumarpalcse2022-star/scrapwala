"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "form" | "otp";

const RESEND_COUNTDOWN = 40;

export default function SignupPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>("form");

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [otp, setOtp] = useState("");
  const [countdown, setCountdown] = useState(0);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const maskEmail = (value: string): string => {
    const trimmed = value.trim().toLowerCase();
    const [local, domain] = trimmed.split("@");
    if (!local || !domain) return trimmed;
    const visible = local.slice(0, 2);
    return `${visible}${"*".repeat(Math.max(4, local.length - visible.length))}@${domain}`;
  };
  const validateForm = (): string | null => {
    if (name.trim().length < 2) return "Please enter your full name.";
    if (!/^[6-9]\d{9}$/.test(phone.trim()))
      return "Please enter a valid 10-digit Indian mobile number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return "Please enter a valid email address.";
    if (password.length < 8) return "Password must be at least 8 characters.";
    if (password !== confirmPassword) return "Passwords do not match.";
    return null;
  };

  const requestOtp = useCallback(
    async (isResend: boolean) => {
      setError(null);
      setInfo(null);

      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsSubmitting(true);

      try {
        const response = await fetch("/api/auth/signup/request-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          setError(result.message || "Unable to send OTP. Please try again.");
          setIsSubmitting(false);
          return;
        }

        setStep("otp");
        setOtp("");
        setCountdown(RESEND_COUNTDOWN);
        // The OTP is only ever delivered via email. It is never displayed here.
        setInfo(
          isResend
            ? `A new OTP has been sent successfully to ${maskEmail(email)}.`
            : `OTP sent successfully to ${maskEmail(email)}. Please check your email.`
        );
      } catch {
        setError("Something went wrong. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [email, name, phone, password, confirmPassword]
  );

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (otp.trim().length !== 6) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim().toLowerCase(),
          password,
          code: otp.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || "Invalid or expired OTP.");
        setIsSubmitting(false);
        return;
      }

      router.push("/login");
    } catch {
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
      <p className="mt-2 text-sm text-muted">
        {step === "form"
          ? "Sign up to schedule doorstep scrap pickups."
          : `Enter the 6-digit OTP sent to ${email.trim().toLowerCase()}.`}
      </p>

      {step === "form" && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            requestOtp(false);
          }}
          className="mt-6 space-y-4"
          noValidate
        >
          <div>
            <label htmlFor="name" className="mb-1 block text-sm font-medium text-foreground">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter your full name"
            />
          </div>

          <div>
            <label htmlFor="phone" className="mb-1 block text-sm font-medium text-foreground">
              Mobile Number
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              maxLength={10}
              autoComplete="tel"
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="10-digit mobile number"
            />
          </div>

          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-foreground">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                placeholder="At least 8 characters"
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

          <div>
            <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-foreground">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary pr-12"
                placeholder="Re-enter your password"
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
            {isSubmitting ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerify} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="otp" className="mb-1 block text-sm font-medium text-foreground">
              Enter OTP
            </label>
            <input
              type="text"
              id="otp"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              maxLength={6}
              autoComplete="one-time-code"
              className="w-full rounded-lg border border-border bg-card px-4 py-2.5 text-center text-lg tracking-[0.5em] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="______"
            />
          </div>

          {info && (
            <p className="rounded-lg bg-primary-light px-3 py-2 text-sm text-primary">
              {info}
            </p>
          )}

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
            {isSubmitting ? "Verifying..." : "Verify & Create Account"}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => {
                setStep("form");
                setError(null);
                setInfo(null);
              }}
              className="text-muted hover:text-foreground"
            >
              Edit details
            </button>

            <button
              type="button"
              onClick={() => requestOtp(true)}
              disabled={countdown > 0 || isSubmitting}
              className={cn(
                "font-medium text-primary hover:underline",
                (countdown > 0 || isSubmitting) && "cursor-not-allowed text-muted no-underline"
              )}
            >
              {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
            </button>
          </div>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}