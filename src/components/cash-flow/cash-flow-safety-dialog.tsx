import { useState, useEffect } from "react";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/formatters";

interface CashFlowSafetyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentThresholdPaise: number;
  onSave: (newThresholdPaise: number) => Promise<void> | void;
}

const PRESET_AMOUNTS = [
  { label: "₹0 (Zero buffer)", paise: 0 },
  { label: "₹2,000", paise: 200_000 },
  { label: "₹5,000 (Recommended)", paise: 500_000 },
  { label: "₹10,000", paise: 1_000_000 },
  { label: "₹20,000", paise: 2_000_000 },
];

export function CashFlowSafetyDialog({
  open,
  onOpenChange,
  currentThresholdPaise,
  onSave,
}: CashFlowSafetyDialogProps) {
  const [amountRupees, setAmountRupees] = useState<string>(
    String(Math.round(currentThresholdPaise / 100)),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setAmountRupees(String(Math.round(currentThresholdPaise / 100)));
    }
  }, [open, currentThresholdPaise]);

  const parsedRupees = parseFloat(amountRupees);
  const validRupees = isNaN(parsedRupees) || parsedRupees < 0 ? 0 : parsedRupees;
  const currentCalculatedPaise = Math.round(validRupees * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(currentCalculatedPaise);
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15 text-warning-foreground">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Cash Safety Threshold</DialogTitle>
              <DialogDescription className="text-xs">
                Set the minimum liquidity buffer Rupi Clothing requires to operate safely.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-xs font-medium text-foreground">Quick Presets</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PRESET_AMOUNTS.map((preset) => {
                const isSelected = currentCalculatedPaise === preset.paise;
                return (
                  <Button
                    key={preset.paise}
                    type="button"
                    variant={isSelected ? "default" : "outline"}
                    size="sm"
                    className="h-8 text-xs font-normal"
                    onClick={() => setAmountRupees(String(preset.paise / 100))}
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="custom-threshold" className="text-xs font-medium text-foreground">
              Custom Threshold Amount (₹ INR)
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-sm text-muted-foreground">
                ₹
              </span>
              <Input
                id="custom-threshold"
                type="number"
                min="0"
                step="500"
                value={amountRupees}
                onChange={(e) => setAmountRupees(e.target.value)}
                className="pl-7 text-sm font-medium tabular-nums"
                placeholder="e.g. 5000"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              Active buffer:{" "}
              <span className="font-semibold text-foreground">
                {formatMoney(currentCalculatedPaise)}
              </span>
              . If forecasted cash dips below this amount on any day, shortfall alerts and simulator
              suggestions will be triggered.
            </p>
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-success mt-0.5" />
              <span>
                Ripple automatically updates the safety reference line on your forecast chart, daily
                ledger status columns, and shortfall risk notifications across the app.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save Threshold"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
