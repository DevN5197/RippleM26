import React, { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  RotateCcw,
  Play,
  Save,
  Zap,
  Sparkles,
  ShieldAlert,
  X,
  ChevronDown,
  ChevronUp,
  Sliders,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { SimulatorControls } from "@/lib/api/simulationApi";
import type { ChaosStressTestResult } from "@/types";

interface SimulatorControlsProps {
  controls: SimulatorControls;
  isRunning: boolean;
  isSaving: boolean;
  hasResult: boolean;
  onChange: (controls: SimulatorControls) => void;
  onReset: () => void;
  onRun: () => void;
  onSave: () => void;
  onChaosStressTest?: () => void;
  isChaosTesting?: boolean;
  chaosStressTestResult?: ChaosStressTestResult | null;
  onExitChaosStressTest?: () => void;
  onSelectPreset?: (preset: "flagship" | "baseline") => void;
}

export function SimulatorControlPanel({
  controls,
  isRunning,
  isSaving,
  hasResult,
  onChange,
  onReset,
  onRun,
  onSave,
  onChaosStressTest,
  isChaosTesting,
  chaosStressTestResult,
  onExitChaosStressTest,
  onSelectPreset,
}: SimulatorControlsProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const setField = <K extends keyof SimulatorControls>(key: K, value: SimulatorControls[K]) =>
    onChange({ ...controls, [key]: value });

  // Default amounts from seed data (paise) for reference placeholders
  const defaultCustomerAmountPaise = 800_000; // ₹8,000 INV-2001
  const defaultSupplierAmountPaise = 500_000; // ₹5,000 advance

  return (
    <Card className="shadow-[0_1px_3px_rgba(0,0,0,0.03)] h-fit border-border/70 bg-card rounded-xl">
      <CardHeader className="pb-3 pt-4 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Scenario Controls
          </CardTitle>
          {chaosStressTestResult?.isStressTestActive && (
            <Badge
              variant="outline"
              className="border-purple-200 bg-purple-50 text-purple-700 text-[10px] font-semibold uppercase"
            >
              Stress Mode
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        {/* Scenario Presets */}
        {onSelectPreset && (
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium text-muted-foreground">Scenario preset</Label>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectPreset("flagship")}
                className="h-7 text-[11px] font-medium border-border/70 hover:border-primary/40 hover:text-primary transition-colors"
              >
                Apex Flagship (+16d)
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onSelectPreset("baseline")}
                className="h-7 text-[11px] font-medium border-border/70 hover:bg-muted/40 transition-colors"
              >
                Reset Baseline
              </Button>
            </div>
          </div>
        )}

        <Separator className="bg-border/60" />

        {/* Primary Driver: Customer payment delay */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium text-foreground">Customer payment delay</Label>
            <span className="text-xs font-mono font-semibold text-foreground">
              {controls.customerPaymentDelayDays === 0
                ? "No delay"
                : `+${controls.customerPaymentDelayDays} days`}
            </span>
          </div>
          <Slider
            min={0}
            max={30}
            step={1}
            value={[controls.customerPaymentDelayDays]}
            onValueChange={([v]) => setField("customerPaymentDelayDays", v ?? 0)}
          />
          <p className="text-[11px] text-muted-foreground leading-snug">
            Simulate delayed collections to identify liquidity bottlenecks.
          </p>
        </div>

        <Separator className="bg-border/60" />

        {/* Actions (Upfront primary interaction surface) */}
        <div className="flex flex-col gap-2 pt-0.5">
          <Button
            onClick={onRun}
            disabled={isRunning || isChaosTesting}
            className="w-full gap-2 h-9 text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/95 transition-all shadow-xs"
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            {isRunning ? "Running…" : "Run Simulation"}
          </Button>

          {/* Feature A: Run Chaos Stress-Test button */}
          {onChaosStressTest && (
            <Button
              type="button"
              variant="outline"
              onClick={onChaosStressTest}
              disabled={isRunning || isChaosTesting}
              className="w-full gap-1.5 h-8 text-xs font-medium border-purple-200/80 text-purple-700 hover:bg-purple-50 hover:border-purple-300 transition-colors"
            >
              <Zap className="h-3.5 w-3.5 fill-purple-600 text-purple-600" aria-hidden />
              {isChaosTesting ? "Calculating Stress Impact…" : "Run Chaos Stress-Test (+5d)"}
            </Button>
          )}

          <div className="flex gap-1.5 pt-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="flex-1 gap-1.5 h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={!hasResult || isSaving}
              className="flex-1 gap-1.5 h-7 text-xs border-border/70"
            >
              <Save className="h-3 w-3" aria-hidden />
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        {/* Stress-Test Delta Summary when active */}
        {chaosStressTestResult?.isStressTestActive && (
          <div className="rounded-lg border border-purple-200/70 bg-purple-50/40 p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between font-medium text-purple-900 dark:text-purple-100">
              <span className="flex items-center gap-1.5 font-semibold">
                <Zap className="h-3.5 w-3.5 fill-purple-600 text-purple-600" />
                Chaos Shock: +5-Day Delay
              </span>
              {onExitChaosStressTest && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onExitChaosStressTest}
                  className="h-5 px-1.5 text-[10px] text-purple-700 hover:text-purple-900 hover:bg-purple-100/50"
                >
                  <X className="h-3 w-3 mr-0.5" />
                  Exit
                </Button>
              )}
            </div>

            <div className="space-y-1 text-muted-foreground pt-1.5 border-t border-purple-200/50">
              <div className="flex justify-between">
                <span>Baseline Min Cash:</span>
                <span className="font-mono text-foreground">
                  {formatMoney(chaosStressTestResult.baselineMinCashPaise)}
                </span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-purple-700 dark:text-purple-300">Stressed Min Cash:</span>
                <span className="font-mono text-destructive font-semibold">
                  {formatMoney(chaosStressTestResult.stressedMinCashPaise)}
                </span>
              </div>
              {chaosStressTestResult.additionalShortfallPaise > 0 && (
                <div className="flex justify-between text-destructive">
                  <span>Additional Shortfall:</span>
                  <span className="font-mono font-bold">
                    -{formatMoney(chaosStressTestResult.additionalShortfallPaise)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span>New Affected Nodes:</span>
                <span className="font-bold text-foreground">
                  +{chaosStressTestResult.newlyAffectedNodesCount}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Newly Endangered Value:</span>
                <span className="font-mono font-medium text-destructive">
                  {formatMoney(chaosStressTestResult.newlyEndangeredOrderValuePaise)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t border-purple-200/50 font-medium">
                <span>Most Fragile Under Stress:</span>
                <Badge
                  variant="outline"
                  className="border-purple-300 bg-purple-100/80 text-purple-800 text-[10px]"
                >
                  {chaosStressTestResult.mostFragileNodeLabel} (
                  {chaosStressTestResult.mostFragileMultiplier}x)
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* Collapsible Advanced Controls */}
        <div className="border-t border-border/60 pt-2">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="w-full flex items-center justify-between py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5" />
              Advanced scenario parameters
            </span>
            <span className="text-[11px] text-primary flex items-center gap-0.5">
              {showAdvanced ? (
                <>
                  Hide <ChevronUp className="h-3 w-3" />
                </>
              ) : (
                <>
                  Configure <ChevronDown className="h-3 w-3" />
                </>
              )}
            </span>
          </button>

          <div
            className={cn(
              "p-3 border-t space-y-4 bg-card transition-all",
              !showAdvanced && "hidden",
            )}
          >
            {/* Custom Amounts */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Customer receipt amount (₹)</Label>
              <Input
                type="number"
                min={0}
                step={100}
                placeholder="Default baseline ₹8,000"
                value={
                  controls.customerPaymentAmountPaise === null
                    ? ""
                    : controls.customerPaymentAmountPaise / 100
                }
                onChange={(e) => {
                  const val = e.target.value.trim();
                  if (val === "") {
                    setField("customerPaymentAmountPaise", null);
                  } else {
                    const num = parseFloat(val);
                    setField(
                      "customerPaymentAmountPaise",
                      isNaN(num) ? null : Math.round(num * 100),
                    );
                  }
                }}
                className="h-8 text-xs tabular-nums"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Supplier payment amount (₹)</Label>
              <Input
                type="number"
                min={0}
                step={100}
                placeholder="Default baseline ₹5,000"
                value={
                  controls.supplierPaymentAmountPaise === null
                    ? ""
                    : controls.supplierPaymentAmountPaise / 100
                }
                onChange={(e) => {
                  const val = e.target.value.trim();
                  if (val === "") {
                    setField("supplierPaymentAmountPaise", null);
                  } else {
                    const num = parseFloat(val);
                    setField(
                      "supplierPaymentAmountPaise",
                      isNaN(num) ? null : Math.round(num * 100),
                    );
                  }
                }}
                className="h-8 text-xs tabular-nums"
              />
            </div>

            {/* Supplier delay */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Supplier delivery delay</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  +{controls.supplierDeliveryDelayDays}d
                </span>
              </div>
              <Slider
                min={0}
                max={30}
                step={1}
                value={[controls.supplierDeliveryDelayDays]}
                onValueChange={([v]) => setField("supplierDeliveryDelayDays", v ?? 0)}
              />
            </div>

            {/* Demand multiplier */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Order demand multiplier</Label>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {Math.round(controls.orderQuantityMultiplier * 100)}%
                </span>
              </div>
              <Slider
                min={0.1}
                max={3.0}
                step={0.1}
                value={[controls.orderQuantityMultiplier]}
                onValueChange={([v]) => setField("orderQuantityMultiplier", v ?? 1.0)}
              />
            </div>

            {/* Horizon */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Forecast horizon</Label>
              <Select
                value={String(controls.horizonDays)}
                onValueChange={(v) => setField("horizonDays", Number(v) as 7 | 14 | 30)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
