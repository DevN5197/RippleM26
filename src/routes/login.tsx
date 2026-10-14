import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Waves, LogIn, Sparkles, ArrowRight, Server, Database, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/authApi";
import { DATA_MODE, setDataMode, API_BASE_URL } from "@/lib/config";

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
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      if (err.code === "network_error" || err.status === 0) {
        toast.error(
          `${err.message} You can also click "Switch to Offline Demo Mode" below.`,
          { duration: 6000 }
        );
      } else {
        toast.error(err.message || "Failed to sign in. Please verify your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setEmail("owner@rupiclothing.in");
    setPassword("password123");
    setLoading(true);
    try {
      const session = await authApi.login("owner@rupiclothing.in", "password123");
      toast.success(`Signed in as ${session.user.fullName} (Rupi Clothing)`);
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      // If live backend is unreachable, gracefully fall back to local mock demo
      if (DATA_MODE === "api" && (err.code === "network_error" || err.status === 0)) {
        toast.info("Live backend unreachable — switching to Offline Demo Mode for Rupi Clothing.");
        setDataMode("mock");
        return;
      }
      toast.error(err.message || "Demo login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20">
            <Waves className="h-6 w-6 text-primary-foreground" aria-hidden />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Sign in to Ripple
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Small business cash-flow intelligence & coordination
          </p>
        </div>

        <Card className="border shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Account Credentials</CardTitle>
            <CardDescription>
              Enter your email and password to access your business workspace
            </CardDescription>
          </CardHeader>

          <CardContent>
            {/* Mode Switcher Banner */}
            <div className="mb-4 flex items-center justify-between rounded-lg border border-border/70 bg-muted/40 p-2.5 text-xs">
              <div className="flex items-center gap-2">
                {DATA_MODE === "api" ? (
                  <Server className="h-4 w-4 text-emerald-600" />
                ) : (
                  <Database className="h-4 w-4 text-amber-600" />
                )}
                <div>
                  <span className="font-semibold text-foreground">
                    {DATA_MODE === "api" ? "Live API Mode" : "Offline Demo Mode"}
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    {DATA_MODE === "api" ? API_BASE_URL : "In-memory demo store"}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs font-medium"
                onClick={() => setDataMode(DATA_MODE === "api" ? "mock" : "api")}
              >
                <RefreshCw className="mr-1 h-3 w-3" />
                {DATA_MODE === "api" ? "Use Demo Mode" : "Use Live API"}
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
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
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
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

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or one-click demo</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed hover:border-primary hover:bg-primary/5"
              onClick={handleDemoLogin}
              disabled={loading}
            >
              <Sparkles className="mr-2 h-4 w-4 text-primary" />
              <span>Sign in as Rupi Clothing (Demo Owner)</span>
            </Button>
          </CardContent>

          <CardFooter className="flex justify-center border-t py-4 text-center text-sm text-muted-foreground">
            Don't have an account yet?{" "}
            <Link to="/register" className="ml-1.5 font-medium text-primary hover:underline">
              Create business account <ArrowRight className="inline h-3.5 w-3.5" />
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
