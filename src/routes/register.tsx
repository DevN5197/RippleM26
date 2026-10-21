import React, { useState, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api/authApi";
import { toApiError } from "@/lib/errors";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register Business — Ripple" },
      { name: "description", content: "Create your Ripple business account." },
    ],
  }),
  component: RegisterPage,
});

/**
 * Validates password strength:
 * - At least 8 characters
 * - Contains both letters and numbers
 * - Not a trivially weak common sequence
 */
function isPasswordStrong(pwd: string): { valid: boolean; message?: string } {
  if (pwd.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long." };
  }
  const hasLetter = /[a-zA-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  if (!hasLetter || !hasNumber) {
    return { valid: false, message: "Password must contain both letters and numbers." };
  }
  const weakPatterns = ["12345678", "password", "password123", "qwerty123", "admin1234", "11111111"];
  if (weakPatterns.includes(pwd.toLowerCase())) {
    return { valid: false, message: "Password is too common or easily guessed." };
  }
  return { valid: true };
}

function RegisterPage() {
  const navigate = useNavigate();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);

  // Registration Fields
  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Real-time password strength hint
  const pwdStrength = isPasswordStrong(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    // 1. Strict validation of all fields before proceeding
    if (!businessName.trim() || businessName.trim().length < 2) {
      toast.error("Please enter a valid business name (minimum 2 characters).");
      return;
    }
    if (!fullName.trim() || fullName.trim().length < 2) {
      toast.error("Please enter your full name (minimum 2 characters).");
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, "");
    if (cleanPhone && !/^\+?[1-9]\d{6,14}$/.test(cleanPhone)) {
      toast.error("Please enter a valid phone number with country code (e.g. +91 98765 43210).");
      return;
    }

    // Password strength enforcement
    const strength = isPasswordStrong(password);
    if (!strength.valid) {
      const errMsg = `Weak password: ${strength.message} Please enter your password again.`;
      setPasswordError(errMsg);
      toast.error("Weak password. Please enter your password again.");
      setPassword("");
      passwordInputRef.current?.focus();
      return;
    }

    setLoading(true);
    try {
      await authApi.register(
        email.trim(),
        password,
        fullName.trim(),
        businessName.trim(),
        cleanPhone || undefined,
      );

      toast.success("Account created successfully! Welcome to Ripple.");
      void navigate({ to: "/dashboard" });
    } catch (err) {
      const { message } = toApiError(err);
      toast.error(message || "Registration failed. Please check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black text-white p-4 sm:p-6 md:p-8">
      {/* ── Smooth White Circular Ambient Blur Orbs ── */}
      <div
        className="absolute rounded-full pointer-events-none w-[560px] h-[560px] -top-24 -left-24 blur-[110px] animate-auth-orb-1"
        style={{
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.09) 0%, rgba(255, 255, 255, 0.03) 42%, transparent 72%)",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none w-[520px] h-[520px] -bottom-24 -right-24 blur-[110px] animate-auth-orb-2"
        style={{
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.025) 42%, transparent 72%)",
        }}
      />

      {/* ── Centered Obsidian Onboarding Card ── */}
      <div className="animate-auth-card backdrop-blur-2xl bg-[#09090b]/90 border border-white/12 shadow-2xl rounded-3xl p-8 sm:p-10 w-full max-w-xl relative z-10 space-y-6">
        {/* Header */}
        <div className="animate-auth-item-1 flex flex-col items-center text-center">
          <Link
            to="/"
            title="Return to Ripple Home"
            className="group flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-black shadow-lg shadow-white/10 mb-4 ring-4 ring-white/10 transition-transform duration-300 hover:scale-105"
          >
            <svg
              className="w-7 h-7 text-black transition-transform duration-300 group-hover:rotate-[-20deg]"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <g transform="rotate(-30 12 12)">
                <circle cx="7.3" cy="3.2" r="1.45" />
                <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
                <circle cx="16.7" cy="20.8" r="1.45" />
              </g>
            </svg>
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
              Create Business Account
            </h1>
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-950/40 text-emerald-400 text-[10px] font-mono">
              INSTANT ACCESS
            </Badge>
          </div>
          <p className="mt-2 text-sm text-[#9a9a9a] max-w-sm">
            Enter your business details to create your account and access live working-capital intelligence.
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleRegister} className="animate-auth-item-3 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="businessName" className="text-sm font-semibold text-white/90">
              Business Name <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="businessName"
              type="text"
              required
              placeholder="e.g. Apex Apparel & Co"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              disabled={loading}
              className="h-12 text-base px-4 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-white/40 bg-white/[0.04] border-white/15 text-white placeholder:text-white/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fullName" className="text-sm font-semibold text-white/90">
              Your Full Name <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="fullName"
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={loading}
              className="h-12 text-base px-4 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-white/40 bg-white/[0.04] border-white/15 text-white placeholder:text-white/30"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-semibold text-white/90">
              Email Address <span className="text-rose-400">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="h-12 text-base px-4 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-white/40 bg-white/[0.04] border-white/15 text-white placeholder:text-white/30"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="phoneNumber" className="text-sm font-semibold text-white/90">
                Phone Number <span className="text-xs text-[#888888] font-normal">(optional)</span>
              </Label>
              <span className="text-xs text-[#888888]">E.164 with country code</span>
            </div>
            <Input
              id="phoneNumber"
              type="tel"
              placeholder="+91 98765 43210"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={loading}
              className="h-12 text-base px-4 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-white/40 bg-white/[0.04] border-white/15 text-white placeholder:text-white/30"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-semibold text-white/90">
                Password <span className="text-rose-400">*</span>
              </Label>
              <span className="text-xs text-[#888888]">Min 8 chars, letters & numbers</span>
            </div>
            <Input
              ref={passwordInputRef}
              id="password"
              type="password"
              autoComplete="new-password"
              required
              placeholder="Enter a strong password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError(null);
              }}
              disabled={loading}
              className={cn(
                "h-12 text-base px-4 rounded-xl transition-all focus-visible:ring-2 bg-white/[0.04] border-white/15 text-white placeholder:text-white/30",
                passwordError
                  ? "border-rose-500 focus-visible:ring-rose-500"
                  : "focus-visible:ring-white/40",
              )}
            />

            {/* Password Error Alert */}
            {passwordError && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium pt-1 animate-in fade-in duration-200">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {/* Live Password Strength Feedback */}
            {password.length > 0 && !passwordError && (
              <div className="flex items-center gap-1.5 text-xs pt-1">
                {pwdStrength.valid ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Strong password
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {pwdStrength.message}
                  </span>
                )}
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="h-12 w-full text-base font-semibold rounded-xl btn-vesper-solid shadow-lg transition-all mt-2 cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Account...
              </span>
            ) : (
              <>
                <span>Create Account</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-[#888888] pt-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Instant access to the Ripple Simulator and Treasury Command Center.</span>
          </div>
        </form>

        {/* Footer Navigation */}
        <div className="animate-auth-item-4 pt-2 text-center text-sm text-[#9a9a9a] border-t border-white/10">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-white hover:underline underline-offset-4 inline-flex items-center gap-1">
            Sign in <ArrowRight className="inline h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
