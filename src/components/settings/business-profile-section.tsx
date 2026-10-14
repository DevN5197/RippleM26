import { useState, useEffect } from "react";
import { Building2, Save, Undo2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Business, CurrencyCode } from "@/types";

interface BusinessProfileSectionProps {
  business: Business;
  onSave: (data: Partial<Business>) => Promise<void>;
  isSaving: boolean;
}

export function BusinessProfileSection({
  business,
  onSave,
  isSaving,
}: BusinessProfileSectionProps) {
  const [name, setName] = useState(business.name ?? "");
  const [ownerName, setOwnerName] = useState(business.ownerName ?? "");
  const [ownerEmail, setOwnerEmail] = useState(business.ownerEmail ?? "");
  const [phone, setPhone] = useState(business.phone ?? "");
  const [address, setAddress] = useState(business.address ?? "");
  const [industry, setIndustry] = useState(business.industry ?? "");
  const [currency, setCurrency] = useState<CurrencyCode>(business.currency ?? "INR");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setName(business.name ?? "");
    setOwnerName(business.ownerName ?? "");
    setOwnerEmail(business.ownerEmail ?? "");
    setPhone(business.phone ?? "");
    setAddress(business.address ?? "");
    setIndustry(business.industry ?? "");
    setCurrency(business.currency ?? "INR");
    setErrors({});
  }, [business]);

  const handleReset = () => {
    setName(business.name ?? "");
    setOwnerName(business.ownerName ?? "");
    setOwnerEmail(business.ownerEmail ?? "");
    setPhone(business.phone ?? "");
    setAddress(business.address ?? "");
    setIndustry(business.industry ?? "");
    setCurrency(business.currency ?? "INR");
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors["name"] = "Business name is required";
    }
    if (ownerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
      newErrors["ownerEmail"] = "Invalid email format";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    await onSave({
      name: name.trim(),
      ownerName: ownerName.trim(),
      ownerEmail: ownerEmail.trim(),
      phone: phone.trim(),
      address: address.trim(),
      industry: industry.trim(),
      currency,
    });
  };

  const hasChanges =
    name !== (business.name ?? "") ||
    ownerName !== (business.ownerName ?? "") ||
    ownerEmail !== (business.ownerEmail ?? "") ||
    phone !== (business.phone ?? "") ||
    address !== (business.address ?? "") ||
    industry !== (business.industry ?? "") ||
    currency !== (business.currency ?? "INR");

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Building2 className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Business Profile</CardTitle>
              <CardDescription>
                Company registration details, primary point of contact, and default operating currency.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="biz-name">Business Name *</Label>
              <Input
                id="biz-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rupi Clothing"
                disabled={isSaving}
              />
              {errors["name"] ? (
                <p className="text-xs text-destructive">{errors["name"]}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="biz-owner">Owner / Contact Name</Label>
              <Input
                id="biz-owner"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Demo Owner"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="biz-email">Email Address</Label>
              <Input
                id="biz-email"
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="e.g. owner@rupiclothing.in"
                disabled={isSaving}
              />
              {errors["ownerEmail"] ? (
                <p className="text-xs text-destructive">{errors["ownerEmail"]}</p>
              ) : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="biz-phone">Phone Number</Label>
              <Input
                id="biz-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98200 54321"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="biz-industry">Industry</Label>
              <Input
                id="biz-industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. Apparel retail"
                disabled={isSaving}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="biz-currency">Operating Currency</Label>
              <Select
                value={currency}
                onValueChange={(val) => setCurrency(val as CurrencyCode)}
                disabled={isSaving}
              >
                <SelectTrigger id="biz-currency" className="w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INR">INR (₹ - Indian Rupee)</SelectItem>
                  <SelectItem value="USD">USD ($ - US Dollar)</SelectItem>
                  <SelectItem value="EUR">EUR (€ - Euro)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="biz-address">Business Address</Label>
            <Input
              id="biz-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Shop 14, Linking Road, Bandra West, Mumbai, Maharashtra 400050"
              disabled={isSaving}
            />
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {hasChanges ? "Unsaved changes" : "All changes up to date"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges || isSaving}
            >
              <Undo2 className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!hasChanges || isSaving}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {isSaving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
