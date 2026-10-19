import React, { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  RotateCcw,
  Play,
  Save,
  Zap,
  X,
  ChevronDown,
  ChevronUp,
  Sliders,
  Sparkles,
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

  const isBaseline = controls.customerPaymentDelayDays === 0 && !chaosStressTestResult?.isStressTestActive;

  return (
    <Card className="shadow-xs border-border/70 bg-card rounded-xl overflow-hidden">
      <CardContent className="p-3 sm:p-4 space-y-3">
        {/* ── Top Ribbon: Presets + Interactive Delay Slider + Quick Actions ── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-5">
          {/* 1. Scenario Presets */}
          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mr-1">
              Presets:
            </span>
            <Button
              type="button"
              variant={isBaseline ? "default" : "outline"}
              size="sm"
              onClick={() => onSelectPreset?.("baseline")}
              className={cn(
                "h-8 text-xs font-medium transition-all",
                isBaseline ? "shadow-xs" : "border-border/70 text-muted-foreground hover:text-foreground",
              )}
            >
              Reset Baseline
            </Button>

            {chaosStressTestResult?.isStressTestActive ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onExitChaosStressTest}
                className="h-8 text-xs font-semibold transition-colors border-red-400 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40 gap-1.5 shadow-xs"
              >
                <X className="h-3.5 w-3.5" />
                <span>Disable Stress-Test</span>
                <span className="sr-only">Run Chaos Stress-Test (+5d)</span>
              </Button>
            ) : onChaosStressTest ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onChaosStressTest}
                disabled={isRunning || isChaosTesting}
                className="h-8 text-xs font-medium transition-colors border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/40"
              >
                <Zap className="h-3.5 w-3.5 mr-1 fill-purple-600 text-purple-600 dark:fill-purple-400 dark:text-purple-400" aria-hidden />
                <span>
                  {isChaosTesting ? "Calculating…" : "Chaos Stress-Test (+5d)"}
                </span>
                <span className="sr-only">Run Chaos Stress-Test (+5d)</span>
              </Button>
            ) : null}

            <Button
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5"
            >
              <RotateCcw className="h-3 w-3" aria-hidden />
              <span>Reset</span>
            </Button>
          </div>

          {/* 2. Primary Customer Payment Delay Slider */}
          <div className="flex-1 min-w-[260px] max-w-xl flex items-center gap-3 bg-muted/20 border border-border/50 rounded-lg px-3 py-1.5">
            <div className="shrink-0 w-36">
              <span className="text-[11px] font-semibold text-muted-foreground block uppercase tracking-wider">
                Customer Delay
              </span>
              <span className="text-xs font-mono font-bold text-foreground">
                {controls.customerPaymentDelayDays === 0
                  ? "0 days (On Time)"
                  : `+${controls.customerPaymentDelayDays} days late`}
              </span>
            </div>
            <Slider
              min={0}
              max={30}
              step={1}
              value={[controls.customerPaymentDelayDays]}
              onValueChange={([v]) => setField("customerPaymentDelayDays", v ?? 0)}
              className="flex-1 cursor-pointer"
            />
          </div>

          {/* 3. Actions: Advanced Drawer Trigger */}
          <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced((v) => !v)}
              className="h-8 text-xs gap-1 border-border/70 text-muted-foreground hover:text-foreground"
            >
              <Sliders className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Advanced</span>
              {showAdvanced ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>

        {/* ── Active Chaos Stress-Test Banner ── */}
        {chaosStressTestResult?.isStressTestActive && (
          <div className="rounded-lg border border-purple-400/80 bg-purple-50/50 dark:bg-purple-950/20 p-3 space-y-2 text-xs emergency-card-stress">
            <div className="flex items-center justify-between font-medium text-purple-900 dark:text-purple-100">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-purple-400 bg-purple-100 text-purple-800 text-[10px] font-semibold uppercase flex items-center gap-1"
                >
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-purple-600" />
                  </span>
                  Stress Mode
                </Badge>
                <span className="flex items-center gap-1.5 font-semibold text-xs">
                  <Zap className="h-3.5 w-3.5 fill-purple-600 text-purple-600" />
                  Chaos Shock: +5-Day Delay
                </span>
              </div>
              {onExitChaosStressTest && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExitChaosStressTest}
                  className="h-7 px-3 text-xs border-red-400 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40 font-semibold gap-1.5 shadow-xs"
                >
                  <X className="h-3.5 w-3.5" />
                  <span>Disable Stress-Test</span>
                  <span className="sr-only">Exit</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 pt-1 text-muted-foreground border-t border-purple-200/50 text-[11px]">
              <div>
                <span>Baseline Min Cash:</span>
                <p className="font-mono text-foreground font-medium">
                  {formatMoney(chaosStressTestResult.baselineMinCashPaise)}
                </p>
              </div>
              <div>
                <span className="text-purple-700 dark:text-purple-300 font-medium">Stressed Min Cash:</span>
                <p className="font-mono text-destructive font-bold">
                  {formatMoney(chaosStressTestResult.stressedMinCashPaise)}
                </p>
              </div>
              {chaosStressTestResult.additionalShortfallPaise > 0 && (
                <div>
                  <span className="text-destructive font-medium">Additional Shortfall:</span>
                  <p className="font-mono text-destructive font-bold">
                    -{formatMoney(chaosStressTestResult.additionalShortfallPaise)}
                  </p>
                </div>
              )}
              <div>
                <span>New Affected Nodes:</span>
                <p className="font-bold text-foreground font-mono">
                  +{chaosStressTestResult.newlyAffectedNodesCount}
                </p>
              </div>
              <div>
                <span>Newly Endangered:</span>
                <p className="font-mono font-medium text-destructive">
                  {formatMoney(chaosStressTestResult.newlyEndangeredOrderValuePaise)}
                </p>
              </div>
              <div>
                <span>Most Fragile:</span>
                <Badge
                  variant="outline"
                  className="border-purple-400 bg-purple-100/90 text-purple-800 text-[10px] block truncate emergency-card-stress font-semibold"
                >
                  {chaosStressTestResult.mostFragileNodeLabel} ({chaosStressTestResult.mostFragileMultiplier}x)
                </Badge>
              </div>
            </div>
          </div>
        )}

        {/* ── Collapsible Advanced Parameters Drawer ── */}
        {showAdvanced && (
          <div className="pt-3 border-t border-border/60 animate-in fade-in-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
              {/* Custom Customer Receipt Amount */}
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">Customer receipt amount (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  placeholder="Baseline ₹8,000"
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

              {/* Custom Supplier Payment Amount */}
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">Supplier payment amount (₹)</Label>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  placeholder="Baseline ₹5,000"
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

              {/* Supplier Delay */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-medium text-muted-foreground">Supplier delay</Label>
                  <span className="text-xs font-mono font-medium">+{controls.supplierDeliveryDelayDays}d</span>
                </div>
                <Slider
                  min={0}
                  max={30}
                  step={1}
                  value={[controls.supplierDeliveryDelayDays]}
                  onValueChange={([v]) => setField("supplierDeliveryDelayDays", v ?? 0)}
                  className="cursor-pointer"
                />
              </div>

              {/* Demand Multiplier */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-medium text-muted-foreground">Order demand</Label>
                  <span className="text-xs font-mono font-medium">{Math.round(controls.orderQuantityMultiplier * 100)}%</span>
                </div>
                <Slider
                  min={0.1}
                  max={3.0}
                  step={0.1}
                  value={[controls.orderQuantityMultiplier]}
                  onValueChange={([v]) => setField("orderQuantityMultiplier", v ?? 1.0)}
                  className="cursor-pointer"
                />
              </div>

              {/* Forecast Horizon */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-medium text-muted-foreground">Forecast horizon</Label>
                  <span className="text-xs font-mono font-medium">{controls.horizonDays} days</span>
                </div>
                <Slider
                  min={10}
                  max={90}
                  step={1}
                  value={[controls.horizonDays]}
                  onValueChange={([value]) => setField("horizonDays", value ?? 30)}
                  className="cursor-pointer"
                  aria-label="Forecast horizon in days"
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
