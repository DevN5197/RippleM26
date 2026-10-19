import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { FlaskConical, BookOpen, AlertTriangle } from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { SimulatorControlPanel } from "@/components/simulator/simulator-controls";
import { SimulatorChart, type ChartView } from "@/components/simulator/simulator-chart";
import {
  SimulatorResults,
  SimulatorEmptyState,
  SimulatorErrorState,
  SimulatorEventTimeline,
} from "@/components/simulator/simulator-results";
import { SimulatorTrueMarginCard } from "@/components/simulator/simulator-true-margin";
import {
  AutoPhaseDialog,
  SplitEscrowDialog,
  NodeInspectionDialog,
} from "@/components/simulator/simulator-rescues";
import {
  simulatorApi,
  type SimulatorControls,
  type SimulatorResult,
} from "@/lib/api/simulationApi";
import type {
  SimulatorTimelineNode,
  AutoPhasePreview,
  SplitEscrowPreview,
  ChaosStressTestResult,
} from "@/types";

import {
  simulatorStore,
  DEFAULT_CONTROLS,
  FLAGSHIP_CONTROLS,
} from "@/lib/simulatorStore";

// ─── Validation ───────────────────────────────────────────────────────────────

interface SimulatorSearchParams {
  eventId?: string | undefined;
  eventName?: string | undefined;
}

