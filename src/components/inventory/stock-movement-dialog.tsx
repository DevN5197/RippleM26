import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ArrowRight, CheckCircle2 } from "lucide-react";
import type {
  Product,
  InventoryItemWithDetails,
  InventoryMovementType,
  PurchaseOrder,
  CustomerOrder,
} from "@/types";

const movementSchema = z.object({
  productId: z.string().min(1, "Please select a product"),
  type: z.enum(["receipt", "sale", "reservation", "reservation_release", "adjustment", "return"]),
  quantity: z
    .number({ invalid_type_error: "Must be a valid number" })
    .int("Must be an integer")
    .min(1, "Quantity must be greater than zero"),
  date: z.string().min(1, "Date is required"),
  referenceType: z
    .enum(["purchase_order", "customer_order", "adjustment", "manual", "return"])
    .optional(),
  referenceId: z.string().optional(),
  note: z.string().optional(),
});

export type MovementFormValues = z.infer<typeof movementSchema>;

interface StockMovementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: InventoryItemWithDetails[];
  purchaseOrders: PurchaseOrder[];
  customerOrders: CustomerOrder[];
  prefilledProductId?: string | null | undefined;
  onSubmit: (values: MovementFormValues) => Promise<void>;
}

export function StockMovementDialog({
  open,
  onOpenChange,
  products,
  purchaseOrders,
  customerOrders,
  prefilledProductId,
  onSubmit,
}: StockMovementDialogProps) {
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [pendingValues, setPendingValues] = useState<MovementFormValues | null>(null);

  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementSchema),
    defaultValues: {
      productId: prefilledProductId || "",
      type: "receipt",
      quantity: 1,
      date: new Date().toISOString().slice(0, 10),
      referenceType: "manual",
      referenceId: "",
      note: "",
    },
  });

  const selectedProductId = form.watch("productId");
  const selectedType = form.watch("type");
  const selectedQuantity = form.watch("quantity") || 0;

  const selectedProductRow = products.find((p) => p.product.id === selectedProductId);

  // Sync prefilled product
  useEffect(() => {
    if (open) {
      setIsReviewStep(false);
      setPendingValues(null);
      form.reset({
        productId: prefilledProductId || products[0]?.product.id || "",
        type: "receipt",
        quantity: 1,
        date: new Date().toISOString().slice(0, 10),
        referenceType: "manual",
        referenceId: "",
        note: "",
      });
    }
  }, [open, prefilledProductId, products, form]);

  // Adjust reference type when movement type changes
  useEffect(() => {
    if (selectedType === "receipt") {
      form.setValue("referenceType", "purchase_order");
    } else if (
      selectedType === "sale" ||
      selectedType === "reservation" ||
      selectedType === "reservation_release"
    ) {
      form.setValue("referenceType", "customer_order");
    } else if (selectedType === "adjustment") {
      form.setValue("referenceType", "adjustment");
    } else if (selectedType === "return") {
      form.setValue("referenceType", "return");
    }
  }, [selectedType, form]);

  // Filter POs and COs for selected product
  const relevantPurchaseOrders = purchaseOrders.filter(
    (po) =>
      po.productId === selectedProductId ||
      po.lineItems?.some((li) => li.productId === selectedProductId),
  );

  const relevantCustomerOrders = customerOrders.filter((co) => co.productId === selectedProductId);

  // Check if material adjustment requires review step (> 10 units or > 20% of stock)
  const isMaterialAdjustment =
    selectedType === "adjustment" &&
    (selectedQuantity >= 10 ||
      (selectedProductRow &&
        selectedProductRow.stockOnHand > 0 &&
        selectedQuantity / selectedProductRow.stockOnHand >= 0.2));

  const handleFormSubmit = async (values: MovementFormValues) => {
    // If adjustment requires note
    if (values.type === "adjustment" && (!values.note || values.note.trim() === "")) {
      form.setError("note", { message: "A reason is mandatory for stock adjustments." });
      return;
    }

    // Material adjustment review step
    if (isMaterialAdjustment && !isReviewStep) {
      setPendingValues(values);
      setIsReviewStep(true);
      return;
    }

    try {
      await onSubmit(values);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof Error) {
        form.setError("root", { message: err.message });
      }
    }
  };

  const confirmMaterialAdjustment = async () => {
    if (!pendingValues) return;
    try {
      await onSubmit(pendingValues);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof Error) {
        form.setError("root", { message: err.message });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isReviewStep ? "Review Material Stock Adjustment" : "Record Stock Movement"}
          </DialogTitle>
          <DialogDescription>
            {isReviewStep
              ? "Please confirm this high-impact stock adjustment before applying."
              : "Record stock receipts, sales fulfillments, reservations, or inventory adjustments."}
          </DialogDescription>
        </DialogHeader>

        {form.formState.errors.root && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Operation error</AlertTitle>
            <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
          </Alert>
        )}

        {isReviewStep && pendingValues && selectedProductRow ? (
          <div className="space-y-4 py-2">
            <div className="rounded-lg border border-warning/50 bg-warning/10 p-4">
              <div className="flex items-center gap-2 text-warning-foreground font-semibold text-sm">
                <AlertTriangle className="h-4 w-4" />
                Material Stock Adjustment Confirmation
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                You are adjusting stock for{" "}
                <span className="font-semibold text-foreground">
                  {selectedProductRow.product.name}
                </span>{" "}
                ({selectedProductRow.product.sku}) by{" "}
                <span className="font-semibold text-foreground">
                  {pendingValues.quantity} units
                </span>
                .
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded bg-background/80 p-2 border">
                  <span className="text-muted-foreground block text-[11px]">Current On-Hand</span>
                  <span className="font-bold text-base text-foreground">
                    {selectedProductRow.stockOnHand}
                  </span>
                </div>
                <div className="rounded bg-background/80 p-2 border">
                  <span className="text-muted-foreground block text-[11px]">Reason</span>
                  <span className="font-medium text-foreground">{pendingValues.note}</span>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setIsReviewStep(false)}>
                Back to Edit
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={confirmMaterialAdjustment}
                disabled={form.formState.isSubmitting}
              >
                Confirm & Apply Adjustment
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
              {/* Product Selector */}
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.product.id} value={p.product.id}>
                              {p.product.name} ({p.product.sku}) — {p.stockOnHand} on hand
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    {selectedProductRow && (
                      <FormDescription className="text-[11px]">
                        Available: {selectedProductRow.availableStock} · Reserved:{" "}
                        {selectedProductRow.reservedStock} · Reorder point:{" "}
                        {selectedProductRow.reorderThreshold}
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Movement Type */}
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Movement type *</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={(val) => field.onChange(val as InventoryMovementType)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="receipt">Stock Receipt (PO / Vendor)</SelectItem>
                          <SelectItem value="sale">Sale / Customer Fulfillment</SelectItem>
                          <SelectItem value="reservation">Reserve Stock</SelectItem>
                          <SelectItem value="reservation_release">Release Reservation</SelectItem>
                          <SelectItem value="adjustment">
                            Stock Adjustment (Count / Shrinkage)
                          </SelectItem>
                          <SelectItem value="return">Return (Customer / Vendor)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Quantity */}
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Date */}
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date & Time *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Dynamic References */}
              {selectedType === "receipt" && (
                <FormField
                  control={form.control}
                  name="referenceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Purchase Order</FormLabel>
                      <FormControl>
                        {relevantPurchaseOrders.length > 0 ? (
                          <Select
                            value={field.value || "manual"}
                            onValueChange={(val) => field.onChange(val === "manual" ? "" : val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select purchase order" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">None / Direct Supplier Invoice</SelectItem>
                              {relevantPurchaseOrders.map((po) => (
                                <SelectItem key={po.id} value={po.id}>
                                  {po.poNumber || po.id} ({po.quantity} units, status: {po.status})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input
                            placeholder="Enter PO number or invoice reference (e.g. PO-2026-001)"
                            {...field}
                          />
                        )}
                      </FormControl>
                      <FormDescription className="text-[11px]">
                        Receiving against a PO updates ordered and received unit counts.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {(selectedType === "sale" || selectedType === "reservation") && (
                <FormField
                  control={form.control}
                  name="referenceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Related Customer Order</FormLabel>
                      <FormControl>
                        {relevantCustomerOrders.length > 0 ? (
                          <Select
                            value={field.value || "manual"}
                            onValueChange={(val) => field.onChange(val === "manual" ? "" : val)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select customer order" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manual">None / Retail Sale</SelectItem>
                              {relevantCustomerOrders.map((co) => (
                                <SelectItem key={co.id} value={co.id}>
                                  {co.id} ({co.quantity} units, delivery: {co.deliveryDate || "TBD"}
                                  )
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Input placeholder="Enter customer order ID (e.g. CO-101)" {...field} />
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Note / Reason */}
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {selectedType === "adjustment" ? "Reason for adjustment *" : "Optional note"}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={
                          selectedType === "adjustment"
                            ? "Mandatory explanation (e.g. physical cycle count discrepancy, damaged bolt, shrinkage)..."
                            : "Reference notes, delivery vehicle info, invoice number..."
                        }
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Recording..." : "Record Movement"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
