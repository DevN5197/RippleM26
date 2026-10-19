import React, { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Waves,
  LogIn,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api/authApi";
import { toApiError } from "@/lib/errors";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign In — Ripple" },
      { name: "description", content: "Sign in to your Ripple account." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [demoProgress, setDemoProgress] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const session = await authApi.login(email, password);
      localStorage.setItem("access_token", session.token);
      toast.success(`Welcome back, ${session.user.fullName}!`);
      void navigate({ to: "/dashboard" });
    } catch (err) {
      const { message } = toApiError(err);
      toast.error(message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleInstantDemoLogin = async () => {
    setEmail("owner@rupiclothing.in");
    setPassword("password123");
    setLoading(true);
    setDemoProgress("Connecting to Rupi Clothing Treasury...");

    try {
      const session = await authApi.login("owner@rupiclothing.in", "password123");
      localStorage.setItem("access_token", session.token);
      toast.success(`Signed in as ${session.user.fullName} (Rupi Clothing)`, {
        description: "Live treasury, cash forecast, and Ripple Simulator loaded.",
      });
      void navigate({ to: "/dashboard" });
    } catch (err) {
      toast.error(toApiError(err).message || "Demo login failed");
    } finally {
      setLoading(false);
      setDemoProgress(null);
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

      {/* ── Centered Obsidian Authentication Card ── */}
      <div className="animate-auth-card backdrop-blur-2xl bg-[#09090b]/90 border border-white/12 shadow-2xl rounded-3xl p-8 sm:p-10 w-full max-w-lg relative z-10 space-y-6">
        {/* Header */}
        <div className="animate-auth-item-1 flex flex-col items-center text-center">
          <Link
            to="/"
            title="Return to Rump Home"
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
          <h1 className="text-3xl font-semibold tracking-tight text-white">
            Sign In to Rump
          </h1>
          <p className="mt-2 text-sm text-[#9a9a9a] max-w-sm">
            Operational liquidity defense &amp; Ripple Simulator workspace
          </p>
        </div>

        {/* ── 1-Click Instant Demo Login (Prominent & Clean) ── */}
        <div className="animate-auth-item-2 rounded-2xl border border-white/15 bg-white/[0.03] p-4 sm:p-5 space-y-3 transition-all hover:border-white/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Sparkles className="h-4 w-4" />
              <span>Presentation &amp; Evaluation Mode</span>
            </div>
            <Badge variant="outline" className="border-white/20 bg-white/10 text-white text-[10px] font-mono">
              1-CLICK DEMO
            </Badge>
          </div>
          <p className="text-xs text-[#9a9a9a] leading-relaxed">
            Instantly launch into <strong>Rupi Clothing</strong> with live treasury, cash forecast, and Ripple Simulator loaded.
          </p>
          <Button
            type="button"
            onClick={handleInstantDemoLogin}
            disabled={loading}
            className="w-full h-12 text-base font-semibold rounded-xl btn-vesper-solid shadow-lg transition-all"
          >
            {demoProgress ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                <span className="truncate">{demoProgress}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-black" />
                <span>Instant Demo Sign-In (Rupi Clothing)</span>
                <ArrowRight className="h-4 w-4 ml-auto text-black" />
              </div>
            )}
          </Button>
        </div>

        {/* Divider */}
        <div className="animate-auth-item-3 relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#09090b] px-3 text-[#888888] font-medium rounded-full">
              Or sign in with email
            </span>
          </div>
        </div>

        {/* Standard Sign-In Form */}
        <form onSubmit={handleSubmit} className="animate-auth-item-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-white/90">
              Email address
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-semibold text-white/90">
                Password
              </Label>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="h-12 text-base px-4 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-white/40 bg-white/[0.04] border-white/15 text-white placeholder:text-white/30"
            />
          </div>

          <Button
            type="submit"
            className="h-12 w-full text-base font-semibold rounded-xl border border-white/20 bg-white/[0.06] hover:bg-white/[0.12] hover:border-white/40 text-white transition-all shadow-sm"
            disabled={loading}
          >
            {loading && !demoProgress ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Signing in...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                <span>Sign In</span>
              </div>
            )}
          </Button>
        </form>

        {/* Footer Navigation */}
        <div className="animate-auth-item-5 pt-2 text-center text-sm text-[#9a9a9a] border-t border-white/10">
          Don't have an account yet?{" "}
          <Link to="/register" className="font-semibold text-white hover:underline underline-offset-4 inline-flex items-center gap-1">
            Create business account <ArrowRight className="inline h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
