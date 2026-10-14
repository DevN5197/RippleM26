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
import { addDays, format, parseISO } from "date-fns";
import { toast } from "sonner";
import type { CreateInvoiceInput, InvoiceType, Customer, Supplier } from "@/types";

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: Customer[];
  suppliers: Supplier[];
  initialType?: InvoiceType | undefined;
  preselectedCustomerId?: string | undefined;
  preselectedSupplierId?: string | undefined;
  onSubmit: (data: CreateInvoiceInput) => Promise<void>;
}

export function InvoiceDialog({
  open,
  onOpenChange,
  customers,
  suppliers,
  initialType = "receivable",
  preselectedCustomerId,
  preselectedSupplierId,
  onSubmit,
}: InvoiceDialogProps) {
  const [type, setType] = useState<InvoiceType>(initialType);
  const [customerId, setCustomerId] = useState<string>("");
  const [supplierId, setSupplierId] = useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [amountRupees, setAmountRupees] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    setIssueDate(today);
    setDueDate(format(addDays(new Date(), 15), "yyyy-MM-dd"));
    setType(initialType);
    setCustomerId(preselectedCustomerId || (customers[0]?.id ?? ""));
    setSupplierId(preselectedSupplierId || (suppliers[0]?.id ?? ""));
    setInvoiceNumber("");
    setAmountRupees("");
    setNotes("");
    setErrors({});
  }, [open, initialType, preselectedCustomerId, preselectedSupplierId, customers, suppliers]);

  // Auto-calculate due date when customer/supplier changes
  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const selected = customers.find((c) => c.id === id);
    if (selected && issueDate) {
      const days = selected.creditTermsDays ?? 15;
      setDueDate(format(addDays(parseISO(issueDate), days), "yyyy-MM-dd"));
    }
  };

  const handleSupplierChange = (id: string) => {
    setSupplierId(id);
    const selected = suppliers.find((s) => s.id === id);
    if (selected && issueDate) {
      const days = selected.paymentTermsDays ?? 30;
      setDueDate(format(addDays(parseISO(issueDate), days), "yyyy-MM-dd"));
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    const parsedAmt = parseFloat(amountRupees);
    if (Number.isNaN(parsedAmt) || parsedAmt <= 0) {
      errs.amount = "Invoice amount must be greater than ₹0.";
    }
    if (type === "receivable" && !customerId) {
      errs.counterparty = "Please select a customer.";
    }
    if (type === "payable" && !supplierId) {
      errs.counterparty = "Please select a supplier.";
    }
    if (!issueDate) {
      errs.issueDate = "Issue date is required.";
    }
    if (!dueDate) {
      errs.dueDate = "Due date is required.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const paise = Math.round(parseFloat(amountRupees) * 100);
      await onSubmit({
        type,
        customerId: type === "receivable" ? customerId : undefined,
        supplierId: type === "payable" ? supplierId : undefined,
        invoiceNumber: invoiceNumber.trim() || undefined,
        amountPaise: paise,
        issueDate,
        dueDate,
        notes: notes.trim() || undefined,
      });
      toast.success(
        `${type === "receivable" ? "Customer invoice" : "Vendor bill"} created successfully.`,
      );
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create invoice";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {type === "receivable" ? "Create Customer Invoice" : "Record Vendor Bill"}
            </DialogTitle>
            <DialogDescription>
              Issue an accounts receivable invoice to a customer or record an accounts payable vendor bill.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Invoice Type Selector */}
            <div className="grid gap-1.5">
              <Label>Invoice Classification</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={type === "receivable" ? "default" : "outline"}
                  onClick={() => setType("receivable")}
                  disabled={isSubmitting}
                  className="w-full text-xs"
                >
                  Receivable (Customer Invoice)
                </Button>
                <Button
                  type="button"
                  variant={type === "payable" ? "default" : "outline"}
                  onClick={() => setType("payable")}
                  disabled={isSubmitting}
                  className="w-full text-xs"
                >
                  Payable (Vendor Bill)
                </Button>
              </div>
            </div>

            {/* Counterparty Selection */}
            {type === "receivable" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="inv-customer">Customer</Label>
                <Select value={customerId} onValueChange={handleCustomerChange} disabled={isSubmitting}>
                  <SelectTrigger id="inv-customer">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers
                      .filter((c) => c.status !== "archived")
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} (Net {c.creditTermsDays}d)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.counterparty && (
                  <p className="text-xs text-destructive">{errors.counterparty}</p>
                )}
              </div>
            ) : (
              <div className="grid gap-1.5">
                <Label htmlFor="inv-supplier">Supplier</Label>
                <Select value={supplierId} onValueChange={handleSupplierChange} disabled={isSubmitting}>
                  <SelectTrigger id="inv-supplier">
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers
                      .filter((s) => s.status !== "archived")
                      .map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name} (Net {s.paymentTermsDays}d)
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {errors.counterparty && (
                  <p className="text-xs text-destructive">{errors.counterparty}</p>
                )}
              </div>
            )}

            {/* Invoice Number & Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="inv-num">Invoice / Bill # (Optional)</Label>
                <Input
                  id="inv-num"
                  placeholder={type === "receivable" ? "INV-2026-XXXX" : "BILL-2026-XXXX"}
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="inv-amount">
                  Total Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="inv-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 25000"
                  value={amountRupees}
                  onChange={(e) => setAmountRupees(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
              </div>
            </div>

            {/* Issue Date & Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="inv-issue">Issue Date</Label>
                <Input
                  id="inv-issue"
                  type="date"
                  value={issueDate}
                  onChange={(e) => {
                    setIssueDate(e.target.value);
                    if (type === "receivable") {
                      const c = customers.find((cust) => cust.id === customerId);
                      if (c && e.target.value) {
                        setDueDate(
                          format(addDays(parseISO(e.target.value), c.creditTermsDays ?? 15), "yyyy-MM-dd"),
                        );
                      }
                    } else {
                      const s = suppliers.find((supp) => supp.id === supplierId);
                      if (s && e.target.value) {
                        setDueDate(
                          format(addDays(parseISO(e.target.value), s.paymentTermsDays ?? 30), "yyyy-MM-dd"),
                        );
                      }
                    }
                  }}
                  disabled={isSubmitting}
                />
                {errors.issueDate && <p className="text-xs text-destructive">{errors.issueDate}</p>}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="inv-due">Payment Due Date</Label>
                <Input
                  id="inv-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate}</p>}
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-1.5">
              <Label htmlFor="inv-notes">Notes / Itemization Description</Label>
              <Textarea
                id="inv-notes"
                placeholder="Product order reference, lot number, delivery terms..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
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
              {isSubmitting ? "Creating..." : "Create Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