export const Route = createFileRoute("/_app/simulator")({
  validateSearch: (search: Record<string, unknown>): SimulatorSearchParams => ({
    eventId: typeof search["eventId"] === "string" ? search["eventId"] : undefined,
    eventName: typeof search["eventName"] === "string" ? search["eventName"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Ripple Simulator — Ripple" },
      {
        name: "description",
        content:
          "What-if simulation engine: change one event and watch the impact ripple through your operating cycle.",
      },
      { property: "og:title", content: "Ripple Simulator — Ripple" },
      { property: "og:description", content: "See the impact before it happens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SimulatorPage,
  errorComponent: ({ error, reset }) => (
    <ErrorState
      title="Could not load simulator"
      message={error instanceof Error ? error.message : "Failed to load simulator engine."}
      onRetry={reset}
    />
  ),
});

// ─── Page ─────────────────────────────────────────────────────────────────────

function SimulatorPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();

  const [isBaselineDialogOpen, setIsBaselineDialogOpen] = useState(false);
  const [initCustomerRupees, setInitCustomerRupees] = useState("8000");
  const [initSupplierRupees, setInitSupplierRupees] = useState("5000");

  const [controls, setControlsState] = useState<SimulatorControls>(
    () => simulatorStore.getState().controls,
  );
  const [result, setResult] = useState<SimulatorResult | null>(
    () => simulatorStore.getState().result,
  );
  const [error, setError] = useState<string | null>(null);
  const [chartView, setChartView] = useState<ChartView>("both");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState("");

  const setControls = useCallback(
    (c: SimulatorControls | ((prev: SimulatorControls) => SimulatorControls)) => {
      setControlsState((prev) => {
        const next = typeof c === "function" ? c(prev) : c;
        simulatorStore.setControls(next);
        return next;
      });
    },
    [],
  );

  // Auto-Reset Ripple Simulator on page switch (mount and cleanup)
  useEffect(() => {
    const resetToCleanBaseline = () => {
      const cleanBaseline: SimulatorControls = {
        supplierDeliveryDelayDays: 0,
        customerPaymentDelayDays: 0,
        customerPaymentAmountPaise: null,
        supplierPaymentAmountPaise: null,
        orderQuantityMultiplier: 1.0,
        horizonDays: 30,
      };
      setControlsState(cleanBaseline);
      simulatorStore.setControls(cleanBaseline, "baseline", "Normal Baseline");
      simulatorStore.revertRescues();
      simulatorStore.setChaosResult(null);
      setChaosResult(null);
      void simulatorApi.revertAllRescues().catch(() => {});
    };

    resetToCleanBaseline();

    return () => {
      resetToCleanBaseline();
    };
  }, []);

  // Subscribe to external store changes (e.g. from Insights AI chat)
  useEffect(() => {
    const unsub = simulatorStore.subscribe((state) => {
      setControlsState((prev) => {
        if (JSON.stringify(prev) !== JSON.stringify(state.controls)) {
          return state.controls;
        }
        return prev;
      });
    });
    return unsub;
  }, []);

  // ── Features A, C, D states ──
  const [chaosResult, setChaosResult] = useState<ChaosStressTestResult | null>(
    () => simulatorStore.getState().chaosResult,
  );
  const [inspectNode, setInspectNode] = useState<SimulatorTimelineNode | null>(null);
  const [isInspectOpen, setIsInspectOpen] = useState(false);
  const [autoPhasePreview, setAutoPhasePreview] = useState<AutoPhasePreview | null>(null);
  const [isAutoPhaseOpen, setIsAutoPhaseOpen] = useState(false);
  const [splitEscrowPreview, setSplitEscrowPreview] = useState<SplitEscrowPreview | null>(null);
  const [isSplitEscrowOpen, setIsSplitEscrowOpen] = useState(false);

  // ── Run simulation mutation ──
  const runMutation = useMutation({
    mutationFn: (c: SimulatorControls) => simulatorApi.simulate(c),
    onSuccess: (data) => {
      setResult(data);
      simulatorStore.setResult(data);
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setResult(null);
      simulatorStore.setResult(null);
      toast.error("Simulation failed", { description: err.message });
    },
  });

  // ── Feature A: Chaos Stress-Test Mutation ──
  const chaosMutation = useMutation({
    mutationFn: () => simulatorApi.runChaosStressTest(controls),
    onSuccess: (data) => {
      setChaosResult(data);
      simulatorStore.setChaosResult(data);
      if (data.stressedResult) {
        setResult(data.stressedResult);
        simulatorStore.setResult(data.stressedResult);
      }
      toast.success("Chaos Stress-Test Applied (+5d shock)", {
        description: `Most fragile node identified: ${data.mostFragileNodeLabel} (${data.mostFragileMultiplier}x multiplier)`,
      });
    },
    onError: (err: Error) => {
      toast.error("Chaos test failed", { description: err.message });
    },
  });

  const handleExitChaos = useCallback(() => {
    setChaosResult(null);
    simulatorStore.setChaosResult(null);
    runMutation.mutate(controls);
    toast.info("Returned to baseline scenario");
  }, [controls, runMutation]);

  // ── Feature C: Auto-Phase Inventory ──
  const previewAutoPhaseMutation = useMutation({
    mutationFn: () =>
      simulatorApi.previewAutoPhase({
        supplierCommitmentPaise: controls.supplierPaymentAmountPaise ?? 12_000_000,
        actualAvailableCashPaise: 15_000_000,
        safetyBufferPaise: 5_000_000,
        customerPaymentDate: `Day ${15 + controls.customerPaymentDelayDays}`,
      }),
    onSuccess: (data) => {
      setAutoPhasePreview(data);
      setIsAutoPhaseOpen(true);
    },
    onError: (err: Error) => {
      toast.error("Auto-Phase preview failed", { description: err.message });
    },
  });

  const applyAutoPhaseMutation = useMutation({
    mutationFn: () =>
      simulatorApi.applyAutoPhase({
        supplierCommitmentPaise: controls.supplierPaymentAmountPaise ?? 12_000_000,
        actualAvailableCashPaise: 15_000_000,
        safetyBufferPaise: 5_000_000,
        customerPaymentDate: `Day ${15 + controls.customerPaymentDelayDays}`,
      }),
    onSuccess: () => {
      setIsAutoPhaseOpen(false);
      setIsInspectOpen(false);
      simulatorStore.applyAutoPhase();
      runMutation.mutate(controls);
      void queryClient.invalidateQueries({ queryKey: ["simulator"] });
      toast.success("Auto-Phase Inventory Applied", {
        description:
          "Supplier order split into Batch 1 (Day 18) and Batch 2 (Day 32). Safety buffer preserved.",
      });
    },
    onError: (err: Error) => {
      toast.error("Auto-Phase failed", { description: err.message });
    },
  });

  // ── Feature D: Tri-Party Split-Escrow ──
  const previewSplitEscrowMutation = useMutation({
    mutationFn: () =>
      simulatorApi.previewSplitEscrow({
        customerInvoicePaise: controls.customerPaymentAmountPaise ?? 50_000_000,
        supplierCommitmentPaise: controls.supplierPaymentAmountPaise ?? 12_000_000,
        supplierFundingDate: "Day 18",
        customerSettlementDate: `Day ${15 + controls.customerPaymentDelayDays}`,
      }),
    onSuccess: (data) => {
      setSplitEscrowPreview(data);
      setIsSplitEscrowOpen(true);
    },
    onError: (err: Error) => {
      toast.error("Split-Escrow preview failed", { description: err.message });
    },
  });

  const applySplitEscrowMutation = useMutation({
    mutationFn: () =>
      simulatorApi.applySplitEscrow({
        customerInvoicePaise: controls.customerPaymentAmountPaise ?? 50_000_000,
        supplierCommitmentPaise: controls.supplierPaymentAmountPaise ?? 12_000_000,
        supplierFundingDate: "Day 18",
        customerSettlementDate: `Day ${15 + controls.customerPaymentDelayDays}`,
      }),
    onSuccess: () => {
      setIsSplitEscrowOpen(false);
      setIsInspectOpen(false);
      simulatorStore.applySplitEscrow();
      runMutation.mutate(controls);
      void queryClient.invalidateQueries({ queryKey: ["simulator"] });
      toast.success("Tri-Party Split-Escrow Locked", {
        description:
          "Zero business cash outlay on Day 18. Customer receivable assigned with bypass arc.",
      });
    },
    onError: (err: Error) => {
      toast.error("Split-Escrow failed", { description: err.message });
    },
  });

  // ── Revert Rescues Mutation ──
  const revertRescuesMutation = useMutation({
    mutationFn: () => simulatorApi.revertAllRescues(),
    onSuccess: () => {
      simulatorStore.revertRescues();
      runMutation.mutate(controls);
      void queryClient.invalidateQueries({ queryKey: ["simulator"] });
      toast.info("Scenario rescues reverted to baseline");
    },
    onError: (err: Error) => {
      toast.error("Revert failed", { description: err.message });
    },
  });

  // ── Preset Handler ──
  const handleSelectPreset = useCallback(
    (preset: "flagship" | "baseline") => {
      if (preset === "flagship") {
        const flagship = { ...FLAGSHIP_CONTROLS };
        setControls(flagship);
        simulatorStore.loadPreset("flagship");
        setChaosResult(null);
        toast.info("Loaded Delay Stress Scenario", {
          description:
            "₹5L Customer Receivable delayed +16d; ₹1.2L Kaveri Timber payable Day 18.",
        });
      } else {
        const base = { ...DEFAULT_CONTROLS };
        setControls(base);
        simulatorStore.loadPreset("baseline");
        setChaosResult(null);
        toast.info("Reset to Baseline Scenario");
      }
    },
    [setControls],
  );

  const handleInspectNode = useCallback((node: SimulatorTimelineNode) => {
    setInspectNode(node);
    setIsInspectOpen(true);
  }, []);

  const handleTriggerAutoPhaseFromNode = useCallback(
    (_node?: SimulatorTimelineNode) => {
      previewAutoPhaseMutation.mutate();
    },
    [previewAutoPhaseMutation],
  );

  const handleTriggerSplitEscrowFromNode = useCallback(
    (_node?: SimulatorTimelineNode) => {
      previewSplitEscrowMutation.mutate();
    },
    [previewSplitEscrowMutation],
  );

  // ── Dynamic simulation trigger on mount & whenever controls change ──
  useEffect(() => {
    const timer = setTimeout(() => {
      runMutation.mutate(controls);
    }, 150);
    return () => clearTimeout(timer);
  }, [controls]);

  // ── Save scenario mutation ──
  const saveMutation = useMutation({
    mutationFn: ({ name, c, r }: { name: string; c: SimulatorControls; r: SimulatorResult }) =>
      simulatorApi.saveScenario(name, c, r),
    onSuccess: () => {
      setSaveDialogOpen(false);
      setScenarioName("");
      void queryClient.invalidateQueries({ queryKey: ["simulator", "scenarios"] });
      toast.success("Scenario saved");
    },
    onError: (err: Error) => {
      toast.error("Failed to save scenario", { description: err.message });
    },
  });

  const handleRun = useCallback(() => {
    setError(null);
    setChaosResult(null);
    runMutation.mutate(controls);
  }, [controls, runMutation]);

  const handleReset = useCallback(() => {
    setControls(DEFAULT_CONTROLS);
    setChaosResult(null);
    setError(null);
    setChartView("both");
  }, []);

  const handleSaveClick = useCallback(() => {
    if (!result) return;
    // Suggest a name based on controls
    const parts: string[] = [];
    if (controls.supplierDeliveryDelayDays > 0)
      parts.push(`+${controls.supplierDeliveryDelayDays}d supplier delay`);
    if (controls.customerPaymentDelayDays > 0)
      parts.push(`+${controls.customerPaymentDelayDays}d payment delay`);
    if (controls.orderQuantityMultiplier !== 1.0)
      parts.push(`${Math.round(controls.orderQuantityMultiplier * 100)}% demand`);
    setScenarioName(parts.length > 0 ? parts.join(", ") : "Baseline scenario");
    setSaveDialogOpen(true);
  }, [controls, result]);

  const handleSaveConfirm = useCallback(() => {
    if (!result || !scenarioName.trim()) return;
    saveMutation.mutate({ name: scenarioName.trim(), c: controls, r: result });
  }, [result, scenarioName, controls, saveMutation]);

  const isAutoPhaseApplied = Boolean(
    result?.isAutoPhaseApplied ||
    result?.hasAutoPhaseRescue ||
    result?.activeRescues?.some((r) => r.type === "auto_phase") ||
    simulatorStore.getState().rescues?.autoPhaseApplied
  );
  const isSplitEscrowApplied = Boolean(
    result?.isSplitEscrowApplied ||
    result?.hasSplitEscrowRescue ||
    result?.activeRescues?.some((r) => r.type === "split_escrow") ||
    simulatorStore.getState().rescues?.splitEscrowLocked
  );

  const healthScore = Math.max(0, Math.min(100, 100 - (result?.rippleScore?.totalScore ?? 12)));
  const isCritical = Boolean(result && (result.scenarioMinPaise < 0 || result.shortfallPaise < 0 || healthScore < 40));
  const isModerate = Boolean(result && !isCritical && healthScore < 70);
  const healthStatusText = isCritical ? "Critical Contagion" : isModerate ? "Moderate Stress" : "Stable Capital";

  return (
    <div className="space-y-6 bg-black text-white min-h-screen pb-12">
      {/* ── Top Obsidian Command Header ── */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Ripple Simulator</h1>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            LIVE ENGINE
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="h-8 text-xs border-white/15 text-muted-foreground hover:text-white cursor-pointer"
            title="Reset to clean baseline"
          >
            Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveClick}
            className="h-8 text-xs border-white/15 text-white hover:bg-white/10 cursor-pointer"
            title="Save current scenario"
          >
            Save
          </Button>
        </div>
      </div>

      {/* ── Prominent Ripple Health Score Deck (Positioned Above Everything) ── */}
      <div className="card-rump p-4 sm:p-5 border border-white/15 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center">
          {/* Main Score Gauge */}
          <div className="col-span-2 sm:col-span-1 flex items-center gap-3">
            <span className="relative flex h-3.5 w-3.5 shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isCritical ? "bg-red-400" : isModerate ? "bg-amber-400" : "bg-emerald-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-3.5 w-3.5 ${
                  isCritical ? "bg-red-500" : isModerate ? "bg-amber-500" : "bg-emerald-500"
                }`}
              />
            </span>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground block">
                Ripple Health Score
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-2xl sm:text-3xl font-extrabold text-white tabular-nums tracking-tight">
                  {healthScore}
                  <span className="text-xs text-muted-foreground font-normal">/100</span>
                </span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                    isCritical
                      ? "text-red-400 bg-red-950/50 border border-red-500/30"
                      : isModerate
                        ? "text-amber-400 bg-amber-950/50 border border-amber-500/30"
                        : "text-emerald-400 bg-emerald-950/50 border border-emerald-500/30"
                  }`}
                >
                  {healthStatusText}
                </span>
              </div>
            </div>
          </div>

          {/* Min Cash Readout */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/10 font-mono">
            <span className="text-[10px] uppercase text-muted-foreground block font-bold tracking-wider">
              Min Projected Cash
            </span>
            <span className={`text-base font-bold tabular-nums ${result && result.scenarioMinPaise < 0 ? "text-red-400" : "text-white"}`}>
              {result ? formatMoney(result.scenarioMinPaise) : "₹1,50,000"}
            </span>
          </div>

          {/* Cascading Drag Readout */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/10 font-mono">
            <span className="text-[10px] uppercase text-muted-foreground block font-bold tracking-wider">
              Cascading Drag
            </span>
            <span className="text-base font-bold tabular-nums text-amber-400">
              {result?.trueMargin ? formatMoney(result.trueMargin.totalContagionCostPaise) : "₹0"}
            </span>
          </div>

          {/* Safety Buffer Reserve */}
          <div className="p-3 rounded-lg bg-black/40 border border-white/10 font-mono">
            <span className="text-[10px] uppercase text-muted-foreground block font-bold tracking-wider">
              Safety Reserve
            </span>
            <span className={`text-base font-bold tabular-nums ${result && result.scenarioMinPaise < 500_000 ? "text-red-400" : "text-emerald-400"}`}>
              {result && result.scenarioMinPaise < 500_000 ? "Breached (< ₹5k)" : "Protected (₹5k min)"}
            </span>
          </div>
        </div>
      </div>

      {/* ── Full-Width Cash Flow Projection Graph Card ── */}
      <div className="card-rump p-5 sm:p-6 border border-white/15 overflow-hidden w-full space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white tracking-tight">
              Cash Flow Projection
            </h2>
            <span className="text-xs font-mono text-muted-foreground">
              {controls.horizonDays}D Timeline
            </span>
          </div>

          {result && (
            <div className="flex items-center rounded-lg border border-white/15 bg-black/60 p-0.5 gap-0.5">
              {(
                [
                  { key: "both", label: "Both" },
                  { key: "baseline", label: "Baseline" },
                  { key: "scenario", label: "Simulated" },
                ] as { key: ChartView; label: string }[]
              ).map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setChartView(key)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer ${
                    chartView === key
                      ? "bg-white text-black font-semibold shadow-xs"
                      : "text-muted-foreground hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {runMutation.isPending ? (
          <div className="h-[420px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
            <p className="text-xs font-mono">Recalculating simulation trajectory…</p>
          </div>
        ) : error ? (
          <SimulatorErrorState message={error} />
        ) : result ? (
          <SimulatorChart
            baselinePoints={result.baselinePoints}
            scenarioPoints={result.scenarioPoints}
            horizonDays={controls.horizonDays}
            view={chartView}
          />
        ) : (
          <SimulatorEmptyState />
        )}
      </div>

      {/* ── 3 Core Differentiating Features Suite (Decreased Text & No Apex) ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
        {/* Feature A: Ripple Contagion Shock Slider */}
        <div className="card-rump p-6 flex flex-col justify-between space-y-4 border border-white/15">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-red-500/40 text-red-400 bg-red-950/30 text-[10px] font-bold">
                FEATURE A
              </Badge>
              <span className="text-[11px] font-mono text-muted-foreground">Shock Engine</span>
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight uppercase">
                Ripple Contagion Shock
              </h3>
            </div>

            {/* Slider & Readout */}
            <div className="space-y-2.5 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-white/80">Customer Delay:</span>
                <span className="font-mono text-sm font-bold text-red-400">
                  +{controls.customerPaymentDelayDays} Days
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={controls.customerPaymentDelayDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setControls((prev) => ({ ...prev, customerPaymentDelayDays: val }));
                }}
                className="w-full accent-white h-1.5 bg-white/20 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>0d (On Time)</span>
                <span>+15d</span>
                <span>+30d (Severe)</span>
              </div>
            </div>

            {/* Live consequence preview */}
            <div className="p-3 rounded-lg bg-black/50 border border-white/10 text-xs font-mono space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Min Projected Cash:</span>
                <span className={`font-bold ${result && result.scenarioMinPaise < 0 ? "text-red-400" : "text-white"}`}>
                  {result ? formatMoney(result.scenarioMinPaise) : "₹1,50,000"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-muted-foreground">Cascading Drag:</span>
                <span className="font-semibold text-amber-400">
                  {result?.trueMargin ? formatMoney(result.trueMargin.totalContagionCostPaise) : "₹0"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick preset trigger pills (Apex Option Removed) */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleSelectPreset("baseline")}
              className={`text-xs py-1.5 px-2 rounded-lg font-medium border transition-all cursor-pointer ${
                controls.customerPaymentDelayDays === 0
                  ? "bg-white text-black font-semibold border-white"
                  : "border-white/15 text-muted-foreground hover:text-white"
              }`}
            >
              0d Baseline
            </button>
            <button
              type="button"
              onClick={() => chaosMutation.mutate()}
              disabled={chaosMutation.isPending}
              className={`text-xs py-1.5 px-2 rounded-lg font-medium border transition-all cursor-pointer ${
                chaosResult?.isStressTestActive
                  ? "bg-red-500/30 border-red-500 text-red-200 font-semibold"
                  : "border-white/15 text-muted-foreground hover:text-white"
              }`}
            >
              {chaosMutation.isPending ? "Testing..." : "+5d Chaos"}
            </button>
          </div>
        </div>

        {/* Feature B: 1-Click Auto-Phase PO Trancher */}
        <div className="card-rump p-6 flex flex-col justify-between space-y-4 border border-white/15">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-indigo-500/40 text-indigo-400 bg-indigo-950/30 text-[10px] font-bold">
                FEATURE B
              </Badge>
              {isAutoPhaseApplied ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  3 TRANCHES ACTIVE
                </Badge>
              ) : (
                <Badge className="bg-white/10 text-white/60 text-[10px] font-medium">
                  UNTRANCHED BULK
                </Badge>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight uppercase">
                Auto-Phase PO Trancher
              </h3>
            </div>

            {/* Tranche visualization */}
            <div className="space-y-2 pt-1 font-mono text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/50 border border-white/10">
                <span className="text-muted-foreground">Tranche 1 (Day 18):</span>
                <span className="font-semibold text-white">
                  ₹1,00,000 <span className="text-[10px] text-muted-foreground">(Free Cash)</span>
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/50 border border-white/10">
                <span className="text-muted-foreground">Tranche 2 (Day 32):</span>
                <span className="font-semibold text-white">
                  ₹20,000 <span className="text-[10px] text-muted-foreground">(Deferred)</span>
                </span>
              </div>
              <div className="flex items-center justify-between px-1 text-[11px] text-emerald-400">
                <span>Safety Buffer:</span>
                <span className="font-semibold">₹50,000 Safeguarded</span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2">
            {isAutoPhaseApplied ? (
              <button
                type="button"
                onClick={() => revertRescuesMutation.mutate()}
                disabled={revertRescuesMutation.isPending}
                className="btn-rump-outline w-full py-3 text-xs font-bold cursor-pointer"
              >
                {revertRescuesMutation.isPending ? "Reverting..." : "Revert to Bulk PO"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => applyAutoPhaseMutation.mutate()}
                disabled={applyAutoPhaseMutation.isPending}
                className="btn-rump-solid w-full py-3 text-xs font-bold cursor-pointer"
              >
                {applyAutoPhaseMutation.isPending ? "Applying Tranches..." : "1-Click Auto-Phase PO (3 Tranches)"}
              </button>
            )}
          </div>
        </div>

        {/* Feature C: Tri-Party Split-Escrow Lock */}
        <div className="card-rump p-6 flex flex-col justify-between space-y-4 border border-white/15">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-950/30 text-[10px] font-bold">
                FEATURE C
              </Badge>
              {isSplitEscrowApplied ? (
                <Badge className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  ESCROW LOCKED
                </Badge>
              ) : (
                <Badge className="bg-white/10 text-white/60 text-[10px] font-medium">
                  EXPOSED OUTLAY
                </Badge>
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight uppercase">
                Tri-Party Split-Escrow Lock
              </h3>
            </div>

            {/* Mechanics preview (Apex Reference Removed) */}
            <div className="space-y-2 pt-1 font-mono text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/50 border border-white/10">
                <span className="text-muted-foreground">Day 18 Outlay:</span>
                <span className="font-semibold text-emerald-400">₹0 Business Outlay</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-black/50 border border-white/10">
                <span className="text-muted-foreground">Receivable Offset:</span>
                <span className="font-semibold text-white">Receivable ₹5,00,000</span>
              </div>
              <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground">
                <span>Fee: <strong className="text-white font-mono">2% (₹2,400)</strong></span>
                <span>Net: <strong className="text-emerald-400 font-mono">₹3,77,600</strong></span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2">
            {isSplitEscrowApplied ? (
              <button
                type="button"
                onClick={() => revertRescuesMutation.mutate()}
                disabled={revertRescuesMutation.isPending}
                className="btn-rump-outline w-full py-3 text-xs font-bold cursor-pointer"
              >
                {revertRescuesMutation.isPending ? "Unlocking..." : "Unlock Escrow Bypass"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => applySplitEscrowMutation.mutate()}
                disabled={applySplitEscrowMutation.isPending}
                className="btn-rump-solid w-full py-3 text-xs font-bold cursor-pointer"
              >
                {applySplitEscrowMutation.isPending ? "Locking Escrow..." : "Lock Tri-Party Split-Escrow"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Lower Workspace: Profit Reality Check + KPI Summary & Controls + Timeline ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (lg:col-span-7): Profit Reality Check + Key KPI Metrics */}
        <div className="lg:col-span-7 space-y-8">
          {/* Profit Reality Check Card */}
          {result?.trueMargin && !runMutation.isPending && (
            <SimulatorTrueMarginCard margin={result.trueMargin} />
          )}

          {/* Key Summary KPI Metrics */}
          {result && !runMutation.isPending && <SimulatorResults result={result} />}
        </div>

        {/* Right Column (lg:col-span-5): Simulation Parameters & Chronological Timeline */}
        <div className="lg:col-span-5 space-y-8">
          {/* Controls Card */}
          <div className="card-rump p-6 border border-white/15 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Scenario Controls
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBaselineDialogOpen(true)}
                className="h-7 text-xs border-white/15 text-white/90 hover:text-white"
              >
                Custom Amounts (₹)
              </Button>
            </div>

            {/* Horizon Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Projection Horizon:</span>
                <span className="font-mono font-bold text-white">{controls.horizonDays} Days</span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                step={5}
                value={controls.horizonDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 30;
                  setControls((prev) => ({ ...prev, horizonDays: val }));
                }}
                className="w-full accent-white h-1.5 bg-white/20 rounded-lg cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>10d</span>
                <span>30d</span>
                <span>60d</span>
                <span>90d</span>
              </div>
            </div>

            {/* Supplier Delivery Delay */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Supplier Delivery Delay:</span>
                <span className="font-mono font-bold text-amber-400">
                  +{controls.supplierDeliveryDelayDays} Days
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={controls.supplierDeliveryDelayDays}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setControls((prev) => ({ ...prev, supplierDeliveryDelayDays: val }));
                }}
                className="w-full accent-white h-1.5 bg-white/20 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Chronological Event Timeline & 1-Click Rescues */}
          {result && !runMutation.isPending ? (
            <SimulatorEventTimeline
              result={result}
              onInspectNode={handleInspectNode}
              onAutoPhaseClick={handleTriggerAutoPhaseFromNode}
              onSplitEscrowClick={handleTriggerSplitEscrowFromNode}
              onRevertRescues={() => revertRescuesMutation.mutate()}
            />
          ) : (
            <div className="card-rump p-6 text-center text-xs text-muted-foreground border border-white/15">
              Run a scenario to inspect order dependencies.
            </div>
          )}
        </div>
      </div>

      {/* Baseline Configuration Dialog: Optional quick prompt to specify custom amounts */}
      <Dialog open={isBaselineDialogOpen} onOpenChange={setIsBaselineDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <FlaskConical className="h-4 w-4" />
              </div>
              <DialogTitle className="text-base">Configure Amounts</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Customer Payment (₹)</Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 8000"
                value={initCustomerRupees}
                onChange={(e) => setInitCustomerRupees(e.target.value)}
                className="h-9 text-xs font-mono tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Supplier Payment (₹)</Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 5000"
                value={initSupplierRupees}
                onChange={(e) => setInitSupplierRupees(e.target.value)}
                className="h-9 text-xs font-mono tabular-nums"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t flex flex-row items-center justify-between gap-2 sm:justify-end">
            <Button variant="outline" size="sm" onClick={() => setIsBaselineDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="text-xs font-semibold shadow-xs"
              onClick={() => {
                const custRupees = parseFloat(initCustomerRupees);
                const suppRupees = parseFloat(initSupplierRupees);
                setControls((prev) => ({
                  ...prev,
                  customerPaymentAmountPaise: isNaN(custRupees)
                    ? null
                    : Math.round(custRupees * 100),
                  supplierPaymentAmountPaise: isNaN(suppRupees)
                    ? null
                    : Math.round(suppRupees * 100),
                }));
                setIsBaselineDialogOpen(false);
              }}
            >
              Apply Amounts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save scenario dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save Scenario</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="scenario-name" className="text-sm">
                Scenario name
              </Label>
              <Input
                id="scenario-name"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g. +7d supplier delay stress test"
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveConfirm();
                }}
              />
            </div>
            {result && (
              <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground space-y-0.5">
                <p>
                  <span className="font-medium text-foreground">Ripple Score:</span>{" "}
                  {result.rippleScore.totalScore}/100
                </p>
                <p>
                  <span className="font-medium text-foreground">Horizon:</span>{" "}
                  {controls.horizonDays} days
                </p>
                <p>
                  <span className="font-medium text-foreground">Affected events:</span>{" "}
                  {result.affectedDependencies.length}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveConfirm}
              disabled={!scenarioName.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? "Saving…" : "Save Scenario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Node Inspection Dialog (Feature A) */}
      <NodeInspectionDialog
        open={isInspectOpen}
        onOpenChange={setIsInspectOpen}
        node={inspectNode}
        onTriggerAutoPhase={() => handleTriggerAutoPhaseFromNode(inspectNode ?? undefined)}
        onTriggerSplitEscrow={() => handleTriggerSplitEscrowFromNode(inspectNode ?? undefined)}
      />

      {/* Auto-Phase Inventory Rescue Dialog (Feature C) */}
      <AutoPhaseDialog
        open={isAutoPhaseOpen}
        onOpenChange={setIsAutoPhaseOpen}
        preview={autoPhasePreview}
        isLoading={applyAutoPhaseMutation.isPending}
        onConfirm={() => applyAutoPhaseMutation.mutate()}
      />

      {/* Zero-Cash Tri-Party Split-Escrow Dialog (Feature D) */}
      <SplitEscrowDialog
        open={isSplitEscrowOpen}
        onOpenChange={setIsSplitEscrowOpen}
        preview={splitEscrowPreview}
        isLoading={applySplitEscrowMutation.isPending}
        onConfirm={() => applySplitEscrowMutation.mutate()}
      />
    </div>
  );
}
