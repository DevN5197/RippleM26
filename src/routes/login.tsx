import React, { useState, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Waves,
  LogIn,
  Sparkles,
  ArrowRight,
  Server,
  Database,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Lock,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api/authApi";
import { DATA_MODE, setDataMode, API_BASE_URL } from "@/lib/config";
import { isNetworkError, toApiError } from "@/lib/errors";
import { AuthVisualPanel } from "@/components/auth/auth-visual-panel";
import { cn } from "@/lib/utils";

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
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");

  // Quietly check backend health to inform user and guarantee fail-safe demo mode
  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${API_BASE_URL}/api/health`, {
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (isMounted) {
          if (res.ok) {
            setServerStatus("online");
          } else {
            setServerStatus("offline");
          }
        }
      } catch {
        if (isMounted) {
          setServerStatus("offline");
        }
      }
    };

    void checkHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const session = await authApi.login(email, password);
      toast.success(`Welcome back, ${session.user.fullName}!`);
      void navigate({ to: "/dashboard" });
    } catch (err) {
      const { message } = toApiError(err);
      if (isNetworkError(err)) {
        toast.error(
          `${message ?? "Could not reach the server."} Switched to Offline Demo Mode for seamless evaluation.`,
          { duration: 6000 },
        );
        setDataMode("mock");
      } else {
        toast.error(message || "Failed to sign in. Please verify your credentials.");
      }
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
      // Step 1: Simulated brief sync feel
      await new Promise((resolve) => setTimeout(resolve, 350));
      setDemoProgress("Syncing Supplier & Customer Dependency Loop...");
      await new Promise((resolve) => setTimeout(resolve, 250));

      const session = await authApi.login("owner@rupiclothing.in", "password123");
      toast.success(`Signed in as ${session.user.fullName} (Rupi Clothing)`, {
        description: "Live treasury, cash forecast, and Ripple Simulator loaded.",
      });
      void navigate({ to: "/dashboard" });
    } catch (err) {
      // If live backend is unreachable, gracefully fall back to local mock demo instantly
      if (isNetworkError(err)) {
        toast.info("Live server unreachable — switched to local demo mode for Rupi Clothing.");
        setDataMode("mock");
        const fallbackSession = await authApi.login("owner@rupiclothing.in", "password123");
        toast.success(`Signed in as ${fallbackSession.user.fullName} (Demo Mode)`);
        void navigate({ to: "/dashboard" });
        return;
      }
      toast.error(toApiError(err).message || "Demo login failed");
    } finally {
      setLoading(false);
      setDemoProgress(null);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-background">
      {/* ── Left 55%: Interactive "Live Loop" Visual Storyteller ── */}
      <AuthVisualPanel />

      {/* ── Right 45%: Reactive Sign-In Cockpit ── */}
      <div className="relative flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />

        <div className="w-full max-w-xl space-y-7 my-auto p-8 sm:p-10 rounded-2xl shadow-2xl border border-border/80 bg-card/95 backdrop-blur-md">
          {/* Header Mobile / Right */}
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20 lg:hidden mb-3">
              <Waves className="h-6 w-6 text-primary-foreground" aria-hidden />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Sign In to Your Business
            </h1>
            <p className="mt-1 text-base text-muted-foreground">
              Coordination cockpit for cash flow, suppliers, and customer orders
            </p>
          </div>

          {/* ── 1-Click Instant Demo Login (Prominent & Glowing) ── */}
          <div className="rounded-xl border-2 border-primary/40 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-primary/5 p-5 shadow-md shadow-primary/5 space-y-3">
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
              Instantly launch into <strong>Rupi Clothing</strong> with seeded suppliers, Apex Corp invoice
              delay, and active Ripple Simulator.
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
              <span className="bg-card px-3 text-muted-foreground font-medium">
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
                className="h-12 text-base px-4 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-primary"
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
                className="h-12 text-base px-4 rounded-xl transition-all focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <Button
              type="submit"
              variant="outline"
              className="h-12 w-full text-base font-semibold rounded-xl shadow-xs border-border/80 hover:bg-muted/50"
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

      {/* ── Subtle, Low-Profile Live Connection Status in Bottom-Right Corner ── */}
      <div className="fixed bottom-3 right-3 z-30 flex items-center gap-1.5 rounded-full border border-border/40 bg-background/50 backdrop-blur-md px-2.5 py-1 text-[11px] text-muted-foreground/60 opacity-40 hover:opacity-100 transition-opacity shadow-xs">
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            DATA_MODE === "mock"
              ? "bg-amber-500/80"
              : serverStatus === "online"
                ? "bg-emerald-500 ring-2 ring-emerald-500/20"
                : serverStatus === "checking"
                  ? "bg-blue-500 animate-pulse"
                  : "bg-amber-500/80",
          )}
        />
        <span className="text-[10px]">
          {DATA_MODE === "mock"
            ? "Demo Mode"
            : serverStatus === "online"
              ? "Live API"
              : serverStatus === "checking"
                ? "Checking..."
                : "Offline"}
        </span>
        <button
          type="button"
          onClick={() => {
            const next = DATA_MODE === "api" ? "mock" : "api";
            setDataMode(next);
            toast.info(`Switched to ${next === "api" ? "Live API Mode" : "Offline Demo Mode"}`);
          }}
          className="ml-0.5 text-muted-foreground/40 hover:text-foreground cursor-pointer transition-colors"
          title="Switch API / Demo Mode"
          aria-label="Switch API / Demo Mode"
        >
          <RefreshCw className="h-2.5 w-2.5" />
        </button>
      </div>
    </div>
  );
}
