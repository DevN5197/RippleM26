import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Waves, UserPlus, ArrowLeft, Server, Database, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { authApi } from "@/lib/api/authApi";
import { DATA_MODE, setDataMode, API_BASE_URL } from "@/lib/config";

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
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      if (err.code === "network_error" || err.status === 0) {
        toast.error(
          `${err.message} You can also click "Switch to Offline Demo Mode" below to test without the backend.`,
          { duration: 6000 }
        );
      } else {
        toast.error(err.message || "Registration failed. Please try again.");
      }
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
            Get Started with Ripple
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Set up cash-flow intelligence for your business
          </p>
        </div>

        <Card className="border shadow-lg">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Create New Business</CardTitle>
            <CardDescription>
              Enter your business and owner profile details to begin
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
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  type="text"
                  required
                  placeholder="e.g. Apex Apparel & Co"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Your Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>

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
                <Label htmlFor="password">Password (min. 6 characters)</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full mt-2" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    <span>Creating workspace...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    <span>Register Business Account</span>
                  </div>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center border-t py-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="ml-1.5 font-medium text-primary hover:underline">
              <ArrowLeft className="inline h-3.5 w-3.5" /> Sign in instead
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
