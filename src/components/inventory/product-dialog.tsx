import React, { useEffect } from "react";
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
import type { Product, Supplier } from "@/types";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z
    .string()
    .min(1, "SKU is required")
    .regex(/^[A-Za-z0-9_-]+$/, "SKU may only contain letters, numbers, hyphens and underscores"),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  unitOfMeasure: z.string().min(1, "Unit of measurement is required"),
  initialStockQuantity: z
    .number({ invalid_type_error: "Must be a valid number" })
    .int("Must be an integer")
    .min(0, "Initial stock quantity cannot be negative")
    .default(0),
  reorderPoint: z
    .number({ invalid_type_error: "Must be a valid number" })
    .int("Must be an integer")
    .min(0, "Reorder threshold cannot be negative"),
  preferredSupplierId: z.string().optional(),
  unitCostRupees: z
    .number({ invalid_type_error: "Must be a valid number" })
    .min(0, "Unit cost cannot be negative")
    .optional(),
  currency: z.enum(["INR", "USD", "EUR"]).default("INR"),
});

export type ProductFormValues = z.infer<typeof productSchema>;

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null | undefined; // If provided, edit mode; otherwise create mode
  suppliers: Supplier[];
  categories: string[];
  onSubmit: (values: ProductFormValues, isEdit: boolean) => Promise<void>;
}

export function ProductDialog({
  open,
  onOpenChange,
  product,
  suppliers,
  categories,
  onSubmit,
}: ProductDialogProps) {
  const isEdit = Boolean(product);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      category: "Kurtis & Tunics",
      description: "",
      unitOfMeasure: "pieces",
      initialStockQuantity: 0,
      reorderPoint: 10,
      preferredSupplierId: undefined,
      unitCostRupees: 0,
      currency: "INR",
    },
  });

  // Reset form when dialog opens or editing product changes
  useEffect(() => {
    if (open) {
      if (product) {
        form.reset({
          name: product.name,
          sku: product.sku,
          category: product.category || "General",
          description: product.description || "",
          unitOfMeasure: product.unitOfMeasure || "pieces",
          initialStockQuantity: 0, // Ignored in edit mode
          reorderPoint: product.reorderPoint,
          preferredSupplierId: product.preferredSupplierId || undefined,
          unitCostRupees: product.unitCostPaise > 0 ? product.unitCostPaise / 100 : 0,
          currency: product.currency || "INR",
        });
      } else {
        form.reset({
          name: "",
          sku: "",
          category: categories[0] || "Kurtis & Tunics",
          description: "",
          unitOfMeasure: "pieces",
          initialStockQuantity: 0,
          reorderPoint: 15,
          preferredSupplierId: undefined,
          unitCostRupees: 0,
          currency: "INR",
        });
      }
    }
  }, [open, product, form, categories]);

  const handleSubmit = async (values: ProductFormValues) => {
    try {
      await onSubmit(values, isEdit);
      onOpenChange(false);
    } catch (err) {
      if (err instanceof Error) {
        form.setError("sku", { message: err.message });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Product" : "Add Product"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update product details, category and procurement thresholds."
              : "Register a new product SKU into the inventory catalog."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Product Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Cotton Handloom Kurti" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* SKU */}
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. KUR-COT-001"
                        className="font-mono uppercase"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Category */}
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Kurtis & Tunics" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit of Measurement */}
              <FormField
                control={form.control}
                name="unitOfMeasure"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit of measure *</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pieces">Pieces (pcs)</SelectItem>
                          <SelectItem value="meters">Meters (m)</SelectItem>
                          <SelectItem value="kg">Kilograms (kg)</SelectItem>
                          <SelectItem value="boxes">Boxes</SelectItem>
                          <SelectItem value="sets">Sets</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Product fabric specs, colorways, fitting, or care instructions..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Initial Stock (Only for new products) */}
              {!isEdit && (
                <FormField
                  control={form.control}
                  name="initialStockQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial stock</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormDescription className="text-[11px]">
                        Units currently on hand
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Reorder Threshold */}
              <FormField
                control={form.control}
                name="reorderPoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder threshold *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription className="text-[11px]">
                      Triggers low-stock alert
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Unit Cost (₹) */}
              <FormField
                control={form.control}
                name="unitCostRupees"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit cost (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        placeholder="0.00"
                        {...field}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription className="text-[11px]">Base purchase cost</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Preferred Supplier */}
              <FormField
                control={form.control}
                name="preferredSupplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred supplier</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value || "none"}
                        onValueChange={(val) => field.onChange(val === "none" ? undefined : val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None specified</SelectItem>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name} ({s.paymentTermsDays}d terms)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormDescription className="text-[11px]">
                      Used for automated reorder recommendations
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Currency */}
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="INR">INR (₹) — Indian Rupee</SelectItem>
                          <SelectItem value="USD">USD ($) — US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR (€) — Euro</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting
                  ? "Saving..."
                  : isEdit
                    ? "Update Product"
                    : "Create Product"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
