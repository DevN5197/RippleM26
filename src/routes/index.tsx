import React, { useState, useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rump — The Ripple Simulator & 4 Working-Capital Pillars" },
      {
        name: "description",
        content:
          "See how one late customer payment ripples through your entire business like falling dominoes—and fix cash crashes in 1 click before they ever happen.",
      },
      { property: "og:title", content: "Rump — The Ripple Simulator & 4 Working-Capital Pillars" },
      {
        property: "og:description",
        content:
          "See how one late customer payment ripples through your entire business like falling dominoes—and fix cash crashes in 1 click before they ever happen.",
      },
    ],
  }),
  component: LandingPage,
});

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-black text-white font-sans overflow-x-hidden selection:bg-white/20">
      {/* Film Grain */}
      <div
        className="fixed inset-0 z-50 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
        aria-hidden="true"
      />

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 grid grid-cols-[1fr_auto_1fr] items-center px-6 md:px-10 lg:px-16 pt-5 pb-3.5 z-40 bg-gradient-to-b from-black/85 via-black/45 to-transparent backdrop-blur-md">
        <a
          href="#top"
          className="inline-flex items-center gap-2.5 justify-self-start text-[16.5px] font-semibold tracking-[-0.03em] text-white hover:opacity-90 transition-opacity"
          aria-label="Rump"
        >
          <svg
            className="w-[22px] h-[22px] shrink-0 text-white"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <g transform="rotate(-30 12 12)">
              <circle cx="7.3" cy="3.2" r="1.45" />
              <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
              <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
              <circle cx="16.7" cy="20.8" r="1.45" />
            </g>
          </svg>
          <span>Rump</span>
        </a>

        {/* 3 Nav Pills */}
        <nav
          id="site-nav"
          aria-label="Primary"
          className="hidden md:flex items-center gap-2 justify-self-center"
        >
          <a
            href="#benefits"
            className="group relative inline-flex items-center justify-center h-10 px-4.5 rounded-[7px] overflow-hidden border border-white/20 bg-gradient-to-r from-[#050505] via-[#2a2a2a] to-[#4a4a4a] text-[#f3f3f3] text-sm tracking-tight transition-all duration-300 hover:border-white/50 hover:shadow-[0_0_18px_rgba(200,210,230,0.18)]"
          >
            <span className="relative z-10">The 4 Pillars (ELI5)</span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
          </a>

          <a
            href="#how-it-works"
            className="group relative inline-flex items-center justify-center h-10 px-4.5 rounded-[7px] overflow-hidden border border-white/20 bg-gradient-to-r from-[#050505] via-[#2a2a2a] to-[#4a4a4a] text-[#f3f3f3] text-sm tracking-tight transition-all duration-300 hover:border-white/50 hover:shadow-[0_0_18px_rgba(200,210,230,0.18)]"
          >
            <span className="relative z-10">How It Works</span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
          </a>

          <a
            href="#faqs"
            className="group relative inline-flex items-center justify-center h-10 px-4.5 rounded-[7px] overflow-hidden border border-white/20 bg-gradient-to-r from-[#050505] via-[#2a2a2a] to-[#4a4a4a] text-[#f3f3f3] text-sm tracking-tight transition-all duration-300 hover:border-white/50 hover:shadow-[0_0_18px_rgba(200,210,230,0.18)]"
          >
            <span className="relative z-10">FAQs</span>
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
          </a>
        </nav>

        <div className="justify-self-end flex items-center gap-3">
          <Link
            to="/login"
            className="btn-vesper-solid hidden sm:inline-flex items-center justify-center h-10 px-4.5 rounded-md text-[13.5px] font-medium tracking-tight whitespace-nowrap"
          >
            Sign In
          </Link>

          {/* Mobile Menu */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden flex flex-col justify-center items-center w-10 h-10 rounded-md border border-white/15 bg-black/60 gap-1.5 cursor-pointer"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            <span
              className={`w-4 h-[1.5px] bg-white rounded-full transition-transform duration-300 ${
                menuOpen ? "translate-y-[4.5px] rotate-45" : ""
              }`}
            />
            <span
              className={`w-4 h-[1.5px] bg-white rounded-full transition-opacity duration-200 ${
                menuOpen ? "opacity-0" : ""
              }`}
            />
            <span
              className={`w-4 h-[1.5px] bg-white rounded-full transition-transform duration-300 ${
                menuOpen ? "-translate-y-[4.5px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div className="fixed inset-0 z-45 md:hidden flex flex-col justify-center items-center gap-3 px-6 pt-24 pb-8 bg-black/90 backdrop-blur-2xl">
          <a
            href="#benefits"
            onClick={() => setMenuOpen(false)}
            className="w-full h-14 flex items-center justify-center rounded-xl border border-white/20 bg-gradient-to-r from-[#111] via-[#2a2a2a] to-[#444] text-lg font-medium"
          >
            The 4 Pillars (ELI5)
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMenuOpen(false)}
            className="w-full h-14 flex items-center justify-center rounded-xl border border-white/20 bg-gradient-to-r from-[#111] via-[#2a2a2a] to-[#444] text-lg font-medium"
          >
            How It Works
          </a>
          <a
            href="#faqs"
            onClick={() => setMenuOpen(false)}
            className="w-full h-14 flex items-center justify-center rounded-xl border border-white/20 bg-gradient-to-r from-[#111] via-[#2a2a2a] to-[#444] text-lg font-medium"
          >
            FAQs
          </a>
          <Link
            to="/login"
            onClick={() => setMenuOpen(false)}
            className="w-full h-14 mt-4 flex items-center justify-center rounded-xl bg-white text-black font-semibold text-lg"
          >
            Sign In / Start for Free
          </Link>
        </div>
      )}

      {/* Hero Fold */}
      <div className="relative z-10 grid grid-rows-[auto_1fr_auto] min-h-screen h-[100dvh] overflow-hidden" id="top">
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-black">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover block opacity-100"
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4"
          />
          <div className="absolute left-0 right-0 bottom-0 h-44 bg-gradient-to-b from-transparent to-black pointer-events-none" />
        </div>

        <div className="h-20" />

        <main className="relative z-10 flex items-end justify-center px-6 pb-14 md:pb-20 min-h-0">
          <div className="flex flex-col items-center text-center max-w-[900px] w-full">
            <div className="inline-flex items-center gap-2 mb-5 px-3.5 py-2 rounded-[5px] bg-gradient-to-r from-[#7d7d7d] via-[#2a2a2a] to-[#0a0a0a] text-[#f2f2f2] text-[12.5px] font-normal tracking-tight shadow-sm border border-white/10">
              <svg
                className="w-4.5 h-5 fill-white drop-shadow-[0_0_3px_rgba(255,255,255,0.45)]"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
              </svg>
              <span>Rump · Autonomous Working-Capital Defense</span>
            </div>

            <h1 className="flex flex-col items-center text-4xl sm:text-5xl md:text-[58px] lg:text-[66px] font-medium tracking-[-0.045em] leading-[1.08] text-white">
              <span className="block overflow-hidden py-[0.06em] px-[0.15em]">
                The{" "}
                <em className="font-serif-italic font-normal text-[1.1em] tracking-[-0.025em] text-[#d4d4d8] not-italic">
                  Ripple Simulator
                </em>
              </span>
              <span className="block overflow-hidden py-[0.06em] px-[0.15em]">
                that saves your cash.
              </span>
            </h1>

            <p className="max-w-[580px] mt-4.5 text-[#b0b0b5] text-base md:text-[16.5px] font-normal leading-[1.6] tracking-[-0.015em]">
              See how one late customer payment ripples through your entire business like falling dominoes—and fix cash crashes in 1 click before they ever happen.
            </p>

            <div className="flex flex-wrap justify-center gap-3 mt-7 w-full sm:w-auto">
              <Link
                to="/login"
                className="btn-vesper-solid flex items-center justify-center h-11 px-6 rounded-md text-sm font-medium tracking-tight w-full sm:w-auto"
              >
                Launch Ripple Simulator →
              </Link>
              <a
                href="#benefits"
                className="flex items-center justify-center h-11 px-6 rounded-md text-sm font-medium tracking-tight text-white border border-white/20 bg-white/[0.08] backdrop-blur-md hover:border-white/40 hover:bg-white/[0.14] hover:shadow-[0_0_24px_rgba(170,200,255,0.28)] transition-all duration-300 w-full sm:w-auto"
              >
                Read the 4 Pillars (ELI5) ↓
              </a>
            </div>
          </div>
        </main>

        <footer className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 px-6 md:px-12 lg:px-20 pb-6 text-[#d8d8d8] text-[13.5px] tracking-tight">
          <div className="inline-flex items-center gap-3">
            <span><strong>1. Ripple Simulator</strong> (Stress Test)</span>
          </div>
          <div className="inline-flex items-center gap-3">
            <span><strong>2. Auto-Phase POs</strong> (Bite-Sized Tranches)</span>
          </div>
          <div className="inline-flex items-center gap-3">
            <span><strong>3. Split-Escrow</strong> (Direct Supplier Lock)</span>
          </div>
          <div className="inline-flex items-center gap-3">
            <span><strong>4. Paise &amp; Chaos Guardrails</strong> (Zero Drift)</span>
          </div>
        </footer>
      </div>

      {/* Scrollable Canvas with Smooth White Circular Ambient Blurs */}
      <div className="relative z-10 bg-black overflow-hidden">
        {/* Alternating Smooth White Blur Orbs */}
        <div
          className="absolute w-[760px] h-[760px] rounded-full pointer-events-none -left-[240px] top-[120px] blur-[90px]"
          style={{
            background:
              "radial-gradient(circle, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.045) 42%, rgba(255, 255, 255, 0) 72%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute w-[820px] h-[820px] rounded-full pointer-events-none -right-[260px] top-[1100px] blur-[90px]"
          style={{
            background:
              "radial-gradient(circle, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.045) 42%, rgba(255, 255, 255, 0) 72%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute w-[700px] h-[700px] rounded-full pointer-events-none left-1/2 -translate-x-1/2 top-[2200px] blur-[90px]"
          style={{
            background:
              "radial-gradient(circle, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.045) 42%, rgba(255, 255, 255, 0) 72%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute w-[780px] h-[780px] rounded-full pointer-events-none -left-[220px] top-[3400px] blur-[90px]"
          style={{
            background:
              "radial-gradient(circle, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.045) 42%, rgba(255, 255, 255, 0) 72%)",
          }}
          aria-hidden="true"
        />
        <div
          className="absolute w-[740px] h-[740px] rounded-full pointer-events-none -right-[200px] bottom-[160px] blur-[90px]"
          style={{
            background:
              "radial-gradient(circle, rgba(255, 255, 255, 0.11) 0%, rgba(255, 255, 255, 0.045) 42%, rgba(255, 255, 255, 0) 72%)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 max-w-[1180px] mx-auto px-6 md:px-10 pb-36">

          {/* THE 4 PILLARS DEEP DIVE (ELI5 + SVG DIAGRAMS) */}
          <section className="pt-28 pb-10 border-t border-white/10 mt-16" id="benefits">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[5px] bg-gradient-to-r from-white/15 to-white/5 border border-white/20 text-xs font-semibold text-white tracking-wider uppercase mb-5">
              The 4 Core Pillars Explained Simply
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-medium tracking-tight leading-[1.13] text-white max-w-[820px]">
              How our{" "}
              <em className="font-serif-italic font-normal text-[#d4d4d8] not-italic">four unique superpowers</em> keep your cash safe.
            </h2>
            <p className="mt-4 text-[16.5px] leading-relaxed text-[#a6a6ad] max-w-[740px]">
              Every other financial tool waits until your bank balance hits zero to warn you. Rump combines four breakthrough pillars to simulate shocks, restructure bills, and guarantee mathematical precision.
            </p>

            <div className="flex flex-col gap-9 mt-10">

              {/* PILLAR 1: RIPPLE SIMULATOR */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center bg-gradient-to-b from-white/[0.038] to-white/[0.01] border border-white/14 rounded-2xl p-7 md:p-9 backdrop-blur-md">
                <div>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider text-white mb-3.5">
                    Pillar 01 · Shock &amp; Delay Simulator
                  </span>
                  <h3 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-3">
                    The Ripple Contagion Simulator
                  </h3>
                  <div className="bg-white/[0.04] border-l-4 border-white p-3.5 rounded-r-lg mb-3.5 text-sm md:text-[14.5px] leading-relaxed text-[#e4e4e7]">
                    <strong>🧸 Explain Like I’m 5:</strong> Imagine lining up dominoes. Before you flick the first one, Rump lets you slide a "What-If" bar to see exactly which toys will fall down next week—without actually breaking anything!
                  </div>
                  <p className="text-sm md:text-[14.5px] leading-relaxed text-[#9a9a9a]">
                    <strong>Real Business Mechanics:</strong> You drag interactive delay sliders (e.g., customer pays +12 days late) and Rump instantly recalculates 30 to 180 days of your cash flow, pointing out future shortfall breach dates with crisp red alert nodes.
                  </p>
                </div>
                <div className="bg-[#060608] border border-white/12 rounded-xl p-5">
                  <svg className="w-full h-auto block" viewBox="0 0 420 210" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="16" y="16" width="388" height="52" rx="8" fill="#111115" stroke="rgba(255,255,255,0.18)" />
                    <text x="32" y="38" fill="#ffffff" fontFamily="Inter" fontSize="11.5" fontWeight="600">
                      Slider: Customer Payment Delay (+12 Days)
                    </text>
                    <line x1="32" y1="52" x2="370" y2="52" stroke="rgba(255,255,255,0.2)" strokeWidth="4" strokeLinecap="round" />
                    <line x1="32" y1="52" x2="260" y2="52" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
                    <circle cx="260" cy="52" r="8" fill="#ffffff" />

                    <rect x="20" y="96" width="110" height="90" rx="8" fill="#17171c" stroke="rgba(255,255,255,0.25)" />
                    <text x="32" y="122" fill="#9a9a9a" fontFamily="Inter" fontSize="10">STEP 1</text>
                    <text x="32" y="142" fill="#ffffff" fontFamily="Inter" fontSize="12" fontWeight="600">Invoice Late</text>
                    <text x="32" y="162" fill="#fca5a5" fontFamily="Inter" fontSize="11">+12 Days Delay</text>

                    <path d="M130 140 L155 140" stroke="#ef4444" strokeWidth="2" />

                    <rect x="155" y="96" width="110" height="90" rx="8" fill="#1c0d10" stroke="#ef4444" />
                    <text x="167" y="122" fill="#fca5a5" fontFamily="Inter" fontSize="10">STEP 2</text>
                    <text x="167" y="142" fill="#ffffff" fontFamily="Inter" fontSize="12" fontWeight="600">Cash Dip</text>
                    <text x="167" y="162" fill="#fca5a5" fontFamily="Inter" fontSize="11">Day 14 Breach</text>

                    <path d="M265 140 L290 140" stroke="#ef4444" strokeWidth="2" />

                    <rect x="290" y="96" width="114" height="90" rx="8" fill="#240b0f" stroke="#ef4444" />
                    <text x="302" y="122" fill="#fca5a5" fontFamily="Inter" fontSize="10">STEP 3</text>
                    <text x="302" y="142" fill="#ffffff" fontFamily="Inter" fontSize="12" fontWeight="600">Supplier Stop</text>
                    <text x="302" y="162" fill="#fca5a5" fontFamily="Inter" fontSize="11">Stock Halted</text>
                  </svg>
                </div>
              </div>

              {/* PILLAR 2: AUTO-PHASE PO TRANCHES */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center bg-gradient-to-b from-white/[0.038] to-white/[0.01] border border-white/14 rounded-2xl p-7 md:p-9 backdrop-blur-md">
                <div>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider text-white mb-3.5">
                    Pillar 02 · Bite-Sized Deliveries
                  </span>
                  <h3 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-3">
                    Auto-Phase Purchase Order Tranches
                  </h3>
                  <div className="bg-white/[0.04] border-l-4 border-white p-3.5 rounded-r-lg mb-3.5 text-sm md:text-[14.5px] leading-relaxed text-[#e4e4e7]">
                    <strong>🧸 Explain Like I’m 5:</strong> Trying to swallow a giant pizza in one bite makes you choke! Instead, Rump cuts the giant pizza into <strong>3 small slices</strong> so you only pay for one slice at a time as you eat it.
                  </div>
                  <p className="text-sm md:text-[14.5px] leading-relaxed text-[#9a9a9a]">
                    <strong>Real Business Mechanics:</strong> When a bulky upfront inventory Purchase Order would crash your safety threshold, Auto-Phase restructures the order into 3 staggered delivery tranches (e.g. Day 1, Day 12, Day 24) aligned with your incoming customer cash.
                  </p>
                </div>
                <div className="bg-[#060608] border border-white/12 rounded-xl p-5">
                  <svg className="w-full h-auto block" viewBox="0 0 420 210" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="24" width="380" height="60" rx="8" fill="#220a0e" stroke="#ef4444" />
                    <text x="36" y="48" fill="#fca5a5" fontFamily="Inter" fontSize="11" fontWeight="600">BEFORE: 1 GIANT BILL (CRASHES CASH)</text>
                    <text x="36" y="68" fill="#ffffff" fontFamily="Inter" fontSize="14" fontWeight="700">₹3,00,000 Due Day 1 ❌</text>

                    <rect x="20" y="106" width="380" height="84" rx="8" fill="#071a12" stroke="#10b981" />
                    <text x="36" y="128" fill="#6ee7b7" fontFamily="Inter" fontSize="11" fontWeight="600">AFTER: RUMP AUTO-PHASE (SAFE)</text>
                    <text x="36" y="150" fill="#ffffff" fontFamily="Inter" fontSize="12">Tranche 1: ₹1.0L (Day 1) | Tranche 2: ₹1.0L (Day 12)</text>
                    <text x="36" y="170" fill="#ffffff" fontFamily="Inter" fontSize="12">Tranche 3: ₹1.0L (Day 24) ✓</text>
                  </svg>
                </div>
              </div>

              {/* PILLAR 3: TRI-PARTY SPLIT-ESCROW */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center bg-gradient-to-b from-white/[0.038] to-white/[0.01] border border-white/14 rounded-2xl p-7 md:p-9 backdrop-blur-md">
                <div>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider text-white mb-3.5">
                    Pillar 03 · Direct Supplier Lock
                  </span>
                  <h3 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-3">
                    Tri-Party Split-Escrow
                  </h3>
                  <div className="bg-white/[0.04] border-l-4 border-white p-3.5 rounded-r-lg mb-3.5 text-sm md:text-[14.5px] leading-relaxed text-[#e4e4e7]">
                    <strong>🧸 Explain Like I’m 5:</strong> Imagine you owe your supplier money, but your customer hasn’t paid you yet. Split-Escrow is like having a helpful referee: the moment your customer pays, the referee automatically hands your supplier their exact share so shipments never stop!
                  </div>
                  <p className="text-sm md:text-[14.5px] leading-relaxed text-[#9a9a9a]">
                    <strong>Real Business Mechanics:</strong> Split-Escrow establishes a legally binding tri-party payment pipe linking your delayed customer receivable directly to your upstream supplier payable, routing committed settlement fractions instantly.
                  </p>
                </div>
                <div className="bg-[#060608] border border-white/12 rounded-xl p-5">
                  <svg className="w-full h-auto block" viewBox="0 0 420 210" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="30" width="100" height="150" rx="10" fill="#121216" stroke="rgba(255,255,255,0.2)" />
                    <text x="42" y="65" fill="#ffffff" fontFamily="Inter" fontSize="12" fontWeight="600">Customer</text>
                    <text x="42" y="90" fill="#9a9a9a" fontFamily="Inter" fontSize="11">Pays Invoice</text>

                    <path d="M125 105 L175 105" stroke="#3b82f6" strokeWidth="2.5" />
                    <polygon points="175,100 185,105 175,110" fill="#3b82f6" />

                    <rect x="185" y="30" width="100" height="150" rx="10" fill="#0c1724" stroke="#3b82f6" />
                    <text x="210" y="65" fill="#93c5fd" fontFamily="Inter" fontSize="12" fontWeight="600">Split-</text>
                    <text x="204" y="85" fill="#93c5fd" fontFamily="Inter" fontSize="12" fontWeight="600">Escrow</text>

                    <path d="M290 80 L320 60" stroke="#10b981" strokeWidth="2" />
                    <path d="M290 130 L320 150" stroke="#10b981" strokeWidth="2" />

                    <rect x="320" y="30" width="80" height="60" rx="8" fill="#071912" stroke="#10b981" />
                    <text x="332" y="65" fill="#6ee7b7" fontFamily="Inter" fontSize="11" fontWeight="600">Supplier</text>

                    <rect x="320" y="120" width="80" height="60" rx="8" fill="#14141c" stroke="rgba(255,255,255,0.2)" />
                    <text x="332" y="155" fill="#ffffff" fontFamily="Inter" fontSize="11" fontWeight="600">Your Bank</text>
                  </svg>
                </div>
              </div>

              {/* PILLAR 4: EXACT PAISE & CHAOS GUARDRAILS */}
              <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] gap-8 items-center bg-gradient-to-b from-white/[0.038] to-white/[0.01] border border-white/14 rounded-2xl p-7 md:p-9 backdrop-blur-md">
                <div>
                  <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-semibold uppercase tracking-wider text-white mb-3.5">
                    Pillar 04 · Mathematical Perfection
                  </span>
                  <h3 className="text-2xl md:text-3xl font-medium tracking-tight text-white mb-3">
                    Exact Integer-Paise &amp; Chaos Guardrails
                  </h3>
                  <div className="bg-white/[0.04] border-l-4 border-white p-3.5 rounded-r-lg mb-3.5 text-sm md:text-[14.5px] leading-relaxed text-[#e4e4e7]">
                    <strong>🧸 Explain Like I’m 5:</strong> Instead of guessing how many coins are in your jar, Rump counts every single coin down to the tiniest <strong>1 Paisa</strong>—and puts a locked ceiling and floor on your jar so nobody can ever type a fake number that breaks your math.
                  </div>
                  <p className="text-sm md:text-[14.5px] leading-relaxed text-[#9a9a9a]">
                    <strong>Real Business Mechanics:</strong> Standard computers make floating-point rounding drifts over 30 days. Rump stores every rupee strictly as whole <strong>Integer Paise</strong> (`1 ₹ = 100 Paise`) with strict server-side validation bounds preventing upper-bound corruption.
                  </p>
                </div>
                <div className="bg-[#060608] border border-white/12 rounded-xl p-5">
                  <svg className="w-full h-auto block" viewBox="0 0 420 210" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="20" y="24" width="380" height="72" rx="8" fill="#180b0d" stroke="rgba(239,68,68,0.4)" />
                    <text x="36" y="50" fill="#fca5a5" fontFamily="Inter" fontSize="11" fontWeight="600">NORMAL FLOAT MATH (DRIFTS)</text>
                    <text x="36" y="76" fill="#ffffff" fontFamily="monospace" fontSize="13">₹14,250.333333333336 ❌</text>

                    <rect x="20" y="114" width="380" height="74" rx="8" fill="#071912" stroke="#10b981" />
                    <text x="36" y="138" fill="#6ee7b7" fontFamily="Inter" fontSize="11" fontWeight="600">RUMP INTEGER-PAISE ENGINE</text>
                    <text x="36" y="164" fill="#ffffff" fontFamily="monospace" fontSize="13">1425033 Paise === ₹14,250.33 ✓</text>
                  </svg>
                </div>
              </div>

            </div>
          </section>

          {/* How It Works Section */}
          <section className="pt-28 pb-10 border-t border-white/10 mt-16" id="how-it-works">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[5px] bg-gradient-to-r from-white/15 to-white/5 border border-white/20 text-xs font-semibold text-white tracking-wider uppercase mb-5">
              How It Works
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-medium tracking-tight leading-[1.13] text-white max-w-[820px]">
              Three simple steps to{" "}
              <em className="font-serif-italic font-normal text-[#d4d4d8] not-italic">complete financial calm</em>.
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-9">
              <div className="bg-white/[0.025] border border-white/12 rounded-2xl p-7">
                <div className="w-[34px] h-[34px] rounded-lg bg-white text-black font-bold flex items-center justify-center text-sm mb-4">
                  1
                </div>
                <h3 className="text-xl font-medium text-white mb-2.5">Sync Ledgers &amp; Safety Floor</h3>
                <p className="text-sm md:text-[14.5px] leading-relaxed text-[#a0a0a8]">
                  Input your opening cash, safety threshold floor, customer invoices, and supplier purchase orders.
                </p>
              </div>
              <div className="bg-white/[0.025] border border-white/12 rounded-2xl p-7">
                <div className="w-[34px] h-[34px] rounded-lg bg-white text-black font-bold flex items-center justify-center text-sm mb-4">
                  2
                </div>
                <h3 className="text-xl font-medium text-white mb-2.5">Stress-Test in Ripple Simulator</h3>
                <p className="text-sm md:text-[14.5px] leading-relaxed text-[#a0a0a8]">
                  Drag delay sliders to test customer payment friction and pinpoint future cash troughs before they hit.
                </p>
              </div>
              <div className="bg-white/[0.025] border border-white/12 rounded-2xl p-7">
                <div className="w-[34px] h-[34px] rounded-lg bg-white text-black font-bold flex items-center justify-center text-sm mb-4">
                  3
                </div>
                <h3 className="text-xl font-medium text-white mb-2.5">Deploy 1-Click Rescues</h3>
                <p className="text-sm md:text-[14.5px] leading-relaxed text-[#a0a0a8]">
                  Execute Auto-Phase tranches or Split-Escrow locks to safeguard your working capital permanently.
                </p>
              </div>
            </div>
          </section>

          {/* FAQs */}
          <section className="pt-28 pb-10 border-t border-white/10 mt-16" id="faqs">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[5px] bg-gradient-to-r from-white/15 to-white/5 border border-white/20 text-xs font-semibold text-white tracking-wider uppercase mb-5">
              FAQs
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-[46px] font-medium tracking-tight leading-[1.13] text-white max-w-[820px]">
              Frequently asked <em className="font-serif-italic font-normal text-[#d4d4d8] not-italic">questions</em>.
            </h2>
            <div className="flex flex-col gap-3.5 mt-9">
              <details className="bg-white/[0.025] border border-white/12 rounded-xl p-5 md:p-6 open:bg-white/[0.045] open:border-white/25" open>
                <summary className="list-none cursor-pointer flex items-center justify-between gap-4 text-base md:text-lg font-medium text-white tracking-tight">
                  <span>What makes the Ripple Simulator different from normal forecasting?</span>
                  <span className="text-lg text-[#b5b5b5]">+</span>
                </summary>
                <div className="mt-3.5 pt-3.5 border-t border-white/10 text-sm md:text-[15px] leading-relaxed text-[#b0b0b8]">
                  Traditional tools only show past data. The Ripple Simulator lets you interactively slide customer delay variables to stress-test your supply chain and trigger autonomous rescues before a shortfall occurs.
                </div>
              </details>
              <details className="bg-white/[0.025] border border-white/12 rounded-xl p-5 md:p-6 open:bg-white/[0.045] open:border-white/25">
                <summary className="list-none cursor-pointer flex items-center justify-between gap-4 text-base md:text-lg font-medium text-white tracking-tight">
                  <span>How does Auto-Phase prevent cash crunches?</span>
                  <span className="text-lg text-[#b5b5b5]">+</span>
                </summary>
                <div className="mt-3.5 pt-3.5 border-t border-white/10 text-sm md:text-[15px] leading-relaxed text-[#b0b0b8]">
                  It takes large single-day inventory bills that would breach your safety threshold and automatically divides them into 3 staggered delivery tranches aligned with your incoming cash collections.
                </div>
              </details>
            </div>

            <div className="mt-24 rounded-2xl border border-white/20 bg-gradient-to-br from-white/10 via-[#0a0a0c] to-black p-10 md:p-16 text-center flex flex-col items-center">
              <h2 className="text-3xl md:text-4xl font-medium tracking-tight mb-3.5">
                Ready to test the{" "}
                <em className="font-serif-italic font-normal text-[#d4d4d8] not-italic">Ripple Simulator</em>?
              </h2>
              <p className="text-[#a6a6ad] max-w-[540px] text-base leading-relaxed mb-7">
                Sign in instantly with demo credentials or create your business workspace.
              </p>
              <Link
                to="/login"
                className="btn-vesper-solid inline-flex items-center justify-center h-12 px-7 rounded-md font-medium text-sm"
              >
                Enter Rump Workspace →
              </Link>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
