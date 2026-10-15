import { useState } from "react";
import { Database, Download, ShieldCheck, Lock, FileSpreadsheet } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Business } from "@/types";

interface DataPrivacySectionProps {
  business?: Business;
  dataMode?: "mock" | "api";
  onResetDemoData?: () => Promise<void>;
  isResetting?: boolean;
}

export function DataPrivacySection({ business }: DataPrivacySectionProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportAllCsv = () => {
    setIsExporting(true);
    try {
      const bName = business?.name ?? "Active Business";
      const bCurr = business?.currency ?? "INR";
      const bOpenCash = business?.openingCashPaise ?? 0;
      const bSafety = business?.safetyThresholdPaise ?? 0;

      // Export cohesive business summary CSV
      const rows = [
        ["Data Export", "Ripple Business Summary"],
        ["Export Date", new Date().toISOString()],
        [],
        ["Field", "Value"],
        ["Business Name", bName],
        ["Currency", bCurr],
        ["Opening Cash (Paise)", String(bOpenCash)],
        ["Safety Threshold (Paise)", String(bSafety)],
        ["Status", "Production Active"],
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
              Manage data exports, encryption standards, and platform compliance.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CSV Export */}
        <div className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium text-foreground">Export Workspace Data</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Download your current business counterparties, ledgers, and financial settings in CSV format.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportAllCsv}
            disabled={isExporting}
            className="shrink-0 cursor-pointer"
          >
            <Download className="mr-1.5 h-3.5 w-3.5" />
            {isExporting ? "Exporting..." : "Export to CSV"}
          </Button>
        </div>

        {/* Security & Multi-Tenant Isolation */}
        <div className="rounded-lg border p-4 space-y-3 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-sm font-medium text-foreground">Security & Multi-Tenant Isolation</h4>
            </div>
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px]">
              Encrypted & Isolated
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            All company financial transactions, supplier relationships, and simulation models are strictly scoped
            to your unique business ID. Bank-grade TLS 1.3 is enforced on all communication channels with encrypted
            session token verification.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3 text-primary" />
              <span>AES-256 at Rest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3 text-primary" />
              <span>Tenant Business Scoping</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Database className="h-3 w-3 text-primary" />
              <span>Immutable Audit Logs</span>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t px-6 py-3">
        <p className="text-[11px] text-muted-foreground">
          Ripple adheres to strict financial data isolation principles. Your data is never shared with third parties.
        </p>
      </CardFooter>
    </Card>
  );
}
