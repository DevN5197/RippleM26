import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Archive, Trash2, ShieldCheck } from "lucide-react";
import type { EnrichedSupplier, Supplier } from "@/types";

interface SupplierArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: (Supplier | EnrichedSupplier) | null;
  mode: "archive" | "unarchive" | "delete";
  onConfirm: () => Promise<void>;
}

export function SupplierArchiveDialog({
  open,
  onOpenChange,
  supplier,
  mode,
  onConfirm,
}: SupplierArchiveDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!supplier) return null;

  const handleAction = async () => {
    try {
      setIsProcessing(true);
      setErrorMessage(null);
      await onConfirm();
      onOpenChange(false);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const hasFinancialHistory =
    ("totalPoCount" in supplier && supplier.totalPoCount > 0) ||
    ("payableInvoicesCount" in supplier && supplier.payableInvoicesCount > 0) ||
    supplier.outstandingPaise > 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                mode === "delete"
                  ? "bg-destructive/10 text-destructive"
                  : mode === "archive"
                    ? "bg-warning/15 text-warning-foreground"
                    : "bg-success/10 text-success"
              }`}
            >
              {mode === "delete" ? (
                <Trash2 className="h-5 w-5" />
              ) : mode === "archive" ? (
                <Archive className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <AlertDialogTitle>
              {mode === "delete"
                ? `Delete ${supplier.name}?`
                : mode === "archive"
                  ? `Archive ${supplier.name}?`
                  : `Reactivate ${supplier.name}?`}
            </AlertDialogTitle>
          </div>

          <AlertDialogDescription className="pt-2 text-sm leading-relaxed">
            {mode === "archive" && (
              <>
                Archiving marks <strong>{supplier.name}</strong> as inactive. All historical
                purchase orders, payable invoices, outgoing payments, and stock receipts remain
                fully preserved in cash flow and ledger reports.
              </>
            )}

            {mode === "unarchive" && (
              <>
                Reactivating <strong>{supplier.name}</strong> will return them to active status,
                enabling placement of new purchase orders and receipt of new invoices.
              </>
            )}

            {mode === "delete" && (
              <>
                Permanent deletion will completely remove <strong>{supplier.name}</strong>.
                {hasFinancialHistory ? (
                  <span className="mt-2 block font-medium text-destructive">
                    Warning: This counterparty has linked purchase orders, bills, or payments. To
                    preserve financial data integrity, permanent deletion is prevented. Archive
                    instead.
                  </span>
                ) : (
                  <span className="mt-2 block text-muted-foreground">
                    This supplier has no recorded purchase orders, invoices, or payments. Deletion
                    is safe.
                  </span>
                )}
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {errorMessage && (
          <Alert variant="destructive" className="my-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">{errorMessage}</AlertDescription>
          </Alert>
        )}

        <AlertDialogFooter className="mt-4">
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <Button
            variant={mode === "delete" ? "destructive" : "default"}
            onClick={handleAction}
            disabled={isProcessing}
          >
            {isProcessing
              ? "Processing..."
              : mode === "delete"
                ? "Permanently Delete"
                : mode === "archive"
                  ? "Archive Supplier"
                  : "Reactivate Supplier"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
