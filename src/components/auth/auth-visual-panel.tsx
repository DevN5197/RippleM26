import React, { useState, useEffect } from "react";
import {
  Waves,
  Truck,
  CreditCard,
  Building2,
  AlertTriangle,
  ShieldCheck,
  Zap,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function AuthVisualPanel() {
  const [activeTab, setActiveTab] = useState<"before" | "after">("before");

  // Auto-cycle between "before" and "after" every 6s
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveTab((prev) => (prev === "before" ? "after" : "before"));
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-10 text-white lg:w-[55%]">
      {/* Background ambient decorative glow */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/3 h-72 w-72 rounded-full bg-purple-500/15 blur-3xl" />

      {/* Grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Top Header */}
      <div className="relative z-10">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30 ring-2 ring-primary/30">
            <Waves className="h-6 w-6 text-primary-foreground" aria-hidden />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">Ripple</span>
              <Badge className="bg-primary/20 text-primary-foreground border-primary/30 text-[10px] font-mono">
                COORDINATION ENGINE
              </Badge>
            </div>
            <p className="text-xs text-slate-400">
              Supplier · Business · Customer Cash Coordination
            </p>
          </div>
        </div>
      </div>

      {/* Central Visual: The Live Loop Canvas */}
      <div className="relative z-10 my-auto py-6">
        <div className="mb-4 text-center">
          <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-indigo-300">
            The Interconnected Operating Cycle
          </span>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-white">
            When One Customer Pays Late, Everything Stalls
          </h2>
          <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
            See how small payment delays trigger supplier halt fees and kill profit margins—unless
            Ripple protects you.
          </p>
        </div>

        {/* 3-Node Connected Loop Diagram */}
        <div className="relative mx-auto max-w-xl rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-2xl backdrop-blur-xl">
          {/* Animated Connecting SVG Circuit */}
          <div className="absolute inset-0 pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
                </linearGradient>
              </defs>
              {/* Connecting line between cards */}
              <path
                d="M 120 75 Q 260 25 400 75"
                fill="none"
                stroke="url(#flowGrad)"
                strokeWidth="2"
                strokeDasharray="6 4"
                className="animate-[pulse_3s_ease-in-out_infinite]"
              />
              <path
                d="M 400 135 Q 260 210 120 135"
                fill="none"
                stroke="url(#flowGrad)"
                strokeWidth="2"
                strokeDasharray="6 4"
                className="animate-[pulse_3s_ease-in-out_infinite]"
              />
            </svg>
          </div>

          <div className="relative grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Node 1: Supplier */}
            <div
              className={cn(
                "rounded-xl border p-3.5 transition-all duration-300",
                activeTab === "before"
                  ? "border-amber-500/40 bg-amber-950/20 shadow-lg shadow-amber-950/30"
                  : "border-emerald-500/40 bg-emerald-950/20 shadow-lg shadow-emerald-950/30",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-slate-300">
                  <Truck className="h-4 w-4" />
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    activeTab === "before" ? "text-amber-400" : "text-emerald-400",
                  )}
                >
                  {activeTab === "before" ? "Halted" : "Protected"}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-white">Shree / Kaveri Timber</p>
              <p className="text-[11px] text-slate-400">Raw Material Gate</p>
              <div className="mt-2 pt-2 border-t border-white/10 flex items-baseline justify-between">
                <span className="text-[10px] text-slate-400">Obligation:</span>
                <span className="text-xs font-mono font-semibold text-rose-400">-₹1,20,000</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                <span>Due Day 18</span>
                <span className="text-slate-500">·</span>
                <span className={activeTab === "before" ? "text-rose-400 font-medium" : "text-emerald-400 font-medium"}>
                  {activeTab === "before" ? "₹32.5k late fees" : "₹0 late fees"}
                </span>
              </div>
            </div>

            {/* Node 2: Your Business (Keystone) */}
            <div className="rounded-xl border border-primary/50 bg-primary/10 p-3.5 shadow-xl shadow-primary/20 ring-1 ring-primary/30 relative">
              <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground text-[9px] font-bold uppercase tracking-widest px-2 py-0 shadow-md">
                  YOUR TREASURY
                </Badge>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/30 text-primary-foreground">
                  <Building2 className="h-4 w-4" />
                </span>
                <Badge variant="outline" className="text-[10px] border-primary/40 text-primary-foreground">
                  Day 0
                </Badge>
              </div>
              <p className="mt-2 text-xs font-semibold text-white">Rupi Clothing</p>
              <p className="text-[11px] text-slate-300">Treasury & Buffer</p>
              <div className="mt-2 pt-2 border-t border-white/10 flex items-baseline justify-between">
                <span className="text-[10px] text-slate-400">Usable Cash:</span>
                <span className="text-xs font-mono font-bold text-emerald-400">₹5,000</span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                <span>Buffer Limit:</span>
                <span className="font-mono text-slate-300">₹5,000</span>
              </div>
            </div>

            {/* Node 3: Customer */}
            <div
              className={cn(
                "rounded-xl border p-3.5 transition-all duration-300",
                activeTab === "before"
                  ? "border-rose-500/40 bg-rose-950/20 shadow-lg shadow-rose-950/30"
                  : "border-emerald-500/40 bg-emerald-950/20 shadow-lg shadow-emerald-950/30",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-slate-300">
                  <CreditCard className="h-4 w-4" />
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    activeTab === "before" ? "text-rose-400" : "text-emerald-400",
                  )}
                >
                  {activeTab === "before" ? "+16d Delay" : "Escrow Routed"}
                </span>
              </div>
              <p className="mt-2 text-xs font-semibold text-white">Urban / Apex Corp</p>
              <p className="text-[11px] text-slate-400">Incoming Payment</p>
              <div className="mt-2 pt-2 border-t border-white/10 flex items-baseline justify-between">
                <span className="text-[10px] text-slate-400">Receivable:</span>
                <span className="text-xs font-mono font-semibold text-emerald-400">+₹5,00,000</span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-400">
                <span>Due Day 15 → 31</span>
                <span className="text-slate-500">·</span>
                <span className="text-amber-400 font-medium">Bottleneck</span>
              </div>
            </div>
          </div>

          {/* Interactive Toggle Pill Bar */}
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-col gap-3">
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("before")}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === "before"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white border border-transparent",
                )}
              >
                <AlertTriangle className="h-3 w-3" />
                <span>Without Ripple (Profit Crushed)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("after")}
                className={cn(
                  "rounded-full px-3.5 py-1 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
                  activeTab === "after"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                    : "text-slate-400 hover:text-white border border-transparent",
                )}
              >
                <ShieldCheck className="h-3 w-3" />
                <span>With Ripple Rescue (Profit Protected)</span>
              </button>
            </div>

            {/* Dynamic Comparison Card */}
            <div
              className={cn(
                "rounded-xl border p-4 transition-all duration-300",
                activeTab === "before"
                  ? "border-rose-500/30 bg-rose-950/30"
                  : "border-emerald-500/30 bg-emerald-950/30",
              )}
            >
              {activeTab === "before" ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-rose-300 flex items-center gap-1.5">
                      <TrendingDown className="h-4 w-4 text-rose-400" />
                      Paper Margin Illusion: 25.0% drops to 6.34%
                    </span>
                    <Badge variant="outline" className="border-rose-500/40 text-rose-300 text-[10px]">
                      -₹93,300 Drag
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Customer pays <strong>16 days late</strong>. Your treasury breaches the ₹5,000 safety
                    threshold, causing raw material halt fees (₹32,500), customer SLA fines (₹39,000), and
                    lost supplier discounts (₹3,600).
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-mono">
                    <span>Paper: ₹1,25,000</span>
                    <span>→</span>
                    <span className="text-rose-400 font-bold">Actual Take-Home: ₹31,700</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                      <TrendingUp className="h-4 w-4 text-emerald-400" />
                      1-Click Rescues: Full Profit & Cash Protected
                    </span>
                    <Badge variant="outline" className="border-emerald-500/40 text-emerald-300 text-[10px]">
                      24.8% Retained
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>1-Click Split-Escrow & Auto-Phasing</strong> routes the customer receivable to
                    pay the supplier with ₹0 cash outlay. Buffer stays intact, late fees disappear, and
                    Metro Retail delivery completes on schedule.
                  </p>
                  <div className="flex items-center gap-2 pt-1 text-[11px] text-slate-400 font-mono">
                    <span>Zero Bank Cash Outflow</span>
                    <span>→</span>
                    <span className="text-emerald-400 font-bold">Protected Margin: ₹1,22,600</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Footer Pill */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>Keystone Fragility Modeling · Zero-Cash Escrow · Cash Timing Rescue</span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">v1.2 Production Ready</span>
      </div>
    </div>
  );
}
