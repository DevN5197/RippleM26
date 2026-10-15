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
import { Plus, Loader2 } from "lucide-react";
import { customerApi } from "@/lib/api/customerApi";
import { supplierApi } from "@/lib/api/supplierApi";
import type { CreateInvoiceInput, InvoiceType, Customer, Supplier } from "@/types";

export interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers?: Customer[];
  suppliers?: Supplier[];
  initialType?: InvoiceType | undefined;
  defaultType?: InvoiceType | undefined;
  preselectedCustomerId?: string | undefined;
  defaultCustomerId?: string | undefined;
  preselectedSupplierId?: string | undefined;
  defaultSupplierId?: string | undefined;
  onSubmit: (data: CreateInvoiceInput) => Promise<void>;
}

export interface InvoiceFormErrors {
  amount?: string | undefined;
  counterparty?: string | undefined;
  issueDate?: string | undefined;
  dueDate?: string | undefined;
}

const calculateDueDate = (baseDateStr: string, days: number): string => {
  try {
    const d = parseISO(baseDateStr);
    if (isNaN(d.getTime())) return baseDateStr;
    return format(addDays(d, days), "yyyy-MM-dd");
  } catch {
    return baseDateStr;
  }
};

export function InvoiceDialog({
  open,
  onOpenChange,
  customers,
  suppliers,
  initialType = "receivable",
  defaultType,
  preselectedCustomerId,
  defaultCustomerId,
  preselectedSupplierId,
  defaultSupplierId,
  onSubmit,
}: InvoiceDialogProps) {
  const effectiveInitialType = defaultType || initialType || "receivable";
  const effectiveCustomerId = defaultCustomerId || preselectedCustomerId || "";
  const effectiveSupplierId = defaultSupplierId || preselectedSupplierId || "";

  const [type, setType] = useState<InvoiceType>(effectiveInitialType);
  const [customerId, setCustomerId] = useState<string>(effectiveCustomerId);
  const [supplierId, setSupplierId] = useState<string>(effectiveSupplierId);
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [amountRupees, setAmountRupees] = useState<string>("");
  const [issueDate, setIssueDate] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<InvoiceFormErrors>({});

  // Self-contained entity list states
  const [localCustomers, setLocalCustomers] = useState<Customer[]>(customers || []);
  const [localSuppliers, setLocalSuppliers] = useState<Supplier[]>(suppliers || []);
  const [isLoadingEntities, setIsLoadingEntities] = useState(false);

  // Quick Add sub-form state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddName, setQuickAddName] = useState("");
  const [quickAddTerms, setQuickAddTerms] = useState<number>(15);
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Sync external customer/supplier props
  useEffect(() => {
    if (customers && customers.length > 0) {
      setLocalCustomers(customers);
    }
  }, [customers]);

  useEffect(() => {
    if (suppliers && suppliers.length > 0) {
      setLocalSuppliers(suppliers);
    }
  }, [suppliers]);

  // Self-contained fetch if not provided or empty when dialog opens
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    const fetchEntitiesIfNeeded = async () => {
      try {
        if (!customers || customers.length === 0) {
          setIsLoadingEntities(true);
          const cRes = await customerApi.list({ pageSize: 100 });
          if (isMounted && cRes?.data) {
            setLocalCustomers(cRes.data);
          }
        }
        if (!suppliers || suppliers.length === 0) {
          setIsLoadingEntities(true);
          const sRes = await supplierApi.list({ pageSize: 100 });
          if (isMounted && sRes?.data) {
            setLocalSuppliers(sRes.data);
          }
        }
      } catch (e) {
        // Silently continue
      } finally {
        if (isMounted) setIsLoadingEntities(false);
      }
    };

    fetchEntitiesIfNeeded();
    return () => {
      isMounted = false;
    };
  }, [open, customers, suppliers]);

  // Reset & sync state whenever dialog opens
  useEffect(() => {
    if (!open) return;

    const chosenType = defaultType || initialType || "receivable";
    setType(chosenType);

    const todayStr = new Date().toISOString().slice(0, 10);
    setIssueDate(todayStr);

    const targetCustId = defaultCustomerId || preselectedCustomerId || "";
    const targetSuppId = defaultSupplierId || preselectedSupplierId || "";

    if (chosenType === "receivable") {
      const activeCust = targetCustId || (localCustomers[0]?.id ?? "");
      setCustomerId(activeCust);
      const custObj = localCustomers.find((c) => c.id === activeCust);
      const days = custObj?.creditTermsDays ?? 15;
      setDueDate(calculateDueDate(todayStr, days));
    } else {
      const activeSupp = targetSuppId || (localSuppliers[0]?.id ?? "");
      setSupplierId(activeSupp);
      const suppObj = localSuppliers.find((s) => s.id === activeSupp);
      const days = suppObj?.paymentTermsDays ?? 30;
      setDueDate(calculateDueDate(todayStr, days));
    }

    setInvoiceNumber("");
    setAmountRupees("");
    setNotes("");
    setErrors({});
    setShowQuickAdd(false);
  }, [
    open,
    initialType,
    defaultType,
    preselectedCustomerId,
    defaultCustomerId,
    preselectedSupplierId,
    defaultSupplierId,
  ]);

  // Pick first available counterparty if list loaded asynchronously and none was pre-selected
  useEffect(() => {
    if (!open) return;
    if (type === "receivable" && !customerId && localCustomers.length > 0) {
      const targetId = defaultCustomerId || preselectedCustomerId || localCustomers[0]?.id || "";
      setCustomerId(targetId);
      const cust = localCustomers.find((c) => c.id === targetId);
      const days = cust?.creditTermsDays ?? 15;
      if (issueDate) setDueDate(calculateDueDate(issueDate, days));
    } else if (type === "payable" && !supplierId && localSuppliers.length > 0) {
      const targetId = defaultSupplierId || preselectedSupplierId || localSuppliers[0]?.id || "";
      setSupplierId(targetId);
      const supp = localSuppliers.find((s) => s.id === targetId);
      const days = supp?.paymentTermsDays ?? 30;
      if (issueDate) setDueDate(calculateDueDate(issueDate, days));
    }
  }, [
    open,
    type,
    localCustomers,
    localSuppliers,
    customerId,
    supplierId,
    defaultCustomerId,
    preselectedCustomerId,
    defaultSupplierId,
    preselectedSupplierId,
    issueDate,
  ]);

  const handleTypeToggle = (newType: InvoiceType) => {
    setType(newType);
    setErrors({});
    setShowQuickAdd(false);
    if (newType === "receivable") {
      const targetCustId = defaultCustomerId || preselectedCustomerId || localCustomers[0]?.id || "";
      setCustomerId(targetIdOrEmpty(targetCustId, localCustomers));
      const custObj = localCustomers.find((c) => c.id === targetCustId);
      const days = custObj?.creditTermsDays ?? 15;
      if (issueDate) setDueDate(calculateDueDate(issueDate, days));
    } else {
      const targetSuppId = defaultSupplierId || preselectedSupplierId || localSuppliers[0]?.id || "";
      setSupplierId(targetIdOrEmpty(targetSuppId, localSuppliers));
      const suppObj = localSuppliers.find((s) => s.id === targetSuppId);
      const days = suppObj?.paymentTermsDays ?? 30;
      if (issueDate) setDueDate(calculateDueDate(issueDate, days));
    }
  };

  const targetIdOrEmpty = (id: string, list: Array<{ id: string }>) => {
    if (id && list.some((item) => item.id === id)) return id;
    return list[0]?.id ?? "";
  };

  // Auto-calculate due date when customer changes
  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    const selected = localCustomers.find((c) => c.id === id);
    const days = selected?.creditTermsDays ?? 15;
    if (issueDate) {
      setDueDate(calculateDueDate(issueDate, days));
    }
    if (errors.counterparty) {
      setErrors((prev) => ({ ...prev, counterparty: undefined }));
    }
  };

  // Auto-calculate due date when supplier changes
  const handleSupplierChange = (id: string) => {
    setSupplierId(id);
    const selected = localSuppliers.find((s) => s.id === id);
    const days = selected?.paymentTermsDays ?? 30;
    if (issueDate) {
      setDueDate(calculateDueDate(issueDate, days));
    }
    if (errors.counterparty) {
      setErrors((prev) => ({ ...prev, counterparty: undefined }));
    }
  };

  const handleIssueDateChange = (val: string) => {
    setIssueDate(val);
    if (!val) return;
    if (type === "receivable") {
      const c = localCustomers.find((cust) => cust.id === customerId);
      const days = c?.creditTermsDays ?? 15;
      setDueDate(calculateDueDate(val, days));
    } else {
      const s = localSuppliers.find((supp) => supp.id === supplierId);
      const days = s?.paymentTermsDays ?? 30;
      setDueDate(calculateDueDate(val, days));
    }
    if (errors.issueDate) {
      setErrors((prev) => ({ ...prev, issueDate: undefined }));
    }
  };

  const handleQuickAddEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddName.trim()) {
      toast.error("Please enter a name.");
      return;
    }

    try {
      setIsQuickAdding(true);
      if (type === "receivable") {
        const newCust = await customerApi.create({
          name: quickAddName.trim(),
          creditTermsDays: Number(quickAddTerms) || 15,
        });
        setLocalCustomers((prev) => [newCust, ...prev]);
        setCustomerId(newCust.id);
        const days = newCust.creditTermsDays ?? 15;
        if (issueDate) setDueDate(calculateDueDate(issueDate, days));
        toast.success(`Customer "${newCust.name}" added and selected.`);
      } else {
        const newSupp = await supplierApi.create({
          name: quickAddName.trim(),
          paymentTermsDays: Number(quickAddTerms) || 30,
        });
        setLocalSuppliers((prev) => [newSupp, ...prev]);
        setSupplierId(newSupp.id);
        const days = newSupp.paymentTermsDays ?? 30;
        if (issueDate) setDueDate(calculateDueDate(issueDate, days));
        toast.success(`Supplier "${newSupp.name}" added and selected.`);
      }

      setQuickAddName("");
      setShowQuickAdd(false);
      setErrors((prev) => ({ ...prev, counterparty: undefined }));
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add entity.");
    } finally {
      setIsQuickAdding(false);
    }
  };

  const validate = (): boolean => {
    const errs: InvoiceFormErrors = {};
    const cleanAmountStr = String(amountRupees).replace(/,/g, "").trim();
    const parsedAmt = parseFloat(cleanAmountStr);

    if (!cleanAmountStr || Number.isNaN(parsedAmt) || parsedAmt <= 0) {
      errs.amount = "Invoice amount must be greater than ₹0.";
    }

    if (type === "receivable" && !customerId) {
      errs.counterparty = "Please select or quick-add a customer.";
    }
    if (type === "payable" && !supplierId) {
      errs.counterparty = "Please select or quick-add a supplier.";
    }

    if (!issueDate) {
      errs.issueDate = "Issue date is required.";
    }
    if (!dueDate) {
      errs.dueDate = "Due date is required.";
    } else if (issueDate && dueDate < issueDate) {
      errs.dueDate = "Due date cannot be earlier than issue date.";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      const cleanAmountStr = String(amountRupees).replace(/,/g, "").trim();
      const paise = Math.round(parseFloat(cleanAmountStr) * 100);

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

  const activeCustomer = localCustomers.find((c) => c.id === customerId);
  const activeSupplier = localSuppliers.find((s) => s.id === supplierId);
  const currentTermsDays =
    type === "receivable"
      ? (activeCustomer?.creditTermsDays ?? 15)
      : (activeSupplier?.paymentTermsDays ?? 30);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {type === "receivable" ? "Create Customer Invoice" : "Record Supplier Bill"}
            </DialogTitle>
            <DialogDescription>
              {type === "receivable"
                ? "Issue an accounts receivable invoice for goods or services delivered."
                : "Record an incoming vendor bill or raw material supplier payable."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Invoice Type Selector */}
            <div className="grid gap-1.5">
              <Label className="text-xs font-semibold">Invoice Classification</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={type === "receivable" ? "default" : "outline"}
                  onClick={() => handleTypeToggle("receivable")}
                  disabled={isSubmitting}
                  className="w-full text-xs font-medium"
                >
                  Receivable (Customer Invoice)
                </Button>
                <Button
                  type="button"
                  variant={type === "payable" ? "default" : "outline"}
                  onClick={() => handleTypeToggle("payable")}
                  disabled={isSubmitting}
                  className="w-full text-xs font-medium"
                >
                  Payable (Supplier Bill)
                </Button>
              </div>
            </div>

            {/* Counterparty Selection */}
            {type === "receivable" ? (
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="inv-customer" className="text-xs font-semibold">
                    Customer <span className="text-destructive">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickAdd(!showQuickAdd);
                      setQuickAddTerms(15);
                    }}
                    className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    {showQuickAdd ? "Cancel Quick Add" : "+ Quick Add Customer"}
                  </button>
                </div>

                {!showQuickAdd ? (
                  <>
                    <Select
                      value={customerId}
                      onValueChange={handleCustomerChange}
                      disabled={isSubmitting || isLoadingEntities}
                    >
                      <SelectTrigger id="inv-customer">
                        <SelectValue
                          placeholder={
                            isLoadingEntities
                              ? "Loading customers..."
                              : localCustomers.length === 0
                              ? "No customers available — Quick add one"
                              : "Select customer"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[100] max-h-60 overflow-y-auto">
                        {localCustomers
                          .filter((c) => c.status !== "archived")
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} (Net {c.creditTermsDays ?? 15}d)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {localCustomers.length === 0 && !isLoadingEntities && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        No registered customers found. Click <strong>+ Quick Add Customer</strong> above to proceed.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="p-3 rounded-lg border border-border/80 bg-muted/40 space-y-2.5">
                    <span className="text-xs font-semibold text-foreground block">
                      Quick Add New Customer
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Input
                          placeholder="Customer Business Name"
                          value={quickAddName}
                          onChange={(e) => setQuickAddName(e.target.value)}
                          className="h-8 text-xs"
                          disabled={isQuickAdding}
                          autoFocus
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          placeholder="Net days (15)"
                          value={quickAddTerms}
                          onChange={(e) => setQuickAddTerms(Number(e.target.value))}
                          className="h-8 text-xs"
                          disabled={isQuickAdding}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowQuickAdd(false)}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleQuickAddEntity}
                        disabled={isQuickAdding || !quickAddName.trim()}
                        className="h-7 text-xs font-medium"
                      >
                        {isQuickAdding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Save & Select
                      </Button>
                    </div>
                  </div>
                )}

                {errors.counterparty && (
                  <p className="text-xs text-destructive">{errors.counterparty}</p>
                )}
              </div>
            ) : (
              <div className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="inv-supplier" className="text-xs font-semibold">
                    Supplier <span className="text-destructive">*</span>
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowQuickAdd(!showQuickAdd);
                      setQuickAddTerms(30);
                    }}
                    className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    {showQuickAdd ? "Cancel Quick Add" : "+ Quick Add Supplier"}
                  </button>
                </div>

                {!showQuickAdd ? (
                  <>
                    <Select
                      value={supplierId}
                      onValueChange={handleSupplierChange}
                      disabled={isSubmitting || isLoadingEntities}
                    >
                      <SelectTrigger id="inv-supplier">
                        <SelectValue
                          placeholder={
                            isLoadingEntities
                              ? "Loading suppliers..."
                              : localSuppliers.length === 0
                              ? "No suppliers available — Quick add one"
                              : "Select supplier"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent position="popper" className="z-[100] max-h-60 overflow-y-auto">
                        {localSuppliers
                          .filter((s) => s.status !== "archived")
                          .map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} (Net {s.paymentTermsDays ?? 30}d)
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {localSuppliers.length === 0 && !isLoadingEntities && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                        No registered suppliers found. Click <strong>+ Quick Add Supplier</strong> above to proceed.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="p-3 rounded-lg border border-border/80 bg-muted/40 space-y-2.5">
                    <span className="text-xs font-semibold text-foreground block">
                      Quick Add New Supplier
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <Input
                          placeholder="Supplier / Mill Name"
                          value={quickAddName}
                          onChange={(e) => setQuickAddName(e.target.value)}
                          className="h-8 text-xs"
                          disabled={isQuickAdding}
                          autoFocus
                        />
                      </div>
                      <div>
                        <Input
                          type="number"
                          placeholder="Net days (30)"
                          value={quickAddTerms}
                          onChange={(e) => setQuickAddTerms(Number(e.target.value))}
                          className="h-8 text-xs"
                          disabled={isQuickAdding}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowQuickAdd(false)}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleQuickAddEntity}
                        disabled={isQuickAdding || !quickAddName.trim()}
                        className="h-7 text-xs font-medium"
                      >
                        {isQuickAdding ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                        Save & Select
                      </Button>
                    </div>
                  </div>
                )}

                {errors.counterparty && (
                  <p className="text-xs text-destructive">{errors.counterparty}</p>
                )}
              </div>
            )}

            {/* Invoice Number & Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="inv-num" className="text-xs font-semibold">
                  Invoice / Bill # (Optional)
                </Label>
                <Input
                  id="inv-num"
                  placeholder={type === "receivable" ? "INV-2026-XXXX" : "BILL-2026-XXXX"}
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="inv-amount" className="text-xs font-semibold">
                  Total Amount (₹) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="inv-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="e.g. 25000"
                  value={amountRupees}
                  onChange={(e) => {
                    setAmountRupees(e.target.value);
                    if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                  }}
                  disabled={isSubmitting}
                />
                {errors.amount && <p className="text-xs text-destructive">{errors.amount}</p>}
              </div>
            </div>

            {/* Issue Date & Due Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="inv-issue" className="text-xs font-semibold">
                  Issue Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="inv-issue"
                  type="date"
                  value={issueDate}
                  onChange={(e) => handleIssueDateChange(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.issueDate && <p className="text-xs text-destructive">{errors.issueDate}</p>}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="inv-due" className="text-xs font-semibold">
                  Payment Due Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="inv-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value);
                    if (errors.dueDate) setErrors((prev) => ({ ...prev, dueDate: undefined }));
                  }}
                  disabled={isSubmitting}
                />
                {dueDate && (
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                    <span>
                      Auto-set to Net {currentTermsDays} days ({dueDate})
                    </span>
                  </p>
                )}
                {errors.dueDate && <p className="text-xs text-destructive">{errors.dueDate}</p>}
              </div>
            </div>

            {/* Notes */}
            <div className="grid gap-1.5">
              <Label htmlFor="inv-notes" className="text-xs font-semibold">
                Notes / Itemization Description
              </Label>
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
            <Button type="submit" disabled={isSubmitting || isQuickAdding}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  Creating...
                </>
              ) : (
                "Create Invoice"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
