import React, { useState, useEffect } from "react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Building2,
  Calendar,
  AlertTriangle,
  IndianRupee,
  ExternalLink,
  FlaskConical,
  Truck,
  PackageCheck,
} from "lucide-react";
import { formatMoney, formatDate } from "@/lib/formatters";
import type { Supplier, InventoryItemWithDetails, CreatePurchaseOrderInput } from "@/types";

interface PurchaseOrderWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suppliers: Supplier[];
  products: InventoryItemWithDetails[];
  prefilledProductId?: string | null | undefined;
  prefilledSupplierId?: string | null | undefined;
  onSubmit: (input: CreatePurchaseOrderInput) => Promise<string>; // returns created PO ID
  onSuccessNavigate?: (poId: string) => void;
}

interface LineItemState {
  id: string;
  productId: string;
  quantity: number;
  unitPriceRupees: number;
}

export function PurchaseOrderWizard({
  open,
  onOpenChange,
  suppliers,
  products,
  prefilledProductId,
  prefilledSupplierId,
  onSubmit,
  onSuccessNavigate,
}: PurchaseOrderWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdPoRef, setCreatedPoRef] = useState<string | null>(null);

  // Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");
  const [supplierSearch, setSupplierSearch] = useState<string>("");
  const [lineItems, setLineItems] = useState<LineItemState[]>([]);
  const [orderDate, setOrderDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState<string>("");
  const [paymentTermsDays, setPaymentTermsDays] = useState<number>(30);
  const [advancePercent, setAdvancePercent] = useState<number>(0);
  const [advanceAmountRupees, setAdvanceAmountRupees] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");

  const selectedSupplier = suppliers.find((s) => s.id === selectedSupplierId);

  // Initialize defaults on dialog open
  useEffect(() => {
    if (open) {
      setStep(1);
      setErrorMessage(null);
      setCreatedPoRef(null);
      setIsSubmitting(false);

      const targetSupplierId = prefilledSupplierId || (suppliers[0]?.id ?? "");
      setSelectedSupplierId(targetSupplierId);

      const supplier = suppliers.find((s) => s.id === targetSupplierId);
      const terms = supplier?.paymentTermsDays ?? 30;
      setPaymentTermsDays(terms);

      const today = new Date();
      setOrderDate(today.toISOString().slice(0, 10));

      const deliv = new Date(today);
      deliv.setDate(today.getDate() + (supplier?.reliabilityScore ? Math.round(terms / 3) : 7));
      setExpectedDeliveryDate(deliv.toISOString().slice(0, 10));

      // Prefill product line item
      const initialProdId = prefilledProductId || (products[0]?.product.id ?? "");
      const prod = products.find((p) => p.product.id === initialProdId);
      const unitCost = prod ? prod.unitCostPaise / 100 : 350;

      setLineItems([
        {
          id: "item_1",
          productId: initialProdId,
          quantity: 20,
          unitPriceRupees: unitCost,
        },
      ]);
      setAdvancePercent(0);
      setAdvanceAmountRupees(0);
      setNotes("");
    }
  }, [open, prefilledProductId, prefilledSupplierId, suppliers, products]);

  // Calculations using decimal-safe integers
  const totalQuantity = lineItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const subtotalPaise = lineItems.reduce(
    (sum, item) => sum + Math.round((item.quantity || 0) * (item.unitPriceRupees || 0) * 100),
    0,
  );
  const advancePaise = Math.round(advanceAmountRupees * 100);
  const balancePaise = Math.max(0, subtotalPaise - advancePaise);

  // Update advance amount when percent changes
  const handlePercentChange = (pct: number) => {
    setAdvancePercent(pct);
    const amountRupees = Math.round(((subtotalPaise / 100) * pct) / 100);
    setAdvanceAmountRupees(amountRupees);
  };

  const handleAdvanceAmountChange = (amount: number) => {
    setAdvanceAmountRupees(amount);
    const totalRupees = subtotalPaise / 100;
    if (totalRupees > 0) {
      setAdvancePercent(Math.round((amount / totalRupees) * 100));
    }
  };

  // Add line item
  const handleAddLineItem = () => {
    const availableProd =
      products.find((p) => !lineItems.some((li) => li.productId === p.product.id)) || products[0];
    if (!availableProd) return;

    setLineItems([
      ...lineItems,
      {
        id: `item_${Date.now()}`,
        productId: availableProd.product.id,
        quantity: 10,
        unitPriceRupees: availableProd.unitCostPaise / 100,
      },
    ]);
  };

  const handleRemoveLineItem = (id: string) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((item) => item.id !== id));
  };

  const handleUpdateLineItem = (id: string, field: keyof LineItemState, value: unknown) => {
    setLineItems(
      lineItems.map((item) => {
        if (item.id !== id) return item;
        if (field === "productId") {
          const prod = products.find((p) => p.product.id === value);
          return {
            ...item,
            productId: String(value),
            unitPriceRupees: prod ? prod.unitCostPaise / 100 : item.unitPriceRupees,
          };
        }
        return { ...item, [field]: value };
      }),
    );
  };

  // Step Validations
  const validateStep = (currentStep: number): boolean => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!selectedSupplierId) {
        setErrorMessage("Please select a supplier to proceed.");
        return false;
      }
    } else if (currentStep === 2) {
      if (lineItems.length === 0) {
        setErrorMessage("Please add at least one line item.");
        return false;
      }
      for (const item of lineItems) {
        if (!item.productId) {
          setErrorMessage("Please select a product for all line items.");
          return false;
        }
        if (item.quantity <= 0) {
          setErrorMessage("Quantity must be at least 1 unit.");
          return false;
        }
        if (item.unitPriceRupees < 0) {
          setErrorMessage("Unit price cannot be negative.");
          return false;
        }
      }
    } else if (currentStep === 3) {
      if (!orderDate) {
        setErrorMessage("Please specify the purchase order date.");
        return false;
      }
      if (!expectedDeliveryDate) {
        setErrorMessage("Please specify the expected delivery date.");
        return false;
      }
      if (advancePaise > subtotalPaise) {
        setErrorMessage("Advance payment cannot exceed the total order amount.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep((s) => (s < 5 ? ((s + 1) as 1 | 2 | 3 | 4 | 5) : 5));
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3 | 4 | 5) : 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload: CreatePurchaseOrderInput = {
        supplierId: selectedSupplierId,
        orderDate,
        expectedDeliveryDate,
        paymentTermsDays,
        advanceAmountPaise: advancePaise,
        notes: notes || undefined,
        lineItems: lineItems.map((li) => ({
          productId: li.productId,
          quantity: li.quantity,
          unitPricePaise: Math.round(li.unitPriceRupees * 100),
        })),
      };

      const poId = await onSubmit(payload);
      setCreatedPoRef(poId);
      setStep(5);
    } catch (err) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage("Failed to create purchase order.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredSuppliers = suppliers.filter(
    (s) =>
      s.name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
      s.contactName?.toLowerCase().includes(supplierSearch.toLowerCase()),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>Create Purchase Order</DialogTitle>
              <DialogDescription>
                Step {step} of 5: {step === 1 && "Select Supplier"}
                {step === 2 && "Configure Products & Line Items"}
                {step === 3 && "Timing & Payment Terms"}
                {step === 4 && "Review Financial Impact"}
                {step === 5 && "Confirmation & Summary"}
              </DialogDescription>
            </div>
            {/* Step indicator */}
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-2 w-6 rounded-full transition-colors ${
                    step === s ? "bg-primary" : step > s ? "bg-primary/40" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
        </DialogHeader>

        {errorMessage && (
          <Alert variant="destructive" className="my-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Validation error</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* STEP 1: SELECT SUPPLIER */}
        {step === 1 && (
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs text-muted-foreground">Search suppliers</Label>
              <Input
                placeholder="Search supplier name or contact..."
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                className="mt-1 h-9"
              />
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredSuppliers.map((supplier) => {
                const isSelected = selectedSupplierId === supplier.id;
                return (
                  <div
                    key={supplier.id}
                    onClick={() => {
                      setSelectedSupplierId(supplier.id);
                      setPaymentTermsDays(supplier.paymentTermsDays || 30);
                    }}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                        : "hover:bg-muted/30"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {supplier.name}
                        </span>
                        {isSelected && (
                          <Badge
                            variant="outline"
                            className="border-primary text-primary text-[10px]"
                          >
                            Selected
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3">
                        <span>Terms: {supplier.paymentTermsDays} days</span>
                        {supplier.contactName && <span>Contact: {supplier.contactName}</span>}
                        <span>Reliability: {supplier.reliabilityScore}%</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-muted-foreground block">Outstanding</span>
                      <span className="text-xs font-semibold text-foreground">
                        {formatMoney(supplier.outstandingPaise)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: SELECT PRODUCTS */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Order Line Items</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddLineItem}
                className="h-7 text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" /> Add line item
              </Button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {lineItems.map((item, index) => {
                const selectedProd = products.find((p) => p.product.id === item.productId);
                const lineTotal = (item.quantity || 0) * (item.unitPriceRupees || 0);

                return (
                  <Card key={item.id} className="p-3 shadow-none border bg-card/60">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
                      {/* Product Selector */}
                      <div className="flex-1 min-w-[200px]">
                        <Label className="text-[11px] text-muted-foreground font-medium">
                          Product #{index + 1} <span className="text-destructive font-bold">*</span>
                        </Label>
                        <Select
                          value={item.productId}
                          onValueChange={(val) => handleUpdateLineItem(item.id, "productId", val)}
                        >
                          <SelectTrigger className="h-8 text-xs mt-1 w-full">
                            <SelectValue placeholder="Select product" />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((p) => (
                              <SelectItem
                                key={p.product.id}
                                value={p.product.id}
                                className="text-xs"
                              >
                                {p.product.name} ({p.product.sku})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Quantity */}
                      <div className="w-full sm:w-24 shrink-0">
                        <Label className="text-[11px] text-muted-foreground font-medium">
                          Qty <span className="text-destructive font-bold">*</span>
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Qty"
                          value={item.quantity === 0 || item.quantity === undefined || item.quantity === null ? "" : item.quantity}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateLineItem(item.id, "quantity", val === "" ? 0 : Number(val));
                          }}
                          className="h-8 text-xs mt-1 tabular-nums font-mono"
                        />
                      </div>

                      {/* Unit Price (₹) */}
                      <div className="w-full sm:w-28 shrink-0">
                        <Label className="text-[11px] text-muted-foreground font-medium">Price (₹)</Label>
                        <Input
                          type="number"
                          min={0}
                          step="any"
                          placeholder="Price"
                          value={item.unitPriceRupees === 0 || item.unitPriceRupees === undefined ? "" : item.unitPriceRupees}
                          onChange={(e) => {
                            const val = e.target.value;
                            handleUpdateLineItem(item.id, "unitPriceRupees", val === "" ? 0 : Number(val));
                          }}
                          className="h-8 text-xs mt-1 font-mono tabular-nums"
                        />
                      </div>

                      {/* Line Total */}
                      <div className="w-full sm:w-28 shrink-0 text-left sm:text-right">
                        <Label className="text-[11px] text-muted-foreground block font-medium">
                          Line Total
                        </Label>
                        <span className="text-xs font-semibold text-foreground leading-8 block tabular-nums">
                          {formatMoney(Math.round(lineTotal * 100))}
                        </span>
                      </div>

                      {/* Remove */}
                      <div className="shrink-0 self-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={lineItems.length <= 1}
                          onClick={() => handleRemoveLineItem(item.id)}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          aria-label="Remove item"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {/* Subtotal Banner */}
            <div className="rounded-lg border bg-muted/40 p-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground font-medium">
                Total Units: <span className="text-foreground font-bold">{totalQuantity}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="text-base font-bold text-foreground">
                  {formatMoney(subtotalPaise)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: CONFIGURE TIMING & TERMS */}
        {step === 3 && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">
                  Purchase Order Date <span className="text-destructive font-bold">*</span>
                </Label>
                <div className="relative mt-1">
                  <Input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                    className="h-9 text-xs font-mono pr-9 cursor-text"
                  />
                  <input
                    type="date"
                    aria-label="Pick order date"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 opacity-0 cursor-pointer z-10"
                    value={orderDate?.slice(0, 10) || ""}
                    onChange={(e) => {
                      if (e.target.value) setOrderDate(e.target.value);
                    }}
                  />
                  <Calendar className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              <div>
                <Label className="text-xs">
                  Expected Delivery Date <span className="text-destructive font-bold">*</span>
                </Label>
                <div className="relative mt-1">
                  <Input
                    type="text"
                    placeholder="YYYY-MM-DD"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                    className="h-9 text-xs font-mono pr-9 cursor-text"
                  />
                  <input
                    type="date"
                    aria-label="Pick delivery date"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 opacity-0 cursor-pointer z-10"
                    value={expectedDeliveryDate?.slice(0, 10) || ""}
                    onChange={(e) => {
                      if (e.target.value) setExpectedDeliveryDate(e.target.value);
                    }}
                  />
                  <Calendar className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Payment Terms</Label>
                <Select
                  value={String(paymentTermsDays)}
                  onValueChange={(val) => setPaymentTermsDays(Number(val))}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Immediate / Due on receipt</SelectItem>
                    <SelectItem value="15">Net 15 days</SelectItem>
                    <SelectItem value="30">Net 30 days</SelectItem>
                    <SelectItem value="45">Net 45 days</SelectItem>
                    <SelectItem value="60">Net 60 days</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground mt-0.5 block">
                  Supplier standard: {selectedSupplier?.paymentTermsDays || 30} days
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Supplier Advance Payment</Label>
                  <span className="text-[11px] font-mono font-semibold text-primary">
                    Exact: {subtotalPaise > 0 ? ((advancePaise / subtotalPaise) * 100).toFixed(1).replace(/\.0$/, "") : "0"}%
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-24">
                    <Select
                      value={String(advancePercent)}
                      onValueChange={(val) => handlePercentChange(Number(val))}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0%</SelectItem>
                        <SelectItem value="10">10%</SelectItem>
                        <SelectItem value="15">15%</SelectItem>
                        <SelectItem value="20">20%</SelectItem>
                        <SelectItem value="25">25%</SelectItem>
                        <SelectItem value="50">50%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    placeholder="₹ advance"
                    value={advanceAmountRupees === 0 ? "" : advanceAmountRupees}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleAdvanceAmountChange(val === "" ? 0 : Number(val));
                    }}
                    className="h-9 text-xs font-mono tabular-nums"
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Advance: {formatMoney(advancePaise)}</span>
                  <span>Balance on delivery: {formatMoney(balancePaise)}</span>
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs">Notes or Delivery Instructions</Label>
              <Textarea
                placeholder="Include specifications, warehouse delivery dock, packing instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="mt-1 text-xs"
              />
            </div>
          </div>
        )}

        {/* STEP 4: REVIEW FINANCIAL IMPACT */}
        {step === 4 && (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs text-muted-foreground">Supplier</span>
                <span className="text-sm font-semibold text-foreground">
                  {selectedSupplier?.name}
                </span>
              </div>

              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs text-muted-foreground">Total Units & SKUs</span>
                <span className="text-xs font-medium text-foreground">
                  {totalQuantity} units across {lineItems.length} product(s)
                </span>
              </div>

              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs text-muted-foreground">Order Total (Estimate)</span>
                <span className="text-base font-bold text-foreground">
                  {formatMoney(subtotalPaise)}
                </span>
              </div>

              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs text-muted-foreground">Advance Payable Now</span>
                <span className="text-sm font-semibold text-foreground">
                  {advancePaise > 0 ? formatMoney(advancePaise) : "₹0 (No advance required)"}
                </span>
              </div>

              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs text-muted-foreground">Remaining Balance Due</span>
                <span className="text-sm font-semibold text-foreground">
                  {formatMoney(balancePaise)} (Net {paymentTermsDays}d after delivery)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Expected Inventory Increase</span>
                <span className="text-xs font-semibold text-primary">
                  +{totalQuantity} units on {formatDate(expectedDeliveryDate, "d MMM yyyy")}
                </span>
              </div>
            </div>

            {/* Impact & Simulation Links */}
            <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs space-y-2">
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <FlaskConical className="h-4 w-4 text-primary" />
                Working Capital & Forecast Impact
              </div>
              <p className="text-muted-foreground leading-relaxed text-[11px]">
                Placing this order commits{" "}
                <span className="font-semibold text-foreground">{formatMoney(subtotalPaise)}</span>{" "}
                in procurement outlays. You can review scheduled cash outflows on the cash flow
                forecast or simulate delay scenarios.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <Link
                  to="/cash-flow"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-primary font-medium hover:underline text-[11px]"
                >
                  Inspect Cash Flow <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
                <Link
                  to="/simulator"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-primary font-medium hover:underline text-[11px]"
                >
                  Test in Ripple Simulator <ExternalLink className="ml-1 h-3 w-3" />
                </Link>
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground text-center">
              * Note: Calculations are projected operational estimates until the purchase order is
              confirmed.
            </p>
          </div>
        )}

        {/* STEP 5: CONFIRMATION / SUCCESS */}
        {step === 5 && (
          <div className="space-y-4 py-6 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
              <PackageCheck className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-foreground">Purchase Order Created</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your purchase order reference has been logged. Incoming inventory stock counts,
              supplier commitments, and scheduled payments have been updated.
            </p>

            <div className="rounded-lg border bg-muted/30 p-3 max-w-sm mx-auto text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">PO Reference:</span>
                <span className="font-mono font-bold text-foreground">{createdPoRef}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Supplier:</span>
                <span className="font-medium text-foreground">{selectedSupplier?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Units:</span>
                <span className="font-medium text-foreground">{totalQuantity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Outlay:</span>
                <span className="font-bold text-foreground">{formatMoney(subtotalPaise)}</span>
              </div>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              {createdPoRef && onSuccessNavigate && (
                <Button
                  size="sm"
                  onClick={() => {
                    onOpenChange(false);
                    onSuccessNavigate(createdPoRef);
                  }}
                >
                  View Purchase Order
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Wizard Footer Controls */}
        {step < 5 && (
          <DialogFooter className="pt-4 border-t flex sm:justify-between items-center">
            <div>
              {step > 1 && (
                <Button type="button" variant="outline" size="sm" onClick={handleBack}>
                  <ChevronLeft className="mr-1 h-4 w-4" /> Back
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>

              {step < 4 ? (
                <Button type="button" size="sm" onClick={handleNext}>
                  Next <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button type="button" size="sm" onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Submitting Order..." : "Confirm & Place Purchase Order"}
                </Button>
              )}
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
