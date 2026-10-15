import React from "react";
import {
  Factory,
  Clock,
  Building2,
  ArrowRight,
  ShieldCheck,
  Split,
  Sparkles,
  Layers,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * Full-Bleed Problem Statement Animation for Sign-In & Onboarding.
 * Visually communicates "The Supplier → Business → Customer Loop":
 * - Stage 1 (Supplier): Demands advance before inventory ships (-₹1.2L)
 * - Stage 2 (Business): Cash conversion gap (Days 2–24) locked in production & buffer
 * - Stage 3 (Customer): Pays weeks after receiving goods (+₹5.0L)
 * - Resolution Bar: How Ripple bridges the timing gap via Auto-Phase & Split-Escrow without debt.
 * Toned down ambient brightness (opacity-40, softer slate/indigo/emerald tones) for sleek readability.
 */
export function AuthVisualPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white lg:w-[55%] select-none border-r border-border/40">
      {/* ── Toned-Down Ambient Background Glows (~35% reduced opacity) ── */}
      <div
        className="pointer-events-none absolute -left-20 -top-20 h-[420px] w-[420px] rounded-full bg-rose-500/10 blur-3xl opacity-40 animate-pulse"
        style={{ animationDuration: "4s" }}
      />
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[450px] w-[450px] rounded-full bg-indigo-500/15 blur-3xl opacity-40 animate-pulse"
        style={{ animationDuration: "5s" }}
      />
      <div
        className="pointer-events-none absolute -bottom-20 -right-20 h-[420px] w-[420px] rounded-full bg-emerald-500/10 blur-3xl opacity-40 animate-pulse"
        style={{ animationDuration: "4.5s" }}
      />

      {/* Subtle Coordinate Grid Overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* ── Top Header: Problem Description Context ── */}
      <div className="relative z-10 space-y-2.5 max-w-xl">
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="border-primary/40 bg-primary/10 text-primary-foreground/90 text-[11px] font-medium tracking-wide uppercase px-2.5 py-0.5"
          >
            The Operating Problem
          </Badge>
          <span className="text-xs text-muted-foreground/80 font-mono">
            SUPPLIER-BUSINESS-CUSTOMER LOOP
          </span>
        </div>
        <h2 className="text-2xl xl:text-3xl font-bold tracking-tight text-white leading-tight">
          The Cash Conversion Gap
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          Suppliers require cash payment before inventory arrives, while customers pay weeks after
          receiving goods. Managing these relationships independently creates artificial financial pressure.
        </p>
      </div>

      {/* ── Center: Full-Bleed 3-Stage Interactive Diagram ── */}
      <div className="relative z-10 my-auto py-6 space-y-4">
        {/* Animated Flow Connecting Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 relative">
          {/* Connector Line overlay */}
          <div className="hidden md:block absolute top-1/2 left-[16%] right-[16%] -translate-y-1/2 h-0.5 bg-gradient-to-r from-rose-500/40 via-amber-500/30 to-emerald-500/40 z-0 pointer-events-none" />

          {/* ── STAGE 1: Left Node — Supplier Upfront Outflow ── */}
          <div className="relative z-10 rounded-xl border border-rose-500/30 bg-slate-900/80 p-4 shadow-lg shadow-rose-950/20 backdrop-blur-md transition-all hover:border-rose-500/60">
            <div className="flex items-center justify-between mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/20 text-rose-400">
                <Factory className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                STAGE 1 · DAY 1
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-200">
                Supplier Demands Advance
              </div>
              <div className="text-lg font-bold text-rose-400 tracking-tight font-mono">
                −₹1,20,000
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Payment required before raw materials and greige fabric are dispatched.
              </p>
            </div>
          </div>

          {/* ── STAGE 2: Center Node — The Business Cash Trap ── */}
          <div className="relative z-10 rounded-xl border border-amber-500/40 bg-slate-900/90 p-4 shadow-xl shadow-amber-950/20 backdrop-blur-md ring-1 ring-amber-500/20 transition-all hover:border-amber-500/70">
            <div className="flex items-center justify-between mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                <Clock className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/40 animate-pulse">
                STAGE 2 · DAYS 2–24
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-amber-200">
                Cash Conversion Trap
              </div>
              <div className="text-base font-bold text-amber-300 tracking-tight flex items-center gap-1.5">
                <span>23-Day Float Lock</span>
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Capital locked in cutting, stitching & buffer. Rent & payroll due while cash is depleted.
              </p>
            </div>
          </div>

          {/* ── STAGE 3: Right Node — Late Customer Inflow ── */}
          <div className="relative z-10 rounded-xl border border-emerald-500/30 bg-slate-900/80 p-4 shadow-lg shadow-emerald-950/20 backdrop-blur-md transition-all hover:border-emerald-500/60">
            <div className="flex items-center justify-between mb-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <Building2 className="h-4 w-4" />
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                STAGE 3 · DAY 31
              </span>
            </div>
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-200">
                Customer Late Settlement
              </div>
              <div className="text-lg font-bold text-emerald-400 tracking-tight font-mono">
                +₹5,00,000
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Customer pays weeks after receiving finished garments under Net-30 terms.
              </p>
            </div>
          </div>
        </div>

        {/* ── Kinetic Flow Vectors & Wave Visualizer ── */}
        <div className="rounded-xl border border-slate-800/80 bg-slate-900/50 p-3.5 backdrop-blur-xs">
          <div className="flex items-center justify-between text-xs text-slate-400 font-mono mb-1.5">
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              Day 1 Outflow
            </span>
            <span className="text-amber-300/80 font-sans font-medium text-[11px]">
              23 Days of Artificial Operating Pressure
            </span>
            <span className="flex items-center gap-1.5 text-emerald-400">
              Day 31 Receipt
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>

          {/* SVG Animated Cash Conversion Trajectory */}
          <div className="w-full h-14 relative overflow-hidden rounded-lg bg-slate-950/60 border border-slate-800/60">
            <svg
              viewBox="0 0 500 56"
              className="w-full h-full"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f43f5e" />
                  <stop offset="25%" stopColor="#fb923c" />
                  <stop offset="65%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                </linearGradient>
              </defs>

              {/* Safety Reserve Threshold (Dashed line) */}
              <line
                x1="0"
                y1="28"
                x2="500"
                y2="28"
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="4 4"
                strokeOpacity="0.5"
              />

              {/* Shaded Shortfall Dip Area */}
              <path
                d="M 40 28 Q 120 54, 250 50 T 420 28 L 420 28 L 40 28 Z"
                fill="url(#areaGradient)"
              />

              {/* Un-rescued Dip Trajectory (Red/Orange curve) */}
              <path
                d="M 10 18 L 40 28 Q 120 54, 250 50 T 420 28 L 490 8"
                fill="none"
                stroke="url(#curveGradient)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Ripple Rescued Coordinated Line (Emerald/Cyan smooth curve) */}
              <path
                d="M 10 18 L 40 20 Q 150 16, 250 18 T 420 16 L 490 8"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="5 3"
                strokeOpacity="0.9"
              />
            </svg>
            <div className="absolute right-2 top-1 text-[10px] font-mono text-sky-400/90 font-medium bg-sky-950/60 px-1.5 py-0.5 rounded">
              Ripple Coordinated Path (Zero Deficit)
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Live Resolution Bar: Ripple Architecture ── */}
      <div className="relative z-10 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/10 via-slate-900/90 to-primary/5 p-4 shadow-xl backdrop-blur-md space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Sparkles className="h-4 w-4 text-sky-400" />
            <span className="text-white">How Ripple Bridges the Loop</span>
          </div>
          <Badge
            variant="outline"
            className="border-primary/40 bg-primary/20 text-sky-300 text-[10px] font-mono"
          >
            ZERO NEW DEBT
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          <div className="rounded-lg border border-border/40 bg-slate-950/60 p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              <span>Auto-Phase Micro-Batching</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Splits supplier obligations into delivery-matched milestones, keeping cash above safety reserves.
            </p>
          </div>

          <div className="rounded-lg border border-border/40 bg-slate-950/60 p-2.5 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-200">
              <Split className="h-3.5 w-3.5 text-emerald-400" />
              <span>Tri-Party Split-Escrow</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-tight">
              Directly routes incoming customer receivables to supplier materials without draining treasury float.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
