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
import { SimulatorControlPanel } from "@/components/simulator/simulator-controls";
import { SimulatorChart, type ChartView } from "@/components/simulator/simulator-chart";
import {
  SimulatorResults,
  SimulatorEmptyState,
  SimulatorErrorState,
  SimulatorEventTimeline,
} from "@/components/simulator/simulator-results";
import {
  simulatorApi,
  type SimulatorControls,
  type SimulatorResult,
} from "@/lib/api/simulationApi";

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
    runMutation.mutate(controls);
  }, [controls, runMutation]);

  const handleReset = useCallback(() => {
    setControls(DEFAULT_CONTROLS);
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
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="Ripple Simulator"
        description="Change a business event and instantly see how it ripples through suppliers, inventory, customer orders, and cash flow."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBaselineDialogOpen(true)}
              className="text-xs gap-1.5 h-8 font-medium"
            >
              <FlaskConical className="h-3.5 w-3.5 text-primary" />
              Custom Amounts
            </Button>
            <Badge variant="outline" className="gap-1.5 text-xs bg-primary/5 text-primary border-primary/20">
              <FlaskConical className="h-3 w-3" aria-hidden />
              What-if Engine
            </Badge>
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
          />
        </div>

        {/* ── Right: chart + results ── */}
        <div className="space-y-4">
          {/* Chart card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">Cash Flow Comparison</CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {result
                      ? `${controls.horizonDays}-day projection · Baseline vs. simulated scenario`
                      : "Run a simulation to compare baseline and scenario forecasts"}
                  </CardDescription>
                </div>

                {/* Series toggle — only visible once there's a result */}
                {result && (
                  <div className="flex items-center rounded-md border bg-muted/40 p-0.5 gap-0.5">
                    {(
                      [
                        { key: "baseline", label: "Baseline" },
                        { key: "both",     label: "Both"     },
                        { key: "scenario", label: "Simulated"},
                      ] as { key: ChartView; label: string }[]
                    ).map(({ key, label }) => (
                      <button
                        key={key}
                        onClick={() => setChartView(key)}
                        className={[
                          "rounded px-3 py-1 text-xs font-medium transition-colors",
                          chartView === key
                            ? key === "baseline"
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : key === "scenario"
                                ? "bg-warning text-warning-foreground shadow-sm"
                                : "bg-background text-foreground shadow-sm"
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
          {result && !runMutation.isPending && (
            <SimulatorResults result={result} />
          )}

          {/* Timeline panel */}
          {result && !runMutation.isPending && (
            <SimulatorEventTimeline result={result} />
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsBaselineDialogOpen(false)}
            >
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
                  customerPaymentAmountPaise: isNaN(custRupees) ? null : Math.round(custRupees * 100),
                  supplierPaymentAmountPaise: isNaN(suppRupees) ? null : Math.round(suppRupees * 100),
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
    </div>
  );
}
