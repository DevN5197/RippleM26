import React, { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatMoney } from "@/lib/formatters";
import { toast } from "sonner";
import type { Invoice, RecordPaymentInput } from "@/types";

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: Invoice | null;
  onSubmit: (invoiceId: string, data: RecordPaymentInput) => Promise<void>;
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
  onSubmit,
}: RecordPaymentDialogProps) {
  const [amountRupees, setAmountRupees] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>("");
  const [method, setMethod] = useState<string>("Bank Transfer");
  const [note, setNote] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remainingPaise = invoice
    ? Math.max(0, invoice.amountPaise - (invoice.amountPaidPaise || 0))
    : 0;
  const remainingRupees = remainingPaise / 100;

  useEffect(() => {
    if (invoice) {
      const rem = Math.max(0, invoice.amountPaise - (invoice.amountPaidPaise || 0));
      setAmountRupees((rem / 100).toString());
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setMethod("Bank Transfer");
      setNote("");
      setError(null);
    }
  }, [invoice, open]);

  if (!invoice) return null;

  const isReceivable = invoice.type === "receivable" || !invoice.type;

  const handleQuickAmount = (ratio: number) => {
    const amt = Math.round(remainingRupees * ratio);
    setAmountRupees(amt.toString());
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedRupees = parseFloat(amountRupees);
    if (Number.isNaN(parsedRupees) || parsedRupees <= 0) {
      setError("Please enter a valid payment amount greater than ₹0.");
      return;
    }

    const inputPaise = Math.round(parsedRupees * 100);
    if (inputPaise > remainingPaise) {
      setError(
        `Amount cannot exceed remaining balance of ${formatMoney(remainingPaise)}.`,
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(invoice.id, {
        amountPaise: inputPaise,
        paymentDate: paymentDate || new Date().toISOString().slice(0, 10),
        method,
        note: note.trim() || undefined,
      });
      toast.success(
        `Payment of ${formatMoney(inputPaise)} recorded successfully for ${invoice.invoiceNumber}.`,
      );
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record payment";
      toast.error(msg);
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {isReceivable ? "Record Customer Payment" : "Record Supplier Settlement"}
            </DialogTitle>
            <DialogDescription>
              Record full or partial settlement against {invoice.invoiceNumber}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Invoice Summary Card */}
            <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1.5">
              <div className="flex justify-between text-muted-foreground">
                <span>Invoice Total:</span>
                <span className="font-medium text-foreground">{formatMoney(invoice.amountPaise)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Already Paid:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formatMoney(invoice.amountPaidPaise || 0)}
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t font-semibold">
                <span>Remaining Balance:</span>
                <span className="text-primary">{formatMoney(remainingPaise)}</span>
              </div>
            </div>

            {/* Amount input & quick buttons */}
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="payment-amount">Payment Amount (₹)</Label>
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => handleQuickAmount(0.5)}
                  >
                    50%
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => handleQuickAmount(1)}
                  >
                    Full
                  </Button>
                </div>
              </div>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={remainingRupees}
                value={amountRupees}
                onChange={(e) => {
                  setAmountRupees(e.target.value);
                  setError(null);
                }}
                disabled={isSubmitting}
                className="font-medium text-base"
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            {/* Payment Date & Method */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="payment-date">Settlement Date</Label>
                <Input
                  id="payment-date"
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="payment-method">Payment Mode</Label>
                <Select value={method} onValueChange={setMethod} disabled={isSubmitting}>
                  <SelectTrigger id="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UPI">UPI</SelectItem>
                    <SelectItem value="NEFT">NEFT</SelectItem>
                    <SelectItem value="RTGS">RTGS</SelectItem>
                    <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                    <SelectItem value="Cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Note / Transaction Reference */}
            <div className="grid gap-1.5">
              <Label htmlFor="payment-note">Transaction Reference / Note</Label>
              <Textarea
                id="payment-note"
                placeholder="e.g. UTR / Ref number or bank confirmation memo"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Recording..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
