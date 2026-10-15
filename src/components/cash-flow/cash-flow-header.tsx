import {
  Download,
  SlidersHorizontal,
  LineChart,
  Table,
  CalendarClock,
  Shield,
  Sparkles,
  Database,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { formatMoney } from "@/lib/formatters";
import { IS_DEMO } from "@/lib/config";
import type { SimulationScenario } from "@/types";

export type ForecastHorizon = 7 | 14 | 30 | 60 | 90;
export type CashFlowViewMode = "chart" | "ledger" | "timeline";

interface CashFlowHeaderProps {
  horizon: ForecastHorizon;
  onHorizonChange: (horizon: ForecastHorizon) => void;
  viewMode: CashFlowViewMode;
  onViewModeChange: (view: CashFlowViewMode) => void;
  safetyThresholdPaise: number;
  onOpenSafetyDialog: () => void;
  selectedScenarioId: string | undefined;
  onScenarioChange: (scenarioId: string | undefined) => void;
  scenarios: SimulationScenario[];
  onExportCsv: () => void;
}

const HORIZON_OPTIONS: ForecastHorizon[] = [7, 14, 30, 60, 90];

export function CashFlowHeader({
  horizon,
  onHorizonChange,
  viewMode,
  onViewModeChange,
  safetyThresholdPaise,
  onOpenSafetyDialog,
  selectedScenarioId,
  onScenarioChange,
  scenarios,
  onExportCsv,
}: CashFlowHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Top row: Title, Subtitle, and Data Mode Badge */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Cash Flow</h1>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {IS_DEMO ? (
                    <Badge
                      variant="outline"
                      className="cursor-help gap-1 border-warning/40 bg-warning/10 text-warning-foreground text-[11px] font-medium"
                    >
                      <Sparkles className="h-3 w-3 text-warning-foreground" />
                      Demo Mode (Synthetic Data)
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="cursor-help gap-1.5 border-success/40 bg-success/10 text-success text-[11px] font-medium"
                    >
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
                      </span>
                      Live Bank Connected
                    </Badge>
                  )}
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {IS_DEMO
                    ? "Displaying synthetic financial transactions for Rupi Clothing. Connect live bank feeds or accounting software in Settings."
                    : "Live feed synchronized with your registered banking account and reconciled ledger."}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            <span>Understand your future cash position before commitments become problems.</span>{" "}
            <span className="text-xs opacity-90 hidden sm:inline">Track daily cash inflows and outflows over 30 to 90 days to prevent shortages before they happen.</span>
          </p>
        </div>

        {/* Top actions: Export CSV & Safety Threshold Button */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSafetyDialog}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Shield className="h-3.5 w-3.5 text-warning" />
            <span>Buffer: {formatMoney(safetyThresholdPaise)}</span>
            {safetyThresholdPaise === 500_000 && (
              <Badge
                variant="secondary"
                className="px-1.5 py-0 text-[10px] bg-primary/10 text-primary border-primary/20"
              >
                Recommended
              </Badge>
            )}
            <SlidersHorizontal className="h-3 w-3 text-muted-foreground ml-0.5" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onExportCsv}
            className="h-8 gap-1.5 text-xs font-medium"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Control bar: Horizon Pills, View Selector, Scenario dropdown */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Horizon selector buttons */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1">Horizon:</span>
          <div className="inline-flex rounded-md bg-muted p-0.5">
            {HORIZON_OPTIONS.map((days) => {
              const active = horizon === days;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => onHorizonChange(days)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                    active
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  aria-pressed={active}
                >
                  {days}D
                </button>
              );
            })}
          </div>
        </div>

        {/* Middle: Scenario comparison selector */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
            Scenario:
          </span>
          <Select
            value={selectedScenarioId ?? "baseline"}
            onValueChange={(val) => onScenarioChange(val === "baseline" ? undefined : val)}
          >
            <SelectTrigger className="h-8 text-xs font-medium w-[220px] sm:w-[260px]">
              <SelectValue placeholder="Baseline (Current forecast)" />
            </SelectTrigger>
            <SelectContent align="start" className="text-xs">
              <SelectItem value="baseline">Baseline (Current forecast)</SelectItem>
              {scenarios.map((sc) => (
                <SelectItem key={sc.id} value={sc.id}>
                  {sc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Right: View mode selector */}
        <div className="flex items-center gap-1.5">
          <div className="inline-flex rounded-md bg-muted p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange("chart")}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
                viewMode === "chart"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={viewMode === "chart"}
            >
              <LineChart className="h-3.5 w-3.5" />
              <span>Chart</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("ledger")}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
                viewMode === "ledger"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={viewMode === "ledger"}
            >
              <Table className="h-3.5 w-3.5" />
              <span>Daily Ledger</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("timeline")}
              className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-all ${
                viewMode === "timeline"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={viewMode === "timeline"}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              <span>Timeline</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
