import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RotateCcw, Play, Save } from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import type { SimulatorControls } from "@/lib/api/simulationApi";

interface SimulatorControlsProps {
  controls: SimulatorControls;
  isRunning: boolean;
  isSaving: boolean;
  hasResult: boolean;
  onChange: (controls: SimulatorControls) => void;
  onReset: () => void;
  onRun: () => void;
  onSave: () => void;
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
}: SimulatorControlsProps) {
  const setField = <K extends keyof SimulatorControls>(key: K, value: SimulatorControls[K]) =>
    onChange({ ...controls, [key]: value });

  // Default amounts from seed data (paise) for reference placeholders
  const defaultCustomerAmountPaise = 800_000; // ₹8,000 INV-2001
  const defaultSupplierAmountPaise = 500_000; // ₹5,000 advance

  return (
    <Card className="shadow-xs h-fit">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Scenario Controls
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* 1. Supplier delivery delay */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Supplier delivery delay</Label>
            <span className="text-sm tabular-nums text-muted-foreground">
              {controls.supplierDeliveryDelayDays === 0
                ? "No delay"
                : `+${controls.supplierDeliveryDelayDays}d`}
            </span>
          </div>
          <Slider
            min={0}
            max={30}
            step={1}
            value={[controls.supplierDeliveryDelayDays]}
            onValueChange={([v]) => setField("supplierDeliveryDelayDays", v ?? 0)}
          />
          <p className="text-[11px] text-muted-foreground">
            Delays PO-1 receipt from Shree Textiles, pushing inventory arrival and downstream
            fulfillment.
          </p>
        </div>

        <Separator />

        {/* 2. Customer payment delay */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Customer payment delay</Label>
            <span className="text-sm tabular-nums text-muted-foreground">
              {controls.customerPaymentDelayDays === 0
                ? "No delay"
                : `+${controls.customerPaymentDelayDays}d`}
            </span>
          </div>
          <Slider
            min={0}
            max={30}
            step={1}
            value={[controls.customerPaymentDelayDays]}
            onValueChange={([v]) => setField("customerPaymentDelayDays", v ?? 0)}
          />
          <p className="text-[11px] text-muted-foreground">
            Delays Urban Threads INV-2001 receipt (normally Day 21) by the specified days.
          </p>
        </div>

        <Separator />

        {/* 3. Customer payment amount */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Customer payment amount</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">₹</span>
            <Input
              type="number"
              min={0}
              step={100}
              placeholder="e.g. 8000"
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
                  setField("customerPaymentAmountPaise", isNaN(num) ? null : Math.round(num * 100));
                }
              }}
              className="h-8 text-sm tabular-nums"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {controls.customerPaymentAmountPaise === null
              ? `Cleared (default baseline ₹8,000 applies)`
              : `Configured: ${formatMoney(controls.customerPaymentAmountPaise)}`}
          </p>
        </div>

        <Separator />

        {/* 4. Supplier payment amount */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Supplier payment amount</Label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">₹</span>
            <Input
              type="number"
              min={0}
              step={100}
              placeholder="e.g. 5000"
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
                  setField("supplierPaymentAmountPaise", isNaN(num) ? null : Math.round(num * 100));
                }
              }}
              className="h-8 text-sm tabular-nums"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            {controls.supplierPaymentAmountPaise === null
              ? `Cleared (default baseline ₹5,000 applies)`
              : `Configured: ${formatMoney(controls.supplierPaymentAmountPaise)}`}
          </p>
        </div>

        <Separator />

        {/* 5. Order quantity multiplier */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Order demand</Label>
            <span className="text-sm tabular-nums text-muted-foreground">
              {controls.orderQuantityMultiplier === 1.0
                ? "100% (unchanged)"
                : `${Math.round(controls.orderQuantityMultiplier * 100)}%`}
            </span>
          </div>
          <Slider
            min={0.1}
            max={3.0}
            step={0.1}
            value={[controls.orderQuantityMultiplier]}
            onValueChange={([v]) => setField("orderQuantityMultiplier", v ?? 1.0)}
          />
          <p className="text-[11px] text-muted-foreground">
            Scales customer order volume and matching inflow amounts proportionally.
          </p>
        </div>

        <Separator />

        {/* 6. Forecast horizon */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Forecast horizon</Label>
          <Select
            value={String(controls.horizonDays)}
            onValueChange={(v) => setField("horizonDays", Number(v) as 7 | 14 | 30)}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 days</SelectItem>
              <SelectItem value="14">14 days</SelectItem>
              <SelectItem value="30">30 days</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Number of days to project baseline and simulated cash flow.
          </p>
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <Button
            onClick={onRun}
            disabled={isRunning}
            className="w-full gap-2"
          >
            <Play className="h-4 w-4" aria-hidden />
            {isRunning ? "Running…" : "Run Simulation"}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onReset} className="flex-1 gap-1.5">
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Reset
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onSave}
              disabled={!hasResult || isSaving}
              className="flex-1 gap-1.5"
            >
              <Save className="h-3.5 w-3.5" aria-hidden />
              {isSaving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
