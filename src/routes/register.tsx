import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Waves, UserPlus, ArrowLeft, ArrowRight, Server, Database, RefreshCw } from "lucide-react";
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
import { authApi } from "@/lib/api/authApi";
import { DATA_MODE, setDataMode, API_BASE_URL } from "@/lib/config";
import { isNetworkError, toApiError } from "@/lib/errors";
import { AuthVisualPanel } from "@/components/auth/auth-visual-panel";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Register Business — Ripple" },
      { name: "description", content: "Create your Ripple business account." },
    ],
  }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !businessName || !email || !password) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    try {
      const session = await authApi.register(email, password, fullName, businessName);
      toast.success(`Account created! Welcome, ${session.user.fullName}.`);
      void navigate({ to: "/dashboard" });
    } catch (err) {
      const { message } = toApiError(err);
      if (isNetworkError(err)) {
        toast.error(
          `${message ?? "Could not reach the server."} You can also click "Switch to Offline Demo Mode" below to test without the backend.`,
          { duration: 6000 },
        );
      } else {
        toast.error(message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-background">
      {/* ── Left 55%: Interactive "Live Loop" Visual Storyteller ── */}
      <AuthVisualPanel />

      {/* ── Right 45%: Reactive Register Cockpit ── */}
      <div className="relative flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />

        <div className="w-full max-w-md space-y-6 my-auto">
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20 lg:hidden mb-3">
              <Waves className="h-6 w-6 text-primary-foreground" aria-hidden />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Create Business Account
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Set up cash-flow coordination and what-if simulation for your company
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="businessName" className="text-xs font-medium text-foreground">
                Business Name
              </Label>
              <Input
                id="businessName"
                type="text"
                required
                placeholder="e.g. Apex Apparel & Co"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                disabled={loading}
                className="h-10 text-sm transition-all focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fullName" className="text-xs font-medium text-foreground">
                Your Full Name
              </Label>
              <Input
                id="fullName"
                type="text"
                required
                placeholder="e.g. Rahul Sharma"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={loading}
                className="h-10 text-sm transition-all focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-foreground">
                Email Address
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
                className="h-10 text-sm transition-all focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-foreground">
                Password (min 6 characters)
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="h-10 text-sm transition-all focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <Button
              type="submit"
              className="h-11 w-full font-semibold shadow-sm transition-all hover:scale-[1.01]"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  <span>Creating business workspace...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  <span>Create Account & Launch Cockpit</span>
                </div>
              )}
            </Button>
          </form>

          {/* Footer Navigation */}
          <div className="pt-2 text-center text-sm text-muted-foreground border-t border-border/60">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in <ArrowRight className="inline h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
