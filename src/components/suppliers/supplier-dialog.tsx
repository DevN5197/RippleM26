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
import { Building2 } from "lucide-react";
import type { Supplier, CreateSupplierInput, UpdateSupplierInput } from "@/types";

const supplierFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Supplier name must be at least 2 characters")
    .max(100, "Supplier name cannot exceed 100 characters"),
  contactName: z.string().trim().max(100).optional().or(z.literal("")),
  email: z.string().trim().email("Please enter a valid email address").optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(/^[+0-9\s-()]{7,20}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(250).optional().or(z.literal("")),
  taxId: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9]{5,20}$/, "Tax ID must be 5-20 alphanumeric characters (e.g. GSTIN)")
    .optional()
    .or(z.literal("")),
  paymentTermsDays: z
    .number({ invalid_type_error: "Must be a valid number of days" })
    .int("Must be an integer")
    .min(0, "Payment terms cannot be negative")
    .max(365, "Payment terms cannot exceed 365 days"),
  // NOTE: no `.default()` here. A zod default makes the schema's *input* type
  // optional while `z.infer` yields the *output* type where the field is required,
  // which desynchronises `zodResolver(schema)` from `useForm<SupplierFormValues>`.
  // Defaults live in `defaultValues` / `form.reset` instead.
  leadTimeDays: z
    .number({ invalid_type_error: "Must be a valid number of days" })
    .int("Must be an integer")
    .min(0, "Lead time cannot be negative")
    .max(365, "Lead time cannot exceed 365 days"),
  status: z.enum(["active", "archived"]),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export type SupplierFormValues = z.infer<typeof supplierFormSchema>;

interface SupplierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier?: Supplier | null; // null for Create, Supplier object for Edit
  onSubmit: (values: CreateSupplierInput | UpdateSupplierInput) => Promise<void>;
}

export function SupplierDialog({ open, onOpenChange, supplier, onSubmit }: SupplierDialogProps) {
  const isEditing = Boolean(supplier);

  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      name: "",
      contactName: "",
      email: "",
      phone: "",
      address: "",
      taxId: "",
      paymentTermsDays: 30,
      leadTimeDays: 7,
      status: "active",
      notes: "",
    },
  });

  const { isSubmitting } = form.formState;

  useEffect(() => {
    if (open) {
      if (supplier) {
        form.reset({
          name: supplier.name,
          contactName: supplier.contactName ?? "",
          email: supplier.email ?? "",
          phone: supplier.phone ?? "",
          address: supplier.address ?? "",
          taxId: supplier.taxId ?? "",
          paymentTermsDays: supplier.paymentTermsDays ?? 30,
          leadTimeDays: supplier.leadTimeDays ?? 7,
          status: supplier.status ?? "active",
          notes: supplier.notes ?? "",
        });
      } else {
        form.reset({
          name: "",
          contactName: "",
          email: "",
          phone: "",
          address: "",
          taxId: "",
          paymentTermsDays: 30,
          leadTimeDays: 7,
          status: "active",
          notes: "",
        });
      }
    }
  }, [open, supplier, form]);

  const handleSubmit = async (values: SupplierFormValues) => {
    const payload: CreateSupplierInput = {
      name: values.name.trim(),
      contactName: values.contactName?.trim() || undefined,
      email: values.email?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      address: values.address?.trim() || undefined,
      taxId: values.taxId?.trim() || undefined,
      paymentTermsDays: values.paymentTermsDays,
      leadTimeDays: values.leadTimeDays,
      status: values.status,
      notes: values.notes?.trim() || undefined,
    };

    try {
      await onSubmit(payload);
      onOpenChange(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save supplier";
      if (message.toLowerCase().includes("name") && message.toLowerCase().includes("exists")) {
        form.setError("name", { message });
      } else {
        form.setError("root", { message });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <div className="flex items-start gap-2.5 text-left">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary mt-0.5">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>{isEditing ? "Edit Supplier" : "Add New Supplier"}</DialogTitle>
              <DialogDescription className="text-xs mt-1">
                {isEditing
                  ? "Update vendor contact details, tax identification, and settlement terms."
                  : "Register a verified counterparty for purchase orders, payable invoices, and stock deliveries."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {form.formState.errors.root && (
              <div className="rounded-md bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {form.formState.errors.root.message}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>
                      Supplier / Company Name{" "}
                      <span className="text-destructive font-bold ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Shree Textiles Pvt Ltd" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Primary Contact Person</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Anil Shree" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="taxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax Identifier (GSTIN)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. 24AAACS1234F1Z8" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="orders@supplier.in" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input placeholder="+91 98200 12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="paymentTermsDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Payment Terms (Days){" "}
                      <span className="text-destructive font-bold ml-0.5">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="365"
                        placeholder="30"
                        value={field.value === 0 || field.value === undefined ? "" : field.value}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? 0 : Number(e.target.value))
                        }
                        className="tabular-nums"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Default invoice credit window (e.g. Net 30)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadTimeDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fulfillment Lead Time (Days)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        max="365"
                        placeholder="7"
                        value={field.value === 0 || field.value === undefined ? "" : field.value}
                        onChange={(e) =>
                          field.onChange(e.target.value === "" ? 0 : Number(e.target.value))
                        }
                        className="tabular-nums"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Expected days from PO dispatch to warehouse delivery
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Operational Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">
                          Active (Permits new orders and bills)
                        </SelectItem>
                        <SelectItem value="archived">
                          Archived / Deactivated (Read-only historical records)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Factory / Office Address</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Plot 42, GIDC Industrial Estate, Surat, Gujarat"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Internal Notes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Material quality notes, bank remittance instructions, preferred contact hours..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : isEditing ? "Update Supplier" : "Create Supplier"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
