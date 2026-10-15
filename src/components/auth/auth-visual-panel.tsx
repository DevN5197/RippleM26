import React from "react";
import {
  Factory,
  Clock,
  Building2,
  ArrowRight,
  ShieldCheck,
  Split,
  Layers,
  Sparkles,
  Zap,
} from "lucide-react";

/**
 * Modern, Minimalist Visual Panel for Sign-In & Onboarding.
 * High-precision financial telemetry showcasing "The Supplier → Business → Customer Loop":
 * - Stage 1 (Supplier): Advance demand before dispatch (-₹1,20,000)
 * - Stage 2 (Business): 23-Day Float Lock in production & inventory buffer
 * - Stage 3 (Customer): Late settlement under Net-30 (+₹5,00,000)
 * - Telemetry Chart: Uncoordinated deficit vs. Ripple coordinated zero-debt trajectory
 * Clean obsidian canvas, subtle ambient lighting, razor-thin borders, and crisp typography.
 */
export function AuthVisualPanel() {
  return (
    <div className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-[#0A0D14] p-10 xl:p-12 text-slate-200 lg:w-[55%] select-none border-r border-white/[0.06]">
      {/* ── Precision Engineering Ambient Backdrop ── */}
      {/* Subtle top spotlight (refined, non-distracting) */}
      <div className="pointer-events-none absolute -top-36 left-1/2 -translate-x-1/2 h-[420px] w-[620px] rounded-full bg-indigo-500/[0.06] blur-[100px]" />
      <div className="pointer-events-none absolute -bottom-36 -right-20 h-[380px] w-[380px] rounded-full bg-emerald-500/[0.04] blur-[100px]" />

      {/* Razor-thin architectural dot-grid matrix */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] opacity-70" />

      {/* ── Top Header: Sleek Brand & Problem Statement ── */}
      <div className="relative z-10 space-y-3.5 max-w-xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-mono text-[10px] tracking-widest text-slate-300 uppercase font-semibold">
            RIPPLE ENGINE · CAPITAL COORDINATION
          </span>
        </div>

        <h2 className="text-3xl xl:text-4xl font-semibold tracking-tight text-white leading-[1.18]">
          The Cash Conversion Gap,{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300">
            Engineered to Zero.
          </span>
        </h2>

        <p className="text-sm text-slate-400 leading-relaxed font-normal">
          Suppliers require cash before goods ship, while customers settle weeks later.
          Ripple coordinates cash timing across your supply chain—eliminating float traps without new debt.
        </p>
      </div>

      {/* ── Center: High-Precision Telemetry Cockpit ── */}
      <div className="relative z-10 my-auto py-5">
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl p-5 xl:p-6 shadow-2xl space-y-5">
          {/* Cockpit Top Bar */}
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
              <span className="font-mono text-[11px] text-slate-300 font-medium tracking-wide">
                OPERATING CYCLE TELEMETRY
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span className="text-slate-400">
                DEFICIT GAP: <span className="text-rose-400 font-semibold">-23d</span>
              </span>
              <span className="text-white/20">|</span>
              <span className="text-slate-400">
                RIPPLE: <span className="text-emerald-400 font-semibold">PROTECTED</span>
              </span>
            </div>
          </div>

          {/* 3 Pipeline Nodes */}
          <div className="grid grid-cols-3 gap-3 relative">
            {/* Connecting vector hairline */}
            <div className="hidden sm:block absolute top-[20px] left-[18%] right-[18%] h-[1px] bg-gradient-to-r from-rose-500/40 via-amber-500/40 to-emerald-500/40 z-0 pointer-events-none" />

            {/* Stage 1: Supplier Advance Outflow */}
            <div className="relative z-10 rounded-xl border border-white/[0.07] bg-slate-950/70 p-3.5 space-y-1.5 transition-all hover:border-white/[0.15]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-500 font-semibold tracking-wider">
                  STAGE 1 · T+0d
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              </div>
              <div className="text-xs font-medium text-slate-300 truncate">
                Supplier Advance
              </div>
              <div className="font-mono text-base xl:text-lg font-bold text-rose-400 tracking-tight">
                −₹1,20,000
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">
                Due before materials ship
              </div>
            </div>

            {/* Stage 2: Operating Cash Trap */}
            <div className="relative z-10 rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-3.5 space-y-1.5 transition-all hover:border-amber-500/50">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-amber-400 font-semibold tracking-wider">
                  STAGE 2 · T+14d
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              </div>
              <div className="text-xs font-medium text-amber-200 truncate">
                Cash Conversion Trap
              </div>
              <div className="font-mono text-base xl:text-lg font-bold text-amber-300 tracking-tight">
                23-Day Float Lock
              </div>
              <div className="text-[11px] text-amber-300/80 leading-tight">
                Capital locked in buffer
              </div>
            </div>

            {/* Stage 3: Customer Late Settlement */}
            <div className="relative z-10 rounded-xl border border-white/[0.07] bg-slate-950/70 p-3.5 space-y-1.5 transition-all hover:border-white/[0.15]">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-slate-500 font-semibold tracking-wider">
                  STAGE 3 · T+31d
                </span>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              </div>
              <div className="text-xs font-medium text-slate-300 truncate">
                Customer Receipt
              </div>
              <div className="font-mono text-base xl:text-lg font-bold text-emerald-400 tracking-tight">
                +₹5,00,000
              </div>
              <div className="text-[11px] text-slate-400 leading-tight">
                Net-30 post delivery
              </div>
            </div>
          </div>

          {/* Minimalist Trajectory Chart Canvas */}
          <div className="rounded-xl border border-white/[0.06] bg-slate-950/90 p-4 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-400 font-medium">TREASURY TRAJECTORY</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-slate-400">
                  <span className="h-0.5 w-3 bg-rose-500/70 inline-block rounded" /> Uncoordinated Dip
                </span>
                <span className="flex items-center gap-1.5 text-sky-300 font-semibold">
                  <span className="h-0.5 w-3 bg-sky-400 inline-block rounded" /> Ripple Coordinated
                </span>
              </div>
            </div>

            <div className="relative h-20 w-full overflow-hidden">
              <svg
                viewBox="0 0 500 80"
                className="w-full h-full"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="unrescuedArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="rippleLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#34d399" />
                  </linearGradient>
                </defs>

                {/* Safety Reserve Threshold Guideline */}
                <line
                  x1="0"
                  y1="38"
                  x2="500"
                  y2="38"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text x="6" y="33" fill="rgba(255,255,255,0.3)" fontSize="9" fontFamily="monospace">
                  SAFETY RESERVE THRESHOLD
                </text>

                {/* Shaded Deficit Dip Area */}
                <path
                  d="M 60 38 Q 140 76, 250 72 T 420 38 L 420 38 L 60 38 Z"
                  fill="url(#unrescuedArea)"
                />

                {/* Un-rescued Dip Trajectory (Deficit) */}
                <path
                  d="M 15 28 L 60 38 Q 140 76, 250 72 T 420 38 L 485 14"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  strokeOpacity="0.65"
                />

                {/* Ripple Coordinated Smooth Line (Zero Deficit) */}
                <path
                  d="M 15 28 L 60 28 Q 160 22, 250 25 T 420 20 L 485 14"
                  fill="none"
                  stroke="url(#rippleLineGrad)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Live Point Indicator */}
                <circle cx="250" cy="25" r="3.5" fill="#38bdf8" />
                <circle cx="250" cy="25" r="7" fill="#38bdf8" fillOpacity="0.25" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Resolution: High-End Architecture Specs ── */}
      <div className="relative z-10 space-y-3">
        {/* 3 Metric Stats */}
        <div className="grid grid-cols-3 divide-x divide-white/[0.08] rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-center backdrop-blur-md">
          <div className="px-2">
            <div className="font-mono text-base xl:text-lg font-bold text-white">23d → 0d</div>
            <div className="text-[10px] text-slate-400 font-mono tracking-wide uppercase">
              Float Gap Solved
            </div>
          </div>
          <div className="px-2">
            <div className="font-mono text-base xl:text-lg font-bold text-emerald-400">₹0</div>
            <div className="text-[10px] text-slate-400 font-mono tracking-wide uppercase">
              New Debt Required
            </div>
          </div>
          <div className="px-2">
            <div className="font-mono text-base xl:text-lg font-bold text-sky-400">100%</div>
            <div className="text-[10px] text-slate-400 font-mono tracking-wide uppercase">
              Reserves Protected
            </div>
          </div>
        </div>

        {/* 2 Feature Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-slate-950/50 px-3 py-2 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_rgba(129,140,248,0.8)]" />
            <span className="font-medium text-slate-200">Auto-Phase Micro-Batching</span>
            <span className="ml-auto text-[10px] text-slate-400 font-mono">Milestone Sync</span>
          </div>

          <div className="flex items-center gap-2.5 rounded-lg border border-white/[0.06] bg-slate-950/50 px-3 py-2 text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
            <span className="font-medium text-slate-200">Tri-Party Split-Escrow</span>
            <span className="ml-auto text-[10px] text-slate-400 font-mono">Receivable Linked</span>
          </div>
        </div>
      </div>
    </div>
  );
}

