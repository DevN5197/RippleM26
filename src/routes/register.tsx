import React, { useState, useRef, useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Waves,
  UserPlus,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  IndianRupee,
  Building2,
  Users,
  Truck,
  Wallet,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authApi } from "@/lib/api/authApi";
import { settingsApi } from "@/lib/api/settingsApi";
import { customerApi } from "@/lib/api/customerApi";
import { supplierApi } from "@/lib/api/supplierApi";
import { invoiceApi } from "@/lib/api/invoiceApi";
import { DATA_MODE, setDataMode, API_BASE_URL } from "@/lib/config";
import { isNetworkError, toApiError } from "@/lib/errors";
import { AuthVisualPanel } from "@/components/auth/auth-visual-panel";
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

  // Step state: 1 = Account Info, 2 = Treasury Cash, 3 = Customers & Suppliers
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [serverStatus, setServerStatus] = useState<"checking" | "online" | "offline">("checking");

  // Step 1: Account info
  const [businessName, setBusinessName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Step 2: Treasury cash & reserves
  const [openingCash, setOpeningCash] = useState<string>("50000");
  const [safetyReserve, setSafetyReserve] = useState<string>("10000");

  // Step 3: Initial customer & supplier
  const [customerName, setCustomerName] = useState<string>("Apex Retail Corp");
  const [customerAmount, setCustomerAmount] = useState<string>("35000");
  const [customerTerms, setCustomerTerms] = useState<string>("15");

  const [supplierName, setSupplierName] = useState<string>("Kaveri Fabrics & Mills");
  const [supplierAmount, setSupplierAmount] = useState<string>("20000");
  const [supplierTerms, setSupplierTerms] = useState<string>("15");

  // Quietly check backend health
  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        const res = await fetch(`${API_BASE_URL}/api/health`, { signal: controller.signal });
        clearTimeout(timeout);
        if (isMounted) setServerStatus(res.ok ? "online" : "offline");
      } catch {
        if (isMounted) setServerStatus("offline");
      }
    };
    void checkHealth();
    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time password strength hint
  const pwdStrength = isPasswordStrong(password);

  // ── Step 1 Validation ────────────────────────────────────────────────────────
  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

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

    setStep(2);
  };

  // ── Step 2 Validation (Flexible Pricing, No Restrictions) ───────────────────
  const handleProceedToStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    const cashNum = parseFloat(openingCash);
    const reserveNum = parseFloat(safetyReserve);

    if (isNaN(cashNum) || cashNum < 0) {
      toast.error("Please enter a valid cash balance (₹0 or greater).");
      return;
    }
    if (isNaN(reserveNum) || reserveNum < 0) {
      toast.error("Please enter a valid safety reserve buffer (₹0 or greater).");
      return;
    }

    setStep(3);
  };

  // ── Skip Customer & Supplier Option (Cash & Business Setup Only) ───────────
  const handleSkipCounterparties = async () => {
    setLoading(true);
    try {
      const session = await authApi.register(email.trim(), password, fullName.trim(), businessName.trim());

      const cashNum = parseFloat(openingCash) || 0;
      const reserveNum = parseFloat(safetyReserve) || 0;
      const openingCashPaise = Math.round(cashNum * 100);
      const safetyReservePaise = Math.round(reserveNum * 100);

      try {
        await settingsApi.updateSettings({
          business: {
            openingCashPaise,
            safetyThresholdPaise: safetyReservePaise,
          },
        });
      } catch (err) {
        console.warn("Could not update settings cash reserve:", err);
      }

      toast.success(
        `Business initialized with ₹${cashNum.toLocaleString("en-IN")} cash! Welcome to Ripple, ${session.user.fullName}.`,
      );
      void navigate({ to: "/dashboard" });
    } catch (err) {
      const { message } = toApiError(err);
      if (isNetworkError(err)) {
        toast.error(
          `${message ?? "Could not reach the server."} You can also click "Switch to Offline Demo Mode" to test without the backend.`,
          { duration: 6000 },
        );
      } else {
        toast.error(message || "Registration failed. Please review your details and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3 Final Submission & Full Onboarding ────────────────────────────────
  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();

    const custName = customerName.trim();
    const custAmount = parseFloat(customerAmount);
    const custTerms = Number(customerTerms);

    const suppName = supplierName.trim();
    const suppAmount = parseFloat(supplierAmount);
    const suppTerms = Number(supplierTerms);

    // Customer constraints
    if (!custName || custName.length < 2) {
      toast.error("Customer name must be at least 2 characters.");
      return;
    }
    if (isNaN(custAmount) || custAmount <= 0) {
      toast.error("Customer receivable invoice amount must be greater than ₹0.");
      return;
    }
    if (isNaN(custTerms) || custTerms < 1 || custTerms > 180) {
      toast.error("Customer payment terms must be between 1 and 180 days.");
      return;
    }

    // Supplier constraints
    if (!suppName || suppName.length < 2) {
      toast.error("Supplier name must be at least 2 characters.");
      return;
    }
    if (suppName.toLowerCase() === custName.toLowerCase()) {
      toast.error("Supplier and customer cannot be the same business entity.");
      return;
    }
    if (isNaN(suppAmount) || suppAmount <= 0) {
      toast.error("Supplier payable bill amount must be greater than ₹0.");
      return;
    }
    if (isNaN(suppTerms) || suppTerms < 1 || suppTerms > 180) {
      toast.error("Supplier payment terms must be between 1 and 180 days.");
      return;
    }

    setLoading(true);
    try {
      // 1. Register user & business account
      const session = await authApi.register(email.trim(), password, fullName.trim(), businessName.trim());

      const cashNum = parseFloat(openingCash) || 0;
      const reserveNum = parseFloat(safetyReserve) || 0;
      const openingCashPaise = Math.round(cashNum * 100);
      const safetyReservePaise = Math.round(reserveNum * 100);

      // 2. Set Opening Treasury Cash & Safety Reserve
      try {
        await settingsApi.updateSettings({
          business: {
            openingCashPaise,
            safetyThresholdPaise: safetyReservePaise,
          },
        });
      } catch (err) {
        console.warn("Could not update settings cash reserve:", err);
      }

      // 3. Create First Customer
      const customer = await customerApi.create({
        name: custName,
        creditTermsDays: custTerms,
      });

      // 4. Create Opening Receivable Invoice for this Customer
      const todayStr = new Date().toISOString().slice(0, 10);
      const customerDueDate = new Date(Date.now() + custTerms * 86400000).toISOString().slice(0, 10);
      await invoiceApi.create({
        type: "receivable",
        customerId: customer.id,
        amountPaise: Math.round(custAmount * 100),
        issueDate: todayStr,
        dueDate: customerDueDate,
        notes: "Opening customer receivable order",
      });

      // 5. Create First Supplier
      const supplier = await supplierApi.create({
        name: suppName,
        paymentTermsDays: suppTerms,
        reliabilityScore: 92,
      });

      // 6. Create Opening Payable Bill for this Supplier
      const supplierDueDate = new Date(Date.now() + suppTerms * 86400000).toISOString().slice(0, 10);
      await invoiceApi.create({
        type: "payable",
        supplierId: supplier.id,
        amountPaise: Math.round(suppAmount * 100),
        issueDate: todayStr,
        dueDate: supplierDueDate,
        notes: "Opening vendor raw material commitment",
      });

      toast.success(`Business initialized! Welcome to Ripple, ${session.user.fullName}.`);
      void navigate({ to: "/dashboard" });
    } catch (err) {
      const { message } = toApiError(err);
      if (isNetworkError(err)) {
        toast.error(
          `${message ?? "Could not reach the server."} You can also click "Switch to Offline Demo Mode" to test without the backend.`,
          { duration: 6000 },
        );
      } else {
        toast.error(message || "Registration failed. Please review your details and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col lg:flex-row bg-background">
      {/* ── Left 55%: Pure High-Speed Kinetic Motion Canvas (Zero Text) ── */}
      <AuthVisualPanel />

      {/* ── Right 45%: Reactive Multi-Step Onboarding Cockpit ── */}
      <div className="relative flex flex-1 items-center justify-center p-6 sm:p-10 lg:p-12 overflow-y-auto">
        <div className="pointer-events-none absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />

        <div className="w-full max-w-xl space-y-7 my-auto p-8 sm:p-10 rounded-2xl shadow-2xl border border-border/80 bg-card/95 backdrop-blur-md">
          {/* Header */}
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-md shadow-primary/20 lg:hidden mb-3">
              <Waves className="h-6 w-6 text-primary-foreground" aria-hidden />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Create Business Account
              </h1>
              <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
                STEP {step} OF 3
              </Badge>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {step === 1 && "Enter your company and sign-in credentials"}
              {step === 2 && "Configure your opening bank balance and cash safety buffer"}
              {step === 3 && "Add your initial customer order and supplier commitment"}
            </p>
          </div>

          {/* Step Progress Pill Indicator */}
          <div className="grid grid-cols-3 gap-2">
            <div
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                step >= 1 ? "bg-primary shadow-xs" : "bg-muted",
              )}
            />
            <div
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                step >= 2 ? "bg-primary shadow-xs" : "bg-muted",
              )}
            />
            <div
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                step >= 3 ? "bg-primary shadow-xs" : "bg-muted",
              )}
            />
          </div>

          {/* ════════════════════ STEP 1: Account Credentials ════════════════════ */}
          {step === 1 && (
            <form onSubmit={handleProceedToStep2} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="businessName" className="text-xs font-medium text-foreground">
                  Business Name <span className="text-rose-500">*</span>
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
                  Your Full Name <span className="text-rose-500">*</span>
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
                  Email Address <span className="text-rose-500">*</span>
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-medium text-foreground">
                    Password <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[10px] text-muted-foreground">Min 8 chars, letters & numbers</span>
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
                    "h-10 text-sm transition-all focus-visible:ring-2",
                    passwordError
                      ? "border-rose-500 focus-visible:ring-rose-500"
                      : "focus-visible:ring-primary",
                  )}
                />

                {/* Password Error Alert */}
                {passwordError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-500 font-medium pt-1 animate-in fade-in duration-200">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {/* Live Password Strength Feedback */}
                {password.length > 0 && !passwordError && (
                  <div className="flex items-center gap-1.5 text-[11px] pt-1">
                    {pwdStrength.valid ? (
                      <span className="text-emerald-500 flex items-center gap-1 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Strong password
                      </span>
                    ) : (
                      <span className="text-amber-500 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> {pwdStrength.message}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="h-11 w-full font-semibold shadow-sm transition-all hover:scale-[1.01] mt-2 cursor-pointer"
                disabled={loading}
              >
                <span>Continue to Cash & Reserves</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}

          {/* ════════════════════ STEP 2: Treasury Cash & Safety Reserves ════════════════════ */}
          {step === 2 && (
            <form onSubmit={handleProceedToStep3} className="space-y-4">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3.5 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span>Treasury & Liquidity Protection</span>
                </div>
                <p>
                  Ripple models cash flow daily to make sure your bank balance never breaches your safety buffer.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="openingCash" className="text-xs font-medium text-foreground">
                    Initial Treasury Cash (₹) <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ₹{parseFloat(openingCash || "0").toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">₹</span>
                  <Input
                    id="openingCash"
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="50000"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(e.target.value)}
                    disabled={loading}
                    className="h-10 pl-8 text-sm transition-all focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">Total liquid cash currently in your bank account.</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="safetyReserve" className="text-xs font-medium text-foreground">
                    Minimum Safety Reserve Buffer (₹) <span className="text-rose-500">*</span>
                  </Label>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    ₹{parseFloat(safetyReserve || "0").toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-muted-foreground text-sm font-semibold">₹</span>
                  <Input
                    id="safetyReserve"
                    type="number"
                    step="any"
                    min="0"
                    required
                    placeholder="10000"
                    value={safetyReserve}
                    onChange={(e) => setSafetyReserve(e.target.value)}
                    disabled={loading}
                    className="h-10 pl-8 text-sm transition-all focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Minimum threshold for business reserve health.
                </p>
              </div>

              {/* Live Usable Buffer Preview (Informational, Never Blocks) */}
              {parseFloat(openingCash || "0") >= 0 && parseFloat(safetyReserve || "0") >= 0 && (
                <div
                  className={cn(
                    "rounded-xl border p-3 text-xs flex items-center justify-between",
                    parseFloat(safetyReserve || "0") <= parseFloat(openingCash || "0")
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-400",
                  )}
                >
                  <span className="font-medium">
                    {parseFloat(safetyReserve || "0") <= parseFloat(openingCash || "0")
                      ? "Usable Operational Buffer:"
                      : "Starting Below Buffer (Deficit Alert):"}
                  </span>
                  <span className="font-mono font-bold">
                    {parseFloat(safetyReserve || "0") <= parseFloat(openingCash || "0")
                      ? `₹${(parseFloat(openingCash || "0") - parseFloat(safetyReserve || "0")).toLocaleString("en-IN")}`
                      : `-₹${(parseFloat(safetyReserve || "0") - parseFloat(openingCash || "0")).toLocaleString("en-IN")}`}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="h-11 flex-1 cursor-pointer"
                  disabled={loading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  <span>Back</span>
                </Button>
                <Button
                  type="submit"
                  className="h-11 flex-2 font-semibold shadow-sm transition-all hover:scale-[1.01] cursor-pointer"
                  disabled={loading}
                >
                  <span>Continue to Counterparties</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </form>
          )}

          {/* ════════════════════ STEP 3: Initial Customer & Supplier Loop ════════════════════ */}
          {step === 3 && (
            <form onSubmit={handleCompleteSetup} className="space-y-4">
              <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span>The Supplier-Business-Customer Loop</span>
                </div>
                <p>
                  Initialize your operational loop with one customer invoice and one supplier commitment, or skip to add them later.
                </p>
              </div>

              {/* Skip Option Banner */}
              <div className="rounded-xl border border-dashed border-border/80 bg-muted/20 p-3 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-medium text-foreground">Skip customer and supplier details?</span>
                  <p className="text-[11px] text-muted-foreground">
                    Launch cockpit with your initial cash and add counterparties later.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSkipCounterparties}
                  disabled={loading}
                  className="h-8 text-xs cursor-pointer shrink-0 font-medium hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  Skip for now
                </Button>
              </div>

              {/* Customer Block */}
              <div className="rounded-xl border border-border/80 p-3.5 space-y-3 bg-card">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/20 text-emerald-500 text-xs font-bold">
                    <Users className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-semibold text-foreground">First Key Customer</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="customerName" className="text-[11px] font-medium text-foreground">
                    Customer Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="customerName"
                    type="text"
                    required
                    placeholder="e.g. Apex Retail Corp"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={loading}
                    className="h-9 text-xs transition-all focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="customerAmount" className="text-[11px] font-medium text-foreground">
                      Receivable Invoice (₹) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="customerAmount"
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="35000"
                      value={customerAmount}
                      onChange={(e) => setCustomerAmount(e.target.value)}
                      disabled={loading}
                      className="h-9 text-xs transition-all focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="customerTerms" className="text-[11px] font-medium text-foreground">
                      Due In (Days) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="customerTerms"
                      type="number"
                      min="1"
                      max="180"
                      required
                      placeholder="15"
                      value={customerTerms}
                      onChange={(e) => setCustomerTerms(e.target.value)}
                      disabled={loading}
                      className="h-9 text-xs transition-all focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Supplier Block */}
              <div className="rounded-xl border border-border/80 p-3.5 space-y-3 bg-card">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-500/20 text-indigo-500 text-xs font-bold">
                    <Truck className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs font-semibold text-foreground">First Key Supplier</span>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="supplierName" className="text-[11px] font-medium text-foreground">
                    Supplier / Vendor Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="supplierName"
                    type="text"
                    required
                    placeholder="e.g. Kaveri Fabrics & Mills"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    disabled={loading}
                    className="h-9 text-xs transition-all focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="supplierAmount" className="text-[11px] font-medium text-foreground">
                      Payable Bill (₹) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="supplierAmount"
                      type="number"
                      step="any"
                      min="0"
                      required
                      placeholder="20000"
                      value={supplierAmount}
                      onChange={(e) => setSupplierAmount(e.target.value)}
                      disabled={loading}
                      className="h-9 text-xs transition-all focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="supplierTerms" className="text-[11px] font-medium text-foreground">
                      Payment Terms (Days) <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="supplierTerms"
                      type="number"
                      min="1"
                      max="180"
                      required
                      placeholder="15"
                      value={supplierTerms}
                      onChange={(e) => setSupplierTerms(e.target.value)}
                      disabled={loading}
                      className="h-9 text-xs transition-all focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="h-11 w-full sm:w-auto px-4 cursor-pointer"
                  disabled={loading}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  <span>Back</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSkipCounterparties}
                  className="h-11 w-full sm:flex-1 text-muted-foreground hover:text-foreground cursor-pointer text-xs"
                  disabled={loading}
                >
                  <span>Skip Counterparties</span>
                </Button>
                <Button
                  type="submit"
                  className="h-11 w-full sm:flex-1 font-semibold shadow-md shadow-primary/20 transition-all hover:scale-[1.01] cursor-pointer"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      <span>Initializing business...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4" />
                      <span>Launch Cockpit</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Footer Navigation */}
          <div className="pt-2 text-center text-sm text-muted-foreground border-t border-border/60">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Sign in <ArrowRight className="inline h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ── Subtle Low-Profile Live Connection Status in Bottom-Right Corner ── */}
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
