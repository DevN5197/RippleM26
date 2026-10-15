import React from "react";

/**
 * Pure Kinetic Motion Panel for Sign-In & Onboarding.
 * Enlarged visual scale, high-speed dynamic orbital flows, and pure geometric shapes.
 * Displays zero text elements — exclusively kinetic geometric structures.
 */
export function AuthVisualPanel() {
  return (
    <div className="relative hidden lg:flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 p-8 text-white lg:w-[55%] select-none">
      {/* Dynamic ambient color blooms */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-[500px] w-[500px] rounded-full bg-primary/25 blur-3xl animate-pulse" style={{ animationDuration: "3s" }} />
      <div className="pointer-events-none absolute -bottom-28 -right-28 h-[500px] w-[500px] rounded-full bg-indigo-500/25 blur-3xl animate-pulse" style={{ animationDuration: "2.5s" }} />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[420px] rounded-full bg-purple-500/20 blur-3xl animate-pulse" style={{ animationDuration: "2s" }} />

      {/* Cybernetic geometric coordinate grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Enlarged, Central Kinetic Geometric Stage */}
      <div className="relative z-10 w-full max-w-2xl aspect-square flex items-center justify-center p-4">
        <svg
          viewBox="0 0 600 600"
          className="w-full h-full drop-shadow-[0_0_35px_rgba(99,102,241,0.35)]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Vibrant Multi-Stop Linear & Radial Gradients */}
            <linearGradient id="laserGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#c084fc" />
            </linearGradient>

            <linearGradient id="laserGrad2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#38bdf8" />
              <stop offset="100%" stopColor="#818cf8" />
            </linearGradient>

            <linearGradient id="laserGrad3" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="50%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>

            <radialGradient id="coreGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#818cf8" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="nodeGlowCyan" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#0284c7" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="nodeGlowEmerald" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#059669" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0" />
            </radialGradient>

            <radialGradient id="nodeGlowViolet" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
              <stop offset="60%" stopColor="#7c3aed" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </radialGradient>

            <filter id="neonBlur" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="intenseGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="10" result="blur1" />
              <feGaussianBlur stdDeviation="4" result="blur2" />
              <feMerge>
                <feMergeNode in="blur1" />
                <feMergeNode in="blur2" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Path Curves for Particle Kinetic Motion */}
            {/* Top-Left (140, 180) to Top-Right (460, 180) */}
            <path id="path12" d="M 140 180 C 220 70, 380 70, 460 180" fill="none" />
            {/* Top-Right (460, 180) to Bottom-Center (300, 450) */}
            <path id="path23" d="M 460 180 C 490 320, 410 430, 300 450" fill="none" />
            {/* Bottom-Center (300, 450) to Top-Left (140, 180) */}
            <path id="path31" d="M 300 450 C 190 430, 110 320, 140 180" fill="none" />

            {/* Gradient for simulated shortfall drag area */}
            <linearGradient id="shortfallAreaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* ── Ripple Simulator Graph Lines & Network Dynamics in Partial Background ── */}
          <g className="simulator-bg-graph" opacity="0.48">
            {/* 1. Coordinate Grid & Timeline Bars */}
            <g stroke="#818cf8" strokeOpacity="0.14" strokeWidth="1">
              <line x1="80" y1="90" x2="80" y2="510" strokeDasharray="3 5" />
              <line x1="160" y1="90" x2="160" y2="510" strokeDasharray="3 5" />
              <line x1="240" y1="90" x2="240" y2="510" strokeDasharray="3 5" />
              <line x1="320" y1="90" x2="320" y2="510" strokeDasharray="3 5" />
              <line x1="400" y1="90" x2="400" y2="510" strokeDasharray="3 5" />
              <line x1="480" y1="90" x2="480" y2="510" strokeDasharray="3 5" />

              <line x1="60" y1="160" x2="540" y2="160" strokeDasharray="4 6" />
              <line x1="60" y1="240" x2="540" y2="240" strokeDasharray="4 6" />
              <line x1="60" y1="340" x2="540" y2="340" strokeDasharray="4 6" />
              <line x1="60" y1="420" x2="540" y2="420" strokeDasharray="4 6" />
            </g>

            {/* 2. Stepped Financial Volume Histogram Bars in Background */}
            <g fill="#6366f1" fillOpacity="0.08">
              <rect x="95" y="310" width="22" height="110" rx="3" />
              <rect x="145" y="270" width="22" height="150" rx="3" />
              <rect x="195" y="290" width="22" height="130" rx="3" />
              <rect x="275" y="380" width="22" height="70" rx="3" fill="#f43f5e" fillOpacity="0.16" />
              <rect x="325" y="395" width="22" height="85" rx="3" fill="#f43f5e" fillOpacity="0.22" />
              <rect x="375" y="340" width="22" height="100" rx="3" />
              <rect x="425" y="250" width="22" height="170" rx="3" fill="#34d399" fillOpacity="0.16" />
              <rect x="475" y="220" width="22" height="200" rx="3" fill="#34d399" fillOpacity="0.18" />
            </g>

            {/* 3. Safety Buffer Reserve Threshold Line (Dashed Warning Red) */}
            <g>
              <line
                x1="60"
                y1="340"
                x2="540"
                y2="340"
                stroke="#f43f5e"
                strokeWidth="2"
                strokeDasharray="8 6"
                strokeOpacity="0.65"
                filter="url(#neonBlur)"
                className="animate-pulse"
                style={{ animationDuration: "2.5s" }}
              />
              <polygon points="536,336 544,340 536,344" fill="#f43f5e" opacity="0.8" />
            </g>

            {/* 4. Ripple Shortfall Area Gradient Fill under the Curve */}
            <path
              d="M 180 340 L 220 340 C 260 340, 280 440, 330 440 C 370 440, 390 370, 420 340 Z"
              fill="url(#shortfallAreaGrad)"
              opacity="0.32"
            />

            {/* 5. Ripple Simulator Cash Curve: Unrescued Contagion Dip (Red/Amber Curve) */}
            <path
              d="M 70 240 C 130 240, 170 270, 210 320 C 250 370, 280 445, 330 445 C 380 445, 410 370, 460 320 C 500 275, 520 280, 540 280"
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.5"
              strokeOpacity="0.6"
              strokeDasharray="6 3"
            />

            {/* 6. Ripple Simulator Rescued Cash Recovery Curve (Emerald/Cyan Protected Spline) */}
            <path
              d="M 210 320 C 240 290, 270 230, 320 215 C 370 200, 430 220, 480 190 C 510 170, 530 180, 540 180"
              fill="none"
              stroke="#34d399"
              strokeWidth="3"
              strokeOpacity="0.75"
              strokeLinecap="round"
              filter="url(#neonBlur)"
              className="animate-[pulse_2s_ease-in-out_infinite]"
            />

            {/* 7. Concentric Ripple Contagion Wave Arcs emanating from Keystone Bottleneck Node */}
            <g transform="translate(460, 320)">
              <circle r="18" fill="none" stroke="#f43f5e" strokeWidth="1.5" opacity="0.8">
                <animate attributeName="r" values="10;70" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle r="18" fill="none" stroke="#fb923c" strokeWidth="1.2" opacity="0.8">
                <animate attributeName="r" values="10;70" begin="0.66s" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0" begin="0.66s" dur="2s" repeatCount="indefinite" />
              </circle>
              <circle r="18" fill="none" stroke="#e11d48" strokeWidth="1" opacity="0.8">
                <animate attributeName="r" values="10;70" begin="1.33s" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.8;0" begin="1.33s" dur="2s" repeatCount="indefinite" />
              </circle>
            </g>

            {/* 8. Inter-Tier Directed Graph Edges with Chevrons (Supplier -> Keystone -> Customer) */}
            <g stroke="#38bdf8" strokeOpacity="0.35" strokeWidth="1.5">
              <line x1="140" y1="180" x2="300" y2="275" strokeDasharray="4 4" />
              <line x1="300" y1="275" x2="460" y2="180" strokeDasharray="4 4" />
              <path d="M 460 210 Q 300 370 140 210" fill="none" stroke="#c084fc" strokeOpacity="0.3" strokeDasharray="5 5" />
            </g>

            {/* 9. Inflection & Rescue Markers on Graph */}
            <circle cx="210" cy="320" r="5" fill="#f43f5e" filter="url(#intenseGlow)" />
            <circle cx="330" cy="445" r="5.5" fill="#f43f5e" filter="url(#intenseGlow)" className="animate-ping" style={{ animationDuration: "1.8s" }} />
            <circle cx="320" cy="215" r="5.5" fill="#34d399" filter="url(#intenseGlow)" className="animate-ping" style={{ animationDuration: "1.8s" }} />
            <circle cx="480" cy="190" r="5" fill="#34d399" filter="url(#neonBlur)" />
          </g>

          {/* ── Outer Gyroscopic Rotating Rings (Enlarged & Fast) ── */}
          <g transform="translate(300, 300)">
            {/* Outer perimeter dashed halo - fast clockwise rotation (8s) */}
            <circle
              r="260"
              fill="none"
              stroke="#6366f1"
              strokeWidth="1.5"
              strokeDasharray="4 12"
              strokeOpacity="0.4"
              className="animate-[spin_8s_linear_infinite]"
            />
            {/* Mid orbital tick-ring - fast counter-clockwise rotation (5s) */}
            <circle
              r="220"
              fill="none"
              stroke="#38bdf8"
              strokeWidth="1.5"
              strokeDasharray="8 16"
              strokeOpacity="0.35"
              style={{ animation: "spin 5s linear infinite reverse" }}
            />
            {/* Inner concentric boundary ring */}
            <circle
              r="170"
              fill="none"
              stroke="#818cf8"
              strokeWidth="1"
              strokeDasharray="2 6"
              strokeOpacity="0.25"
              className="animate-[spin_10s_linear_infinite]"
            />

            {/* Tilted elliptical dynamic gyroscopes */}
            <g transform="rotate(35)">
              <ellipse
                rx="250"
                ry="110"
                fill="none"
                stroke="url(#laserGrad1)"
                strokeWidth="1.5"
                strokeDasharray="14 10"
                strokeOpacity="0.4"
                className="animate-[spin_6s_linear_infinite]"
              />
            </g>
            <g transform="rotate(-35)">
              <ellipse
                rx="250"
                ry="110"
                fill="none"
                stroke="url(#laserGrad2)"
                strokeWidth="1.5"
                strokeDasharray="14 10"
                strokeOpacity="0.4"
                style={{ animation: "spin 6s linear infinite reverse" }}
              />
            </g>
          </g>

          {/* ── Fast Glowing Kinetic Spline Conduits ── */}
          <g filter="url(#neonBlur)">
            {/* Static background glow conduits */}
            <use href="#path12" stroke="url(#laserGrad1)" strokeWidth="3" strokeOpacity="0.35" />
            <use href="#path23" stroke="url(#laserGrad2)" strokeWidth="3" strokeOpacity="0.35" />
            <use href="#path31" stroke="url(#laserGrad3)" strokeWidth="3" strokeOpacity="0.35" />

            {/* Fast-flowing dashed laser pulses (cycling smoothly) */}
            <use
              href="#path12"
              stroke="#38bdf8"
              strokeWidth="3.5"
              strokeDasharray="28 80"
              strokeLinecap="round"
              className="animate-[pulse_1s_ease-in-out_infinite]"
            >
              <animate attributeName="stroke-dashoffset" from="108" to="0" dur="1.2s" repeatCount="indefinite" />
            </use>

            <use
              href="#path23"
              stroke="#34d399"
              strokeWidth="3.5"
              strokeDasharray="28 80"
              strokeLinecap="round"
              className="animate-[pulse_1s_ease-in-out_infinite]"
            >
              <animate attributeName="stroke-dashoffset" from="108" to="0" dur="1.2s" repeatCount="indefinite" />
            </use>

            <use
              href="#path31"
              stroke="#f43f5e"
              strokeWidth="3.5"
              strokeDasharray="28 80"
              strokeLinecap="round"
              className="animate-[pulse_1s_ease-in-out_infinite]"
            >
              <animate attributeName="stroke-dashoffset" from="108" to="0" dur="1.2s" repeatCount="indefinite" />
            </use>
          </g>

          {/* ── High-Speed Flying Photons / Particles along Loop ── */}
          {/* Path 1 -> 2: High velocity cyan particles */}
          <circle r="6" fill="#38bdf8" filter="url(#intenseGlow)">
            <animateMotion dur="1.3s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1">
              <mpath href="#path12" />
            </animateMotion>
          </circle>
          <circle r="3.5" fill="#ffffff">
            <animateMotion dur="1.3s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1">
              <mpath href="#path12" />
            </animateMotion>
          </circle>
          <circle r="4.5" fill="#818cf8" filter="url(#neonBlur)">
            <animateMotion dur="1.3s" begin="0.65s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1">
              <mpath href="#path12" />
            </animateMotion>
          </circle>

          {/* Path 2 -> 3: High velocity emerald particles */}
          <circle r="6" fill="#34d399" filter="url(#intenseGlow)">
            <animateMotion dur="1.3s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1">
              <mpath href="#path23" />
            </animateMotion>
          </circle>
          <circle r="3.5" fill="#ffffff">
            <animateMotion dur="1.3s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1">
              <mpath href="#path23" />
            </animateMotion>
          </circle>
          <circle r="4.5" fill="#38bdf8" filter="url(#neonBlur)">
            <animateMotion dur="1.3s" begin="0.65s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1">
              <mpath href="#path23" />
            </animateMotion>
          </circle>

          {/* Path 3 -> 1: High velocity violet particles */}
          <circle r="6" fill="#f43f5e" filter="url(#intenseGlow)">
            <animateMotion dur="1.3s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1">
              <mpath href="#path31" />
            </animateMotion>
          </circle>
          <circle r="3.5" fill="#ffffff">
            <animateMotion dur="1.3s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1">
              <mpath href="#path31" />
            </animateMotion>
          </circle>
          <circle r="4.5" fill="#c084fc" filter="url(#neonBlur)">
            <animateMotion dur="1.3s" begin="0.65s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1">
              <mpath href="#path31" />
            </animateMotion>
          </circle>

          {/* ── Center Cosmic Harmonic Resonance Core (300, 275) ── */}
          <g transform="translate(300, 275)">
            <circle r="75" fill="url(#coreGlow)" />
            {/* Concentric high-speed shockwaves radiating outward */}
            <circle r="35" fill="none" stroke="#6366f1" strokeWidth="2" opacity="0.8">
              <animate attributeName="r" values="30;85" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0" dur="1.5s" repeatCount="indefinite" />
            </circle>
            <circle r="35" fill="none" stroke="#38bdf8" strokeWidth="1.5" opacity="0.8">
              <animate attributeName="r" values="30;85" begin="0.75s" dur="1.5s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0" begin="0.75s" dur="1.5s" repeatCount="indefinite" />
            </circle>

            {/* Central rotating geometric crystal octagon */}
            <polygon
              points="0,-22 15,-15 22,0 15,15 0,22 -15,15 -22,0 -15,-15"
              fill="rgba(99, 102, 241, 0.4)"
              stroke="#818cf8"
              strokeWidth="2"
              filter="url(#neonBlur)"
              className="animate-[spin_4s_linear_infinite]"
            />
            <polygon
              points="0,-12 8,-8 12,0 8,8 0,12 -8,8 -12,0 -8,-8"
              fill="#ffffff"
              filter="url(#intenseGlow)"
              style={{ animation: "spin 2.5s linear infinite reverse" }}
            />
          </g>

          {/* ── Geometric Node 1: Top-Left Diamond (140, 180) ── */}
          <g transform="translate(140, 180)">
            {/* Radial glow field */}
            <circle r="55" fill="url(#nodeGlowCyan)" />
            {/* Pulsing beacon rings */}
            <circle r="42" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="6 6" className="animate-[spin_4s_linear_infinite]" />
            <circle r="32" fill="none" stroke="#38bdf8" strokeWidth="2" opacity="0.7">
              <animate attributeName="r" values="24;46" dur="1.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="1.2s" repeatCount="indefinite" />
            </circle>

            {/* Central rotating diamond shape */}
            <rect
              x="-18"
              y="-18"
              width="36"
              height="36"
              rx="4"
              transform="rotate(45)"
              fill="#0f172a"
              stroke="#38bdf8"
              strokeWidth="2.5"
              filter="url(#neonBlur)"
            />
            {/* Inner spinning diamond */}
            <rect
              x="-10"
              y="-10"
              width="20"
              height="20"
              rx="2"
              transform="rotate(45)"
              fill="#38bdf8"
              className="animate-[pulse_1s_ease-in-out_infinite]"
            />
            <circle r="4" fill="#ffffff" filter="url(#intenseGlow)" />
          </g>

          {/* ── Geometric Node 2: Top-Right Hexagon (460, 180) ── */}
          <g transform="translate(460, 180)">
            {/* Radial glow field */}
            <circle r="55" fill="url(#nodeGlowEmerald)" />
            {/* Pulsing beacon rings */}
            <circle r="42" fill="none" stroke="#34d399" strokeWidth="1.5" strokeDasharray="6 6" style={{ animation: "spin 4s linear infinite reverse" }} />
            <circle r="32" fill="none" stroke="#34d399" strokeWidth="2" opacity="0.7">
              <animate attributeName="r" values="24;46" dur="1.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="1.2s" repeatCount="indefinite" />
            </circle>

            {/* Central rotating regular hexagon */}
            <polygon
              points="0,-24 20.8,-12 20.8,12 0,24 -20.8,12 -20.8,-12"
              fill="#0f172a"
              stroke="#34d399"
              strokeWidth="2.5"
              filter="url(#neonBlur)"
              className="animate-[spin_5s_linear_infinite]"
            />
            {/* Inner spinning triangle */}
            <polygon
              points="0,-12 10.4,6 -10.4,6"
              fill="#34d399"
              style={{ animation: "spin 2.5s linear infinite reverse" }}
            />
            <circle r="4" fill="#ffffff" filter="url(#intenseGlow)" />
          </g>

          {/* ── Geometric Node 3: Bottom-Center Dodecagon (300, 450) ── */}
          <g transform="translate(300, 450)">
            {/* Radial glow field */}
            <circle r="60" fill="url(#nodeGlowViolet)" />
            {/* Dual rotating dashed rings */}
            <circle r="46" fill="none" stroke="#c084fc" strokeWidth="1.5" strokeDasharray="8 6" className="animate-[spin_3.5s_linear_infinite]" />
            <circle r="36" fill="none" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 4" style={{ animation: "spin 3.5s linear infinite reverse" }} />
            <circle r="32" fill="none" stroke="#c084fc" strokeWidth="2" opacity="0.7">
              <animate attributeName="r" values="24;52" dur="1.2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="1.2s" repeatCount="indefinite" />
            </circle>

            {/* Double nested diamond-squares */}
            <rect
              x="-22"
              y="-22"
              width="44"
              height="44"
              rx="6"
              fill="#0f172a"
              stroke="#c084fc"
              strokeWidth="2.5"
              filter="url(#neonBlur)"
              className="animate-[spin_6s_linear_infinite]"
            />
            <rect
              x="-16"
              y="-16"
              width="32"
              height="32"
              rx="4"
              transform="rotate(45)"
              fill="rgba(192, 132, 252, 0.3)"
              stroke="#f43f5e"
              strokeWidth="2"
              style={{ animation: "spin 3s linear infinite reverse" }}
            />
            <circle r="5" fill="#ffffff" filter="url(#intenseGlow)" />
          </g>

          {/* ── Dynamic Ambient Floating Geometric Fragments ── */}
          <g opacity="0.6">
            {/* Small floating rhombuses with high-speed pulse */}
            <rect x="220" y="110" width="10" height="10" rx="1.5" transform="rotate(45 225 115)" fill="#38bdf8" className="animate-pulse" style={{ animationDuration: "1.2s" }} />
            <rect x="375" y="110" width="10" height="10" rx="1.5" transform="rotate(45 380 115)" fill="#818cf8" className="animate-pulse" style={{ animationDuration: "1.5s" }} />
            <rect x="495" y="280" width="8" height="8" rx="1" transform="rotate(45 499 284)" fill="#34d399" className="animate-pulse" style={{ animationDuration: "1.1s" }} />
            <rect x="95" y="280" width="8" height="8" rx="1" transform="rotate(45 99 284)" fill="#c084fc" className="animate-pulse" style={{ animationDuration: "1.3s" }} />
            <rect x="230" y="470" width="10" height="10" rx="1.5" transform="rotate(45 235 475)" fill="#f43f5e" className="animate-pulse" style={{ animationDuration: "1.4s" }} />
            <rect x="365" y="470" width="10" height="10" rx="1.5" transform="rotate(45 370 475)" fill="#38bdf8" className="animate-pulse" style={{ animationDuration: "1.2s" }} />
          </g>
        </svg>
      </div>
    </div>
  );
}
