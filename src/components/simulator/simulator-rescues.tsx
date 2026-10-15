import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/formatters";
import {
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle,
  AlertTriangle,
  Zap,
  Lock,
  GitBranch,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SimulatorTimelineNode, AutoPhasePreview, SplitEscrowPreview } from "@/types";

interface AutoPhaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: AutoPhasePreview | null;
  isLoading: boolean;
  onConfirm: () => void;
}

export function AutoPhaseDialog({
  open,
  onOpenChange,
  preview,
  isLoading,
  onConfirm,
}: AutoPhaseDialogProps) {
  const [showWhy, setShowWhy] = useState(false);
  if (!preview) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Layers className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Auto-Phase Inventory Rescue Preview
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs font-medium text-foreground mt-0.5">
            Split this supplier payment to protect your cash buffer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border p-2.5 bg-muted/20">
              <span className="text-muted-foreground">Original Commitment</span>
              <p className="font-semibold text-foreground text-sm mt-0.5">
                {formatMoney(preview.supplierCommitmentPaise)}
              </p>
            </div>
            <div className="rounded-md border p-2.5 bg-muted/20">
              <span className="text-muted-foreground">Protected Safety Buffer</span>
              <p className="font-semibold text-success text-sm mt-0.5">
                {formatMoney(preview.safetyBufferPaise)}
              </p>
            </div>
          </div>

          {/* Compact Timeline of Batches */}
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
              <GitBranch className="h-3.5 w-3.5" />
              Proposed Batch Schedule
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between rounded bg-background/80 p-2.5 border">
                <div>
                  <span className="font-medium text-foreground">{preview.batch1.label}</span>
                  <p className="text-[11px] text-muted-foreground">{preview.batch1.purpose}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="font-mono text-xs">
                    {preview.batch1.date}
                  </Badge>
                  <p className="font-semibold text-foreground mt-0.5">
                    {formatMoney(preview.batch1.amountPaise)}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded bg-background/80 p-2.5 border">
                <div>
                  <span className="font-medium text-foreground">{preview.batch2.label}</span>
                  <p className="text-[11px] text-muted-foreground">{preview.batch2.purpose}</p>
                </div>
                <div className="text-right">
                  <Badge
                    variant="outline"
                    className="font-mono text-xs text-primary border-primary/30"
                  >
                    {preview.batch2.date}
                  </Badge>
                  <p className="font-semibold text-foreground mt-0.5">
                    {formatMoney(preview.batch2.amountPaise)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Progressive Disclosure: Why this works */}
          <div className="rounded-lg border bg-muted/15 p-2.5 space-y-1.5">
            <button
              type="button"
              onClick={() => setShowWhy((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <span className="font-semibold">Why this works</span>
              <span className="text-[11px] text-primary">
                {showWhy ? "Hide calculation" : "View calculation"}
              </span>
            </button>
            <p
              className={cn(
                "text-xs text-muted-foreground leading-relaxed pt-1.5 border-t",
                !showWhy && "hidden",
              )}
            >
              {preview.explanation}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading}
            className="gap-1.5 font-medium shadow-xs"
          >
            <ShieldCheck className="h-4 w-4" />
            {isLoading ? "Applying..." : "Confirm & Apply Auto-Phase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface SplitEscrowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: SplitEscrowPreview | null;
  isLoading: boolean;
  onConfirm: () => void;
}

export function SplitEscrowDialog({
  open,
  onOpenChange,
  preview,
  isLoading,
  onConfirm,
}: SplitEscrowDialogProps) {
  const [showWhy, setShowWhy] = useState(false);
  if (!preview) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Lock className="h-4 w-4" />
            </div>
            <DialogTitle className="text-base font-semibold">
              Tri-Party Split-Escrow Facility Preview
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs font-medium text-foreground mt-0.5">
            Use an eligible customer receipt to fund this supplier order without a normal upfront
            cash outflow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Simulated Disclaimer Banner */}
          <div className="rounded border bg-muted/40 px-2.5 py-1.5 text-[11px] text-muted-foreground flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span>Simulated arrangement. No actual bank funds are moved.</span>
          </div>

          {/* Key metrics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md border p-2.5 bg-muted/20">
              <span className="text-muted-foreground">Assigned Receivable</span>
              <p className="font-semibold text-foreground text-sm mt-0.5">
                {formatMoney(preview.customerInvoicePaise)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Due: {preview.customerSettlementDate}
              </p>
            </div>
            <div className="rounded-md border p-2.5 bg-muted/20">
              <span className="text-muted-foreground">Funded Supplier Cost</span>
              <p className="font-semibold text-primary text-sm mt-0.5">
                {formatMoney(preview.supplierCommitmentPaise)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Funded: {preview.supplierFundingDate}
              </p>
            </div>
          </div>

          {/* Settlement breakdown */}
          <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
            <p className="font-semibold text-primary flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Simulated Contractual Settlement Model
            </p>

            <div className="space-y-1.5 border-t pt-2 text-foreground">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Day 18 Outflow from Business Cash:</span>
                <span className="font-mono font-bold text-success">₹0.00 (Zero Outlay)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Escrow Float Fee (2%):</span>
                <span className="font-mono">{formatMoney(preview.floatFeePaise)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-medium">
                <span className="text-primary">Net Remittance to Business (Day 31):</span>
                <span className="font-mono text-primary font-bold">
                  {formatMoney(preview.netProceedsPaise)}
                </span>
              </div>
            </div>
          </div>

          {/* Progressive Disclosure: Why this works */}
          <div className="rounded-lg border bg-muted/15 p-2.5 space-y-1.5">
            <button
              type="button"
              onClick={() => setShowWhy((v) => !v)}
              className="w-full flex items-center justify-between text-xs font-medium text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <span className="font-semibold">Why this works</span>
              <span className="text-[11px] text-primary">
                {showWhy ? "Hide calculation" : "View calculation"}
              </span>
            </button>
            <p
              className={cn(
                "text-xs text-muted-foreground leading-relaxed pt-1.5 border-t",
                !showWhy && "hidden",
              )}
            >
              {preview.explanation}
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={onConfirm}
            disabled={isLoading || !preview.isEligible}
            className="gap-1.5 font-medium shadow-xs"
          >
            <Lock className="h-4 w-4" />
            {isLoading ? "Locking..." : "Lock Tri-Party Split-Escrow"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface NodeInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  node: SimulatorTimelineNode | null;
  onTriggerAutoPhase?: () => void;
  onTriggerSplitEscrow?: () => void;
}

export function NodeInspectionDialog({
  open,
  onOpenChange,
  node,
  onTriggerAutoPhase,
  onTriggerSplitEscrow,
}: NodeInspectionDialogProps) {
  const [showCalculation, setShowCalculation] = useState(false);
  if (!node) return null;

  const fragility = node.fragility;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <Badge variant="outline" className="text-xs font-mono">
              {node.dayLabel} · {node.date}
            </Badge>
            {fragility && (
              <Badge
                variant="outline"
                className={
                  fragility.isKeystone
                    ? "bg-destructive/10 text-destructive border-destructive/20 font-semibold"
                    : "bg-muted text-muted-foreground"
                }
              >
                {fragility.badgeText}
              </Badge>
            )}
          </div>
          <DialogTitle className="text-base font-semibold pt-1">{node.label}</DialogTitle>
          <DialogDescription className="text-xs">
            Counterparty: {node.counterparty} · Amount: {formatMoney(node.amountPaise)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          <p className="text-muted-foreground leading-relaxed">{node.description}</p>

          {/* Fragility Multiplier Explanation */}
          {fragility && (
            <div className="rounded-lg border p-3 bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-warning" />
                  Fragility Multiplier
                </span>
                <span className="font-bold text-sm text-foreground">
                  {fragility.multiplier}x Multiplier
                </span>
              </div>

              {/* Plain Language Explanation */}
              <p className="text-xs text-foreground font-medium leading-snug">
                How much other business revenue is exposed if this customer pays late?
              </p>

              {/* Progressive Disclosure: View calculation */}
              <div className="pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setShowCalculation((v) => !v)}
                  className="w-full flex items-center justify-between text-xs font-medium text-primary hover:underline cursor-pointer"
                >
                  <span>View calculation</span>
                  <span className="text-[10px]">{showCalculation ? "▲ Hide" : "▼ Expand"}</span>
                </button>

                <div
                  className={cn(
                    "mt-2 space-y-1.5 text-muted-foreground pt-1.5 border-t border-dashed",
                    !showCalculation && "hidden",
                  )}
                >
                  <div className="flex justify-between">
                    <span>Tranche / Node Amount:</span>
                    <span className="font-mono text-foreground">
                      {formatMoney(fragility.invoiceAmountPaise)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Downstream Order Value at Risk:</span>
                    <span className="font-mono font-medium text-destructive">
                      {formatMoney(fragility.downstreamValueAtRiskPaise)}
                    </span>
                  </div>

                  {fragility.exposedOrders.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-[11px] font-medium text-foreground mb-1">
                        Exposed Downstream Commitments:
                      </p>
                      <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
                        {fragility.exposedOrders.map((order, idx) => (
                          <li key={idx}>{order}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Rescue triggers */}
          {(node.isEligibleForAutoPhase || node.isEligibleForSplitEscrow) && (
            <div className="space-y-2 pt-1 border-t">
              <p className="font-semibold text-foreground">Available Cash-Flow Rescues:</p>
              <div className="flex flex-col gap-2">
                {node.isEligibleForAutoPhase && onTriggerAutoPhase && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onTriggerAutoPhase}
                    className="w-full justify-start gap-2 border-primary/30 text-primary hover:bg-primary/5"
                  >
                    <Layers className="h-4 w-4" />
                    <span>Auto-Phase Inventory (Split into 2 Batches)</span>
                  </Button>
                )}
                {node.isEligibleForSplitEscrow && onTriggerSplitEscrow && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onTriggerSplitEscrow}
                    className="w-full justify-start gap-2 border-primary/30 text-primary hover:bg-primary/5"
                  >
                    <Lock className="h-4 w-4" />
                    <span>Lock Tri-Party Split-Escrow (Funded via Receivable)</span>
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
