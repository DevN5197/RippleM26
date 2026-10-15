import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { FlaskConical, BookOpen } from "lucide-react";
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

// ─── Default controls ─────────────────────────────────────────────────────────

const DEFAULT_CONTROLS: SimulatorControls = {
  supplierDeliveryDelayDays: 0,
  customerPaymentDelayDays: 0,
  customerPaymentAmountPaise: null, // null = use seed default
  supplierPaymentAmountPaise: null,
  orderQuantityMultiplier: 1.0,
  horizonDays: 30,
};

// ─── Page ─────────────────────────────────────────────────────────────────────

function SimulatorPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();

  const [isBaselineDialogOpen, setIsBaselineDialogOpen] = useState(false);
  const [initCustomerRupees, setInitCustomerRupees] = useState("8000");
  const [initSupplierRupees, setInitSupplierRupees] = useState("5000");

  const [controls, setControls] = useState<SimulatorControls>(DEFAULT_CONTROLS);
  const [result, setResult] = useState<SimulatorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartView, setChartView] = useState<ChartView>("both");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [scenarioName, setScenarioName] = useState("");

  // ── Features A, C, D states ──
  const [chaosResult, setChaosResult] = useState<ChaosStressTestResult | null>(null);
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
      setError(null);
    },
    onError: (err: Error) => {
      setError(err.message);
      setResult(null);
      toast.error("Simulation failed", { description: err.message });
    },
  });

  // ── Feature A: Chaos Stress-Test Mutation ──
  const chaosMutation = useMutation({
    mutationFn: () => simulatorApi.runChaosStressTest(controls),
    onSuccess: (data) => {
      setChaosResult(data);
      if (data.stressedResult) {
        setResult(data.stressedResult);
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
      runMutation.mutate(controls);
      void queryClient.invalidateQueries({ queryKey: ["simulator"] });
      toast.info("Scenario rescues reverted to baseline");
    },
    onError: (err: Error) => {
      toast.error("Revert failed", { description: err.message });
    },
  });

  // ── Preset Handler ──
  const handleSelectPreset = useCallback((preset: "flagship" | "baseline") => {
    if (preset === "flagship") {
      setControls({
        supplierDeliveryDelayDays: 0,
        customerPaymentDelayDays: 16,
        customerPaymentAmountPaise: 50_000_000, // ₹5,00,000 Apex Corp
        supplierPaymentAmountPaise: 12_000_000, // ₹1,20,000 Kaveri Timber
        orderQuantityMultiplier: 1.0,
        horizonDays: 30,
      });
      setChaosResult(null);
      toast.info("Loaded Apex Corp Flagship Scenario", {
        description:
          "₹5L Customer Receivable delayed +16d (Day 31); ₹1.2L Kaveri Timber payable Day 18.",
      });
    } else {
      setControls(DEFAULT_CONTROLS);
      setChaosResult(null);
      toast.info("Reset to Baseline Scenario");
    }
  }, []);

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

  return (
    <div className="space-y-5">
      {/* Page header */}
      <PageHeader
        title="Ripple Simulator"
        description="See how a delayed payment affects your cash flow and connected orders."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBaselineDialogOpen(true)}
              className="h-7 text-xs text-muted-foreground hover:text-foreground border-border/70 font-medium gap-1.5"
            >
              <FlaskConical className="h-3 w-3 text-muted-foreground" />
              Custom Amounts
            </Button>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium text-muted-foreground bg-muted/40 border border-border/60">
              <FlaskConical className="h-3 w-3 text-muted-foreground" aria-hidden />
              What-if Engine
            </span>
          </div>
        }
      />

      {/* Main layout: left controls + right chart/results */}
      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        {/* ── Left: scenario controls ── */}
        <div>
          <SimulatorControlPanel
            controls={controls}
            isRunning={runMutation.isPending}
            isSaving={saveMutation.isPending}
            hasResult={result !== null}
            onChange={setControls}
            onReset={handleReset}
            onRun={handleRun}
            onSave={handleSaveClick}
            onChaosStressTest={() => chaosMutation.mutate()}
            isChaosTesting={chaosMutation.isPending}
            chaosStressTestResult={chaosResult}
            onExitChaosStressTest={handleExitChaos}
            onSelectPreset={handleSelectPreset}
          />
        </div>

        {/* ── Right: chart + results ── */}
        <div className="space-y-4">
          {/* Chart card */}
          <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.02)] border-border/70 rounded-xl bg-card">
            <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-sm sm:text-base font-semibold text-foreground">
                    Cash Flow Comparison
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5 text-muted-foreground">
                    {result
                      ? `${controls.horizonDays}-day projection · Baseline vs. simulated scenario`
                      : "Run a simulation to compare baseline and scenario forecasts"}
                  </CardDescription>
                </div>

                {/* Series toggle — only visible once there's a result */}
                {result && (
                  <div className="flex items-center rounded-lg border border-border/70 bg-muted/30 p-0.5 gap-0.5">
                    {(
                      [
                        { key: "baseline", label: "Baseline" },
                        { key: "both", label: "Both" },
                        { key: "scenario", label: "Simulated" },
                      ] as { key: ChartView; label: string }[]
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setChartView(key)}
                        className={[
                          "rounded-md px-2.5 py-1 text-xs font-medium transition-all cursor-pointer",
                          chartView === key
                            ? "bg-background text-foreground shadow-xs font-semibold"
                            : "text-muted-foreground hover:text-foreground",
                        ].join(" ")}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {runMutation.isPending ? (
                <div className="h-72 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  <p className="text-sm">Calculating simulation…</p>
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
            </CardContent>
          </Card>

          {/* Results panel */}
          {result && !runMutation.isPending && <SimulatorResults result={result} />}

          {/* Timeline panel */}
          {result && !runMutation.isPending && (
            <SimulatorEventTimeline
              result={result}
              onInspectNode={handleInspectNode}
              onAutoPhaseClick={handleTriggerAutoPhaseFromNode}
              onSplitEscrowClick={handleTriggerSplitEscrowFromNode}
              onRevertRescues={() => revertRescuesMutation.mutate()}
            />
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
              <DialogTitle className="text-base">Configure Simulation Amounts</DialogTitle>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Specify custom baseline customer and supplier payment amounts for this simulation:
            </p>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Customer Payment Amount (₹)</Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 8000"
                value={initCustomerRupees}
                onChange={(e) => setInitCustomerRupees(e.target.value)}
                className="h-9 text-xs font-mono tabular-nums"
              />
              <p className="text-[11px] text-muted-foreground">
                Inflow amount expected from customer (normally ₹8,000 for INV-2001)
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Supplier Payment Amount (₹)</Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 5000"
                value={initSupplierRupees}
                onChange={(e) => setInitSupplierRupees(e.target.value)}
                className="h-9 text-xs font-mono tabular-nums"
              />
              <p className="text-[11px] text-muted-foreground">
                Advance outlay commitment to supplier (normally ₹5,000 for PO-1)
              </p>
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
