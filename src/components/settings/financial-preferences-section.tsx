import { useState, useEffect } from "react";
import { Coins, Save, Undo2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Business } from "@/types";

interface FinancialPreferencesSectionProps {
  business: Business;
  onSave: (data: Partial<Business>) => Promise<void>;
  isSaving: boolean;
}

export function FinancialPreferencesSection({
  business,
  onSave,
  isSaving,
}: FinancialPreferencesSectionProps) {
  // Financial amounts are in rupees in the form for user-friendliness, converted to paise on submit
  const [openingCashRupees, setOpeningCashRupees] = useState<string>(
    String((business.openingCashPaise ?? 0) / 100),
  );
  const [safetyThresholdRupees, setSafetyThresholdRupees] = useState<string>(
    String((business.safetyThresholdPaise ?? 500_000) / 100),
  );
  const [supplierTermsDays, setSupplierTermsDays] = useState<string>(
    String(business.defaultSupplierPaymentTermsDays ?? 30),
  );
  const [customerTermsDays, setCustomerTermsDays] = useState<string>(
    String(business.defaultCustomerPaymentTermsDays ?? 15),
  );
  const [forecastHorizon, setForecastHorizon] = useState<"7" | "14" | "30">(
    String(business.defaultForecastHorizonDays ?? 30) as "7" | "14" | "30",
  );
  const [taxRatePercent, setTaxRatePercent] = useState<string>(
    String(business.taxRatePercent ?? 18),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setOpeningCashRupees(String((business.openingCashPaise ?? 0) / 100));
    setSafetyThresholdRupees(String((business.safetyThresholdPaise ?? 500_000) / 100));
    setSupplierTermsDays(String(business.defaultSupplierPaymentTermsDays ?? 30));
    setCustomerTermsDays(String(business.defaultCustomerPaymentTermsDays ?? 15));
    setForecastHorizon(String(business.defaultForecastHorizonDays ?? 30) as "7" | "14" | "30");
    setTaxRatePercent(String(business.taxRatePercent ?? 18));
    setErrors({});
  }, [business]);

  const handleReset = () => {
    setOpeningCashRupees(String((business.openingCashPaise ?? 0) / 100));
    setSafetyThresholdRupees(String((business.safetyThresholdPaise ?? 500_000) / 100));
    setSupplierTermsDays(String(business.defaultSupplierPaymentTermsDays ?? 30));
    setCustomerTermsDays(String(business.defaultCustomerPaymentTermsDays ?? 15));
    setForecastHorizon(String(business.defaultForecastHorizonDays ?? 30) as "7" | "14" | "30");
    setTaxRatePercent(String(business.taxRatePercent ?? 18));
    setErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const openingVal = Number(openingCashRupees);
    if (isNaN(openingVal) || openingVal < 0) {
      newErrors["openingCash"] = "Opening cash must be a non-negative number";
    }

    const safetyVal = Number(safetyThresholdRupees);
    if (isNaN(safetyVal) || safetyVal < 0) {
      newErrors["safetyThreshold"] = "Threshold must be a non-negative number";
    }

    const supplierDays = Number(supplierTermsDays);
    if (isNaN(supplierDays) || supplierDays < 0 || !Number.isInteger(supplierDays)) {
      newErrors["supplierTerms"] = "Supplier terms must be a non-negative integer";
    }

    const customerDays = Number(customerTermsDays);
    if (isNaN(customerDays) || customerDays < 0 || !Number.isInteger(customerDays)) {
      newErrors["customerTerms"] = "Customer terms must be a non-negative integer";
    }

    const taxVal = Number(taxRatePercent);
    if (isNaN(taxVal) || taxVal < 0 || taxVal > 100) {
      newErrors["taxRate"] = "Tax rate must be between 0% and 100%";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    await onSave({
      openingCashPaise: Math.round(openingVal * 100),
      safetyThresholdPaise: Math.round(safetyVal * 100),
      defaultSupplierPaymentTermsDays: supplierDays,
      defaultCustomerPaymentTermsDays: customerDays,
      defaultForecastHorizonDays: Number(forecastHorizon) as 7 | 14 | 30,
      taxRatePercent: taxVal,
    });
  };

  const hasChanges =
    openingCashRupees !== String((business.openingCashPaise ?? 0) / 100) ||
    safetyThresholdRupees !== String((business.safetyThresholdPaise ?? 500_000) / 100) ||
    supplierTermsDays !== String(business.defaultSupplierPaymentTermsDays ?? 30) ||
    customerTermsDays !== String(business.defaultCustomerPaymentTermsDays ?? 15) ||
    forecastHorizon !== String(business.defaultForecastHorizonDays ?? 30) ||
    taxRatePercent !== String(business.taxRatePercent ?? 18);

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-warning/10 text-warning-foreground">
              <Coins className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Financial Preferences</CardTitle>
              <CardDescription>
                Configure baseline cash reserves, payment terms, forecast horizon, and risk alert thresholds.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="opening-cash">Opening Cash Balance (₹)</Label>
              <Input
                id="opening-cash"
                type="number"
                min="0"
                step="1"
                value={openingCashRupees}
                onChange={(e) => setOpeningCashRupees(e.target.value)}
                placeholder="10000"
                disabled={isSaving}
              />
              {errors["openingCash"] ? (
                <p className="text-xs text-destructive">{errors["openingCash"]}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Starting cash for rolling ledger forecasts</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="safety-threshold">Low-Cash Alert Threshold (₹)</Label>
              <Input
                id="safety-threshold"
                type="number"
                min="0"
                step="1"
                value={safetyThresholdRupees}
                onChange={(e) => setSafetyThresholdRupees(e.target.value)}
                placeholder="5000"
                disabled={isSaving}
              />
              {errors["safetyThreshold"] ? (
                <p className="text-xs text-destructive">{errors["safetyThreshold"]}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Triggers liquidity warnings when balance dips below this</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="supplier-terms">Default Supplier Payment Terms (days)</Label>
              <Input
                id="supplier-terms"
                type="number"
                min="0"
                step="1"
                value={supplierTermsDays}
                onChange={(e) => setSupplierTermsDays(e.target.value)}
                placeholder="30"
                disabled={isSaving}
              />
              {errors["supplierTerms"] ? (
                <p className="text-xs text-destructive">{errors["supplierTerms"]}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Standard vendor credit period</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customer-terms">Default Customer Payment Terms (days)</Label>
              <Input
                id="customer-terms"
                type="number"
                min="0"
                step="1"
                value={customerTermsDays}
                onChange={(e) => setCustomerTermsDays(e.target.value)}
                placeholder="15"
                disabled={isSaving}
              />
              {errors["customerTerms"] ? (
                <p className="text-xs text-destructive">{errors["customerTerms"]}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Net receivables collection expectation</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="forecast-horizon">Default Forecast Horizon</Label>
              <Select
                value={forecastHorizon}
                onValueChange={(val) => setForecastHorizon(val as "7" | "14" | "30")}
                disabled={isSaving}
              >
                <SelectTrigger id="forecast-horizon" className="w-full">
                  <SelectValue placeholder="Select horizon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days (Short-term operational cash)</SelectItem>
                  <SelectItem value="14">14 Days (Bi-weekly cycle)</SelectItem>
                  <SelectItem value="30">30 Days (Full monthly projection)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Default window on the cash flow dashboard</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tax-rate">Default Tax Rate (% GST)</Label>
              <Input
                id="tax-rate"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={taxRatePercent}
                onChange={(e) => setTaxRatePercent(e.target.value)}
                placeholder="18"
                disabled={isSaving}
              />
              {errors["taxRate"] ? (
                <p className="text-xs text-destructive">{errors["taxRate"]}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Standard tax applied to new invoices & orders</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-md border border-muted bg-muted/30 p-3 text-xs text-muted-foreground">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              Changes to the low-cash threshold and default forecast horizon immediately update the cash flow
              projections, shortfall calculations, and active liquidity alerts across Ripple.
            </span>
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
              {isSaving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
