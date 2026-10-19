import React, { useState, useEffect } from "react";
import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Wallet,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Building2,
  Users,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Truck,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { settingsApi } from "@/lib/api/settingsApi";
import { customerApi } from "@/lib/api/customerApi";
import { supplierApi } from "@/lib/api/supplierApi";
import { invoiceApi } from "@/lib/api/invoiceApi";
import { getStoredBusiness, getStoredUser } from "@/lib/api/authApi";
import { formatMoney } from "@/lib/formatters";
import { toApiError } from "@/lib/errors";

export const Route = createFileRoute("/onboarding")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token") || localStorage.getItem("ripple_auth_token");
      if (!token) {
        throw redirect({ to: "/login" });
      }
    }
  },
  head: () => ({
    meta: [
      { title: "Workspace Setup & Cash In — Ripple" },
      { name: "description", content: "Configure your initial opening cash, safety reserve, and first counterparty flows." },
    ],
  }),
  component: OnboardingPage,
});

export function OnboardingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const storedBiz = getStoredBusiness();
  const storedUser = getStoredUser();

  // Business Name
  const businessName = storedBiz?.name || "Your Enterprise";

  // Step 1: Cash In & Safety Reserve (values in Rupees for display/input)
  const [openingCashRupees, setOpeningCashRupees] = useState<number>(500000);
  const [safetyReserveRupees, setSafetyReserveRupees] = useState<number>(100000);

  // Step 2: Initial Optional Counterparties
  const todayStr = new Date().toISOString().slice(0, 10);
  const defaultCustomerDueDate = new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10);
  const defaultSupplierDueDate = new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10);

  const [customerName, setCustomerName] = useState<string>("");
  const [customerAmountRupees, setCustomerAmountRupees] = useState<number | "">("");
  const [customerDueDate, setCustomerDueDate] = useState<string>(defaultCustomerDueDate);

  const [supplierName, setSupplierName] = useState<string>("");
  const [supplierAmountRupees, setSupplierAmountRupees] = useState<number | "">("");
  const [supplierDueDate, setSupplierDueDate] = useState<string>(defaultSupplierDueDate);

  const [loading, setLoading] = useState<boolean>(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load existing business settings if available
  useEffect(() => {
    void (async () => {
      try {
        const s = await settingsApi.getSettings();
        if (s?.business?.openingCashPaise) {
          const cash = Math.round(s.business.openingCashPaise / 100);
          setOpeningCashRupees(cash);
          if (s.business.safetyThresholdPaise) {
            setSafetyReserveRupees(Math.round(s.business.safetyThresholdPaise / 100));
          } else {
            setSafetyReserveRupees(Math.round(cash * 0.2));
          }
        }
      } catch {
        // Use defaults if settings cannot be fetched yet
      }
    })();
  }, []);

  // Real-time validation
  useEffect(() => {
    if (openingCashRupees <= 0) {
      setValidationError("Opening cash balance must be greater than zero.");
    } else if (safetyReserveRupees >= openingCashRupees) {
      setValidationError("Safety reserve buffer must be strictly less than opening cash balance.");
    } else if (safetyReserveRupees < 0) {
      setValidationError("Safety reserve buffer cannot be negative.");
    } else {
      setValidationError(null);
    }
  }, [openingCashRupees, safetyReserveRupees]);

  // Derived financial calculations for preview
  const openingCashPaise = Math.round(openingCashRupees * 100);
  const safetyReservePaise = Math.round(safetyReserveRupees * 100);
  const custPaise = typeof customerAmountRupees === "number" && customerAmountRupees > 0 ? Math.round(customerAmountRupees * 100) : 0;
  const suppPaise = typeof supplierAmountRupees === "number" && supplierAmountRupees > 0 ? Math.round(supplierAmountRupees * 100) : 0;
  const netProjectedPaise = openingCashPaise + custPaise - suppPaise;
  const isHealthyBuffer = netProjectedPaise >= safetyReservePaise;

  const handleOpeningCashPreset = (amount: number) => {
    setOpeningCashRupees(amount);
    setSafetyReserveRupees(Math.round(amount * 0.2));
  };

  const handleSafetyPresetPercent = (pct: number) => {
    setSafetyReserveRupees(Math.round(openingCashRupees * pct));
  };

  // Submit complete onboarding
  const handleSubmit = async (skipCounterparties = false) => {
    if (openingCashRupees <= 0) {
      toast.error("Please enter a valid opening cash balance.");
      return;
    }
    if (safetyReserveRupees >= openingCashRupees) {
      toast.error("Safety reserve buffer must be strictly less than opening cash balance.");
      return;
    }

    setLoading(true);
    try {
      // 1. Update Core Financial Settings
      await settingsApi.updateSettings({
        business: {
          openingCashPaise,
          safetyThresholdPaise: safetyReservePaise,
        },
      });

      // 2. If counterparties provided and not skipped
      if (!skipCounterparties) {
        // Customer Receivable
        if (customerName.trim() && custPaise > 0) {
          const cust = await customerApi.create({
            name: customerName.trim(),
            creditTermsDays: 15,
          });
          await invoiceApi.create({
            type: "receivable",
            customerId: cust.id,
            amountPaise: custPaise,
            issueDate: todayStr,
            dueDate: customerDueDate,
            notes: "Opening customer receivable",
          });
        }

        // Supplier Payable
        if (supplierName.trim() && suppPaise > 0) {
          const supp = await supplierApi.create({
            name: supplierName.trim(),
            paymentTermsDays: 10,
            reliabilityScore: 94,
          });
          await invoiceApi.create({
            type: "payable",
            supplierId: supp.id,
            amountPaise: suppPaise,
            issueDate: todayStr,
            dueDate: supplierDueDate,
            notes: "Opening supplier order bill",
          });
        }
      }

      // Synchronize caches
      await queryClient.invalidateQueries();

      toast.success("Workspace initialized with your liquidity parameters!");
      void navigate({ to: "/dashboard" });
    } catch (err) {
      const { message } = toApiError(err);
      toast.error(message || "Failed to initialize workspace.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-black text-white p-4 sm:p-6 md:p-8">
      {/* ── Ambient Radial Orbs ── */}
      <div
        className="absolute rounded-full pointer-events-none w-[600px] h-[600px] -top-32 -left-32 blur-[130px] opacity-25"
        style={{
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.04) 45%, transparent 70%)",
        }}
      />
      <div
        className="absolute rounded-full pointer-events-none w-[550px] h-[550px] -bottom-32 -right-32 blur-[130px] opacity-20"
        style={{
          background: "radial-gradient(circle, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.03) 45%, transparent 70%)",
        }}
      />

      {/* ── Centered Command Card ── */}
      <div className="backdrop-blur-2xl bg-[#09090b]/90 border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)] rounded-3xl p-6 sm:p-10 w-full max-w-2xl relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-white border border-white/20 shadow-md mb-1">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Financial Liquidity Setup
            </h1>
            <Badge className="bg-emerald-950/60 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
              STEP {step} OF 2
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md">
            Welcome to <span className="text-white font-semibold">{businessName}</span>. Set your opening cash reserves to calibrate Ripple&apos;s real-time risk engine.
          </p>
        </div>

        {/* Step Indicator Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-black/60 p-1 rounded-xl border border-white/10 text-xs">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
              step === 1 ? "bg-white text-black font-semibold shadow-sm" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            <span>1. Cash In & Reserves</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (validationError) {
                toast.error(validationError);
                return;
              }
              setStep(2);
            }}
            className={`py-2 px-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
              step === 2 ? "bg-white text-black font-semibold shadow-sm" : "text-neutral-400 hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>2. Initial Cash Flows</span>
          </button>
        </div>

        {/* ── STEP 1: OPENING CASH IN & SAFETY BUFFER ── */}
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Opening Cash Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="openingCash" className="text-sm font-semibold text-white flex items-center gap-2">
                  <ArrowDownRight className="h-4 w-4 text-emerald-400" />
                  Opening Cash Balance (Cash In)
                </Label>
                <span className="text-xs font-mono text-emerald-400 font-bold">
                  {formatMoney(openingCashPaise)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-sm font-semibold">
                  ₹
                </span>
                <Input
                  id="openingCash"
                  type="number"
                  min={1000}
                  step={5000}
                  value={openingCashRupees || ""}
                  onChange={(e) => setOpeningCashRupees(Number(e.target.value) || 0)}
                  className="pl-8 h-12 text-base font-mono rounded-xl bg-white/[0.04] border-white/15 text-white focus-visible:ring-2 focus-visible:ring-white/40"
                  placeholder="500000"
                />
              </div>
              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: "₹1 Lakh", val: 100000 },
                  { label: "₹2.5 Lakh", val: 250000 },
                  { label: "₹5 Lakh", val: 500000 },
                  { label: "₹10 Lakh", val: 1000000 },
                  { label: "₹25 Lakh", val: 2500000 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => handleOpeningCashPreset(preset.val)}
                    className={`text-[11px] px-2.5 py-1 rounded-md border font-mono transition-all cursor-pointer ${
                      openingCashRupees === preset.val
                        ? "bg-white text-black font-bold border-white"
                        : "border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Safety Reserve Threshold Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="safetyReserve" className="text-sm font-semibold text-white flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  Minimum Safety Reserve (Emergency Floor)
                </Label>
                <span className="text-xs font-mono text-amber-400 font-bold">
                  {formatMoney(safetyReservePaise)}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-sm font-semibold">
                  ₹
                </span>
                <Input
                  id="safetyReserve"
                  type="number"
                  min={0}
                  step={5000}
                  value={safetyReserveRupees || ""}
                  onChange={(e) => setSafetyReserveRupees(Number(e.target.value) || 0)}
                  className="pl-8 h-12 text-base font-mono rounded-xl bg-white/[0.04] border-white/15 text-white focus-visible:ring-2 focus-visible:ring-white/40"
                  placeholder="100000"
                />
              </div>
              {/* Quick Percentage Presets */}
              <div className="flex items-center justify-between gap-1 pt-1">
                <div className="flex gap-1.5">
                  {[
                    { label: "10% Buffer", pct: 0.1 },
                    { label: "20% Buffer (Standard)", pct: 0.2 },
                    { label: "30% Buffer", pct: 0.3 },
                  ].map((preset) => (
                    <button
                      key={preset.pct}
                      type="button"
                      onClick={() => handleSafetyPresetPercent(preset.pct)}
                      className="text-[11px] px-2.5 py-1 rounded-md border border-white/10 bg-white/5 text-neutral-300 hover:bg-white/10 hover:text-white font-mono transition-all cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-neutral-400">Must be &lt; Opening Cash</span>
              </div>
            </div>

            {/* Validation Error Banner */}
            {validationError && (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-3 flex items-center gap-2.5 text-xs text-rose-300 animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{validationError}</span>
              </div>
            )}

            {/* Quick Summary Preview */}
            <div className="rounded-2xl border border-white/10 bg-black/40 p-4 space-y-2 text-xs">
              <div className="flex items-center justify-between text-neutral-400">
                <span>Working Capital Runway:</span>
                <span className="font-mono text-white font-medium">
                  {formatMoney(Math.max(0, openingCashPaise - safetyReservePaise))} deployable float
                </span>
              </div>
              <div className="flex items-center justify-between text-neutral-400">
                <span>Threshold Breach Alert:</span>
                <span className="text-emerald-400 font-medium">
                  Active (Triggers if cash drops below {formatMoney(safetyReservePaise)})
                </span>
              </div>
            </div>

            {/* Next Step / Direct Finish Button */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button
                type="button"
                disabled={Boolean(validationError) || loading}
                onClick={() => setStep(2)}
                className="w-full sm:flex-1 h-12 bg-white text-black hover:bg-neutral-200 font-semibold text-sm rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Continue to Counterparty Flows</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={Boolean(validationError) || loading}
                onClick={() => handleSubmit(true)}
                className="w-full sm:w-auto h-12 border-white/15 bg-white/5 hover:bg-white/10 text-white font-medium text-xs rounded-xl transition-all cursor-pointer"
              >
                Skip & Launch Dashboard
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 2: INITIAL CASH FLOW INFLOWS & OUTFLOWS ("CASH IN AND ALL") ── */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-neutral-300 flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                Optional: Add your primary customer receivable and supplier payable to see Ripple&apos;s real-time timeline & contagion graph populate immediately.
              </p>
            </div>

            {/* Customer Receivable (Cash Inflow) */}
            <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                  <Receipt className="h-4 w-4" />
                  <span>First Customer Receipt (Expected Inflow)</span>
                </div>
                <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400">
                  OPTIONAL
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="custName" className="text-xs text-neutral-300">Customer / Client Name</Label>
                  <Input
                    id="custName"
                    type="text"
                    placeholder="e.g. Metro Lifestyle Retail"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-10 text-xs rounded-lg bg-black/50 border-white/15 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="custAmount" className="text-xs text-neutral-300">Expected Inflow (₹)</Label>
                  <Input
                    id="custAmount"
                    type="number"
                    min={0}
                    placeholder="e.g. 75000"
                    value={customerAmountRupees}
                    onChange={(e) => setCustomerAmountRupees(e.target.value ? Number(e.target.value) : "")}
                    className="h-10 text-xs font-mono rounded-lg bg-black/50 border-white/15 text-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="custDueDate" className="text-xs text-neutral-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Expected Receipt Due Date
                </Label>
                <Input
                  id="custDueDate"
                  type="date"
                  value={customerDueDate}
                  onChange={(e) => setCustomerDueDate(e.target.value)}
                  className="h-10 text-xs font-mono rounded-lg bg-black/50 border-white/15 text-white max-w-xs"
                />
              </div>
            </div>

            {/* Supplier Payable (Cash Outflow) */}
            <div className="p-4 rounded-2xl border border-rose-500/20 bg-rose-950/10 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-rose-400">
                  <Truck className="h-4 w-4" />
                  <span>First Supplier Bill (Committed Outflow)</span>
                </div>
                <Badge variant="outline" className="text-[10px] border-rose-500/30 text-rose-400">
                  OPTIONAL
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="suppName" className="text-xs text-neutral-300">Supplier / Vendor Name</Label>
                  <Input
                    id="suppName"
                    type="text"
                    placeholder="e.g. Surat Yarns & Threads"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="h-10 text-xs rounded-lg bg-black/50 border-white/15 text-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="suppAmount" className="text-xs text-neutral-300">Bill Outflow (₹)</Label>
                  <Input
                    id="suppAmount"
                    type="number"
                    min={0}
                    placeholder="e.g. 45000"
                    value={supplierAmountRupees}
                    onChange={(e) => setSupplierAmountRupees(e.target.value ? Number(e.target.value) : "")}
                    className="h-10 text-xs font-mono rounded-lg bg-black/50 border-white/15 text-white"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="suppDueDate" className="text-xs text-neutral-300 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  Payment Due Date
                </Label>
                <Input
                  id="suppDueDate"
                  type="date"
                  value={supplierDueDate}
                  onChange={(e) => setSupplierDueDate(e.target.value)}
                  className="h-10 text-xs font-mono rounded-lg bg-black/50 border-white/15 text-white max-w-xs"
                />
              </div>
            </div>

            {/* Live Financial Projection Preview Card */}
            <div className="p-4 rounded-2xl bg-black/60 border border-white/15 space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-neutral-300">
                <span>Initial Balance Projection:</span>
                <Badge className={isHealthyBuffer ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/30" : "bg-rose-950/60 text-rose-400 border-rose-500/30"}>
                  {isHealthyBuffer ? "SAFE RUNWAY" : "CRITICAL BUFFER RISK"}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center pt-1 font-mono text-xs">
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-[10px] text-neutral-400">Opening Cash In</div>
                  <div className="text-emerald-400 font-bold mt-0.5">{formatMoney(openingCashPaise)}</div>
                </div>
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-[10px] text-neutral-400">Net Flow</div>
                  <div className={`font-bold mt-0.5 ${custPaise >= suppPaise ? "text-emerald-400" : "text-rose-400"}`}>
                    {custPaise >= suppPaise ? "+" : "-"}{formatMoney(Math.abs(custPaise - suppPaise))}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                  <div className="text-[10px] text-neutral-400">Projected Liquidity</div>
                  <div className="text-white font-bold mt-0.5">{formatMoney(netProjectedPaise)}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={loading}
                className="w-full sm:w-auto h-12 border-white/15 bg-white/5 hover:bg-white/10 text-white font-medium text-xs rounded-xl transition-all cursor-pointer"
              >
                Back to Cash In
              </Button>
              <Button
                type="button"
                disabled={loading}
                onClick={() => handleSubmit(false)}
                className="w-full sm:flex-1 h-12 bg-white text-black hover:bg-neutral-200 font-semibold text-sm rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-black border-t-transparent" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Save Financials & Launch Cockpit</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
