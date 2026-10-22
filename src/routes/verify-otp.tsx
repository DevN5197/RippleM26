import React, { useState, useEffect, useRef } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Lock,
  Mail,
  Phone,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { authApi } from "@/lib/api/authApi";
import { toApiError } from "@/lib/errors";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VerifyOtpSearchParams {
  email?: string;
  phone?: string;
  channel?: "email" | "phone";
}

export const Route = createFileRoute("/verify-otp")({
  validateSearch: (search: Record<string, unknown>): VerifyOtpSearchParams => ({
    email: typeof search["email"] === "string" ? search["email"] : undefined,
    phone: typeof search["phone"] === "string" ? search["phone"] : undefined,
    channel: search["channel"] === "phone" ? "phone" : "email",
  }),
  head: () => ({
    meta: [
      { title: "Security Verification — Ripple" },
      { name: "description", content: "Verify your email and phone number for Ripple business intelligence." },
    ],
  }),
  component: VerifyOtpPage,
});

function VerifyOtpPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [email] = useState(search.email || "");
  const [phone] = useState(search.phone || "");
  const [channel, setChannel] = useState<"email" | "phone">(search.channel || "email");

  // 6-digit individual box state
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [error, setError] = useState<string | null>(null);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);

  // OTP verification disabled; redirect directly to dashboard
  useEffect(() => {
    void navigate({ to: "/dashboard" });
  }, [navigate]);

  // Handle individual digit change & auto-advance
  const handleDigitChange = (index: number, value: string) => {
    setError(null);
    const cleaned = value.replace(/\D/g, "");

    // If user pasted multi-digit text into an input box
    if (cleaned.length > 1) {
      const newDigits = [...digits];
      for (let i = 0; i < 6 && i < cleaned.length; i++) {
        newDigits[i] = cleaned[i];
      }
      setDigits(newDigits);
      const nextIndex = Math.min(cleaned.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleaned.slice(-1);
    setDigits(newDigits);

    // Auto-advance if digit typed
    if (cleaned && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Keyboard navigation (Backspace, Arrow keys)
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Paste handler
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;

    const newDigits = [...digits];
    for (let i = 0; i < 6 && i < pasteData.length; i++) {
      newDigits[i] = pasteData[i];
    }
    setDigits(newDigits);

    const targetIdx = Math.min(pasteData.length, 5);
    inputRefs.current[targetIdx]?.focus();
  };

  // Submit OTP Verification
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const otpCode = digits.join("");

    if (otpCode.length !== 6 || !/^\d{6}$/.test(otpCode)) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    if (!email) {
      setError("Email address is required for verification.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await authApi.verifyOtp(email, otpCode, channel);
      setVerifiedSuccess(true);
      toast.success("Security verification successful! Redirecting to command center…");

      setTimeout(() => {
        void navigate({ to: "/onboarding" });
      }, 700);
    } catch (err) {
      const apiErr = toApiError(err);
      setError(apiErr.message || "Invalid or expired verification code.");
      toast.error(apiErr.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResend = async () => {
    if (countdown > 0 || resending || !email) return;

    setResending(true);
    setError(null);

    try {
      const res = await authApi.resendOtp(email, channel);
      setCountdown(res.cooldownSeconds || 60);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      toast.success(res.message || "Fresh 6-digit verification code dispatched.");
    } catch (err) {
      const apiErr = toApiError(err);
      setError(apiErr.message || "Could not resend code. Please try again later.");
      toast.error(apiErr.message || "Resend failed.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black text-white p-4 sm:p-6 md:p-8">
      {/* ── Background Subtle Ambient Blur Orbs ── */}
      <div
        className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[350px] rounded-full blur-[140px] pointer-events-none opacity-20"
        style={{
          background: "radial-gradient(ellipse at center, rgba(255,255,255,0.2) 0%, transparent 70%)",
        }}
      />

      {/* ── Command Card ── */}
      <div className="card-rump p-8 sm:p-10 w-full max-w-md relative z-10 border border-white/15 bg-[#09090b] shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/20 shadow-xs mb-3">
            <Lock className="h-6 w-6" />
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Security Verification
            </h1>
            <Badge className="bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
              2FA VERIFICATION
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground max-w-xs mx-auto">
            Enter the 6-digit security code dispatched to verify your account and unlock your liquidity cockpit.
          </p>
        </div>

        {/* Channel Selection Toggle (if phone available) */}
        {phone && (
          <div className="flex items-center rounded-lg border border-white/15 bg-black/60 p-0.5 gap-1 mb-5">
            <button
              type="button"
              onClick={() => {
                setChannel("email");
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${
                channel === "email"
                  ? "bg-white text-black font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <Mail className="h-3.5 w-3.5" />
              <span>Email</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setChannel("phone");
                setError(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-md text-xs font-medium transition-all cursor-pointer ${
                channel === "phone"
                  ? "bg-white text-black font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              <Phone className="h-3.5 w-3.5" />
              <span>WhatsApp</span>
            </button>
          </div>
        )}

        {/* Target Destination Readout */}
        <div className="p-3 rounded-xl bg-black/60 border border-white/10 text-xs font-mono text-center mb-5">
          <span className="text-muted-foreground">Dispatched to: </span>
          <span className="text-white font-semibold">
            {channel === "phone" && phone ? phone : email || "your registered email"}
          </span>
        </div>


        {/* ── 6-Digit Individual Input Boxes ── */}
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex items-center justify-between gap-2 sm:gap-2.5">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                disabled={loading || verifiedSuccess}
                className="w-12 h-14 sm:w-13 sm:h-16 text-center text-xl font-mono font-bold rounded-xl border border-white/20 bg-black/80 text-white focus:border-white focus:ring-2 focus:ring-white/30 outline-none transition-all duration-200 selection:bg-white/30"
              />
            ))}
          </div>

          {/* Error Message Alert */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-xs text-red-300 animate-in fade-in duration-200">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success State */}
          {verifiedSuccess && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-300 font-semibold animate-in fade-in duration-200">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>Verified! Redirecting to command dashboard…</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || verifiedSuccess || digits.join("").length !== 6}
            className="btn-rump-solid w-full py-3.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            {loading ? "Verifying Code…" : "Confirm Verification"}
          </button>
        </form>

        {/* ── Resend & Cooldown Footer ── */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col items-center gap-3 text-xs">
          <div className="text-muted-foreground flex items-center gap-1.5">
            <span>Didn't receive the security code?</span>
            {countdown > 0 ? (
              <span className="font-mono text-white/80 font-medium">
                Resend in {countdown}s
              </span>
            ) : (
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-white hover:underline font-semibold cursor-pointer flex items-center gap-1"
              >
                <RefreshCw className={`h-3 w-3 ${resending ? "animate-spin" : ""}`} />
                <span>Resend Code</span>
              </button>
            )}
          </div>

          <Link
            to="/login"
            className="text-[11px] text-muted-foreground hover:text-white transition-colors mt-1"
          >
            Return to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
