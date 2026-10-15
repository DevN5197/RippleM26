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
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-background p-4 sm:p-6 md:p-8">
      {/* ── Soft Ambient RGB Blurred Background Circles ── */}
      {/* Blue Circle (Top-Left) */}
      <div className="absolute rounded-full filter blur-[120px] pointer-events-none bg-blue-600/30 w-[450px] h-[450px] -top-24 -left-24 animate-pulse" />
      {/* Green/Emerald Circle (Bottom-Right) */}
      <div className="absolute rounded-full filter blur-[120px] pointer-events-none bg-emerald-500/20 w-[400px] h-[400px] -bottom-24 -right-24" />
      {/* Red/Rose Circle (Center Warmth) */}
      <div className="absolute rounded-full filter blur-[120px] pointer-events-none bg-rose-500/20 w-[350px] h-[350px] top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2" />

      {/* ── Centered Glassmorphic Authentication Card ── */}
      <div className="backdrop-blur-xl bg-card/75 border border-border/60 dark:border-white/10 shadow-2xl rounded-3xl p-8 sm:p-10 w-full max-w-lg relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25 mb-4 ring-4 ring-primary/10">
            <Waves className="h-7 w-7 text-primary-foreground" aria-hidden />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Sign In to Ripple
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-sm">
            Cash-flow coordination cockpit for supply chain & invoice liquidity
          </p>
        </div>

        {/* ── 1-Click Instant Demo Login (Prominent & Clean) ── */}
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5 space-y-3 transition-all hover:border-primary/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
              <Sparkles className="h-4 w-4" />
              <span>Presentation & Evaluation Mode</span>
            </div>
            <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] font-mono">
              1-CLICK DEMO
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Instantly launch into <strong>Rupi Clothing</strong> with live treasury, cash forecast, and Ripple Simulator loaded.
          </p>
          <Button
            type="button"
            onClick={handleInstantDemoLogin}
            disabled={loading}
            className="w-full h-12 text-base font-semibold rounded-xl shadow-md shadow-primary/25 transition-all hover:scale-[1.01]"
          >
            {demoProgress ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                <span className="truncate">{demoProgress}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>Instant Demo Sign-In (Rupi Clothing)</span>
                <ArrowRight className="h-4 w-4 ml-auto" />
              </div>
            )}
          </Button>
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border/80" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card/90 px-3 text-muted-foreground font-medium rounded-full">
              Or sign in with email
            </span>
          </div>
        </div>

        {/* Standard Sign-In Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-semibold text-foreground">
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
              className="h-12 text-base px-4 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-primary bg-background/50"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-semibold text-foreground">
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
              className="h-12 text-base px-4 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-primary bg-background/50"
            />
          </div>

          <Button
            type="submit"
            variant="outline"
            className="h-12 w-full text-base font-semibold rounded-xl shadow-xs border-border/80 hover:bg-muted/50 transition-all"
            disabled={loading}
          >
            {loading && !demoProgress ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
        <div className="pt-2 text-center text-sm text-muted-foreground border-t border-border/60">
          Don't have an account yet?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Create business account <ArrowRight className="inline h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
