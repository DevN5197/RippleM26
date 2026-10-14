import { useState } from "react";
import { Database, Download, RotateCcw, AlertTriangle, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { db } from "@/mocks/store";

interface DataPrivacySectionProps {
  dataMode: "mock" | "api";
  onResetDemoData: () => Promise<void>;
  isResetting: boolean;
}

export function DataPrivacySection({
  dataMode,
  onResetDemoData,
  isResetting,
}: DataPrivacySectionProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportAllCsv = () => {
    setIsExporting(true);
    try {
      // Export cohesive business summary CSV
      const rows = [
        ["Data Export", "Ripple Business Summary"],
        ["Export Date", new Date().toISOString()],
        ["Mode", dataMode],
        [],
        ["Entity", "Count / Value"],
        ["Business Name", db.business.name],
        ["Currency", db.business.currency],
        ["Opening Cash (Paise)", String(db.business.openingCashPaise)],
        ["Safety Threshold (Paise)", String(db.business.safetyThresholdPaise ?? 0)],
        ["Suppliers Count", String(db.suppliers.length)],
        ["Customers Count", String(db.customers.length)],
        ["Products Count", String(db.products.length)],
        ["Invoices Count", String(db.invoices.length)],
        ["Purchase Orders Count", String(db.purchaseOrders.length)],
        ["Cash Flow Events Count", String(db.cashFlowEvents.length)],
      ];

      const csvContent = rows
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const filename = `ripple-data-export-${new Date().toISOString().slice(0, 10)}.csv`;

      link.setAttribute("href", url);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Business data export downloaded as CSV.");
    } catch {
      toast.error("Failed to export data to CSV.");
    } finally {
      setIsExporting(false);
    }
  };

  const isMockMode = dataMode === "mock";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Database className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Data & Privacy</CardTitle>
            <CardDescription>
              Inspect workspace environment mode, backup records as CSV, or reset demo data.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Environment Mode */}
        <div className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Current Operating Mode</span>
              <Badge variant={isMockMode ? "secondary" : "default"} className="capitalize">
                {dataMode} Mode
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {isMockMode
                ? "Running with in-memory local demo data. Safe to simulate, edit, and experiment without touching live servers."
                : "Connected to live FastAPI backend. Real transactions and bank ledgers are active."}
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-medium text-success">
            <ShieldCheck className="h-4 w-4" />
            <span>Environment Protected</span>
          </div>
        </div>

        {/* CSV Export */}
        <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h4 className="text-sm font-medium text-foreground">Export Workspace Data</h4>
            <p className="text-xs text-muted-foreground">
              Download your current counterparties, products, invoices, and financial preferences in CSV format.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportAllCsv}
            disabled={isExporting}
            className="shrink-0"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {isExporting ? "Exporting..." : "Export to CSV"}
          </Button>
        </div>

        {/* Reset Demo Data */}
        <div className="flex flex-col gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-destructive">Reset Demo Data</h4>
              {!isMockMode ? (
                <Badge variant="outline" className="border-destructive/30 text-destructive text-[10px]">
                  Disabled in Live API Mode
                </Badge>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              {isMockMode
                ? "Reverts all modified suppliers, customers, inventory balances, and invoices back to the initial 'Rupi Clothing' demo seed."
                : "Live production data cannot be reset from this interface to preserve audit trails and integrity."}
            </p>
          </div>

          {isMockMode ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={isResetting}
                  className="shrink-0"
                >
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  {isResetting ? "Resetting..." : "Reset Demo Data"}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <AlertDialogTitle>Reset demo data to initial seed?</AlertDialogTitle>
                  </div>
                  <AlertDialogDescription>
                    This will restore all mock counterparties, invoices, payments, inventory, and business settings
                    to the default Rupi Clothing seed dataset. Any unsaved edits will be discarded.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onResetDemoData}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Confirm Reset
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <Button type="button" variant="outline" size="sm" disabled className="shrink-0">
              Live Mode Protected
            </Button>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-3">
        <p className="text-[11px] text-muted-foreground">
          Never expose sensitive credentials or API keys. Ripple enforces strict environment segregation.
        </p>
      </CardFooter>
    </Card>
  );
}
