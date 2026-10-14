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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import type { Customer, CreateCustomerInput, UpdateCustomerInput } from "@/types";

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer | null | undefined;
  onSubmit: (data: CreateCustomerInput | UpdateCustomerInput) => Promise<void>;
}

export function CustomerDialog({
  open,
  onOpenChange,
  customer,
  onSubmit,
}: CustomerDialogProps) {
  const isEdit = !!customer;

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [taxId, setTaxId] = useState("");
  const [creditTermsDays, setCreditTermsDays] = useState(15);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setContactName(customer.contactName || "");
      setEmail(customer.email || "");
      setPhone(customer.phone || "");
      setAddress(customer.address || "");
      setTaxId(customer.taxId || "");
      setCreditTermsDays(customer.creditTermsDays ?? 15);
      setNotes(customer.notes || "");
    } else {
      setName("");
      setContactName("");
      setEmail("");
      setPhone("");
      setAddress("");
      setTaxId("");
      setCreditTermsDays(15);
      setNotes("");
    }
    setErrors({});
  }, [customer, open]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = "Customer name must be at least 2 characters.";
    }
    if (email.trim() && !email.includes("@")) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (Number.isNaN(creditTermsDays) || creditTermsDays < 0) {
      newErrors.creditTermsDays = "Credit terms must be 0 or more days.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        name: name.trim(),
        contactName: contactName.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
        taxId: taxId.trim() || undefined,
        creditTermsDays: Number(creditTermsDays),
        notes: notes.trim() || undefined,
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save customer";
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
            <DialogTitle>{isEdit ? "Edit Customer" : "New Customer"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? `Update counterparty profile and credit terms for ${customer.name}.`
                : "Add a new customer account, credit payment terms, and billing details."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="customer-name">
                Business Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="customer-name"
                placeholder="e.g. Urban Threads Boutique"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="contact-name">Contact Person</Label>
                <Input
                  id="contact-name"
                  placeholder="e.g. Riya Kapoor"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="credit-terms">Credit Terms (Days)</Label>
                <Input
                  id="credit-terms"
                  type="number"
                  min="0"
                  max="180"
                  value={creditTermsDays}
                  onChange={(e) => setCreditTermsDays(Number(e.target.value))}
                  disabled={isSubmitting}
                />
                {errors.creditTermsDays && (
                  <p className="text-xs text-destructive">{errors.creditTermsDays}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="customer-email">Email Address</Label>
                <Input
                  id="customer-email"
                  type="email"
                  placeholder="accounts@boutique.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                />
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="grid gap-1.5">
                <Label htmlFor="customer-phone">Phone Number</Label>
                <Input
                  id="customer-phone"
                  placeholder="+91 98200 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="customer-taxid">GSTIN / Tax ID</Label>
              <Input
                id="customer-taxid"
                placeholder="29AABCU9603R1Z7"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="customer-address">Billing Address</Label>
              <Input
                id="customer-address"
                placeholder="Street address, city, state, pin"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="customer-notes">Internal Notes</Label>
              <Textarea
                id="customer-notes"
                placeholder="Notes on ordering behavior, special agreements, payment preferences..."
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
              {isSubmitting ? "Saving..." : isEdit ? "Update Customer" : "Create Customer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
