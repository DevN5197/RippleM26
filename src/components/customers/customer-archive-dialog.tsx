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
import { Archive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { EnrichedCustomer } from "@/types";

interface CustomerArchiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: EnrichedCustomer | null;
  onConfirm: () => Promise<void>;
}

export function CustomerArchiveDialog({
  open,
  onOpenChange,
  customer,
  onConfirm,
}: CustomerArchiveDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  if (!customer) return null;

  const isArchived = customer.status === "archived";

  const handleAction = async () => {
    try {
      setIsProcessing(true);
      await onConfirm();
      toast.success(
        isArchived
          ? `Customer "${customer.name}" reactivated successfully.`
          : `Customer "${customer.name}" archived. Historical records preserved.`,
      );
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action failed";
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            {isArchived ? (
              <RotateCcw className="h-5 w-5 text-primary" />
            ) : (
              <Archive className="h-5 w-5 text-amber-600" />
            )}
            <AlertDialogTitle>
              {isArchived ? `Reactivate "${customer.name}"?` : `Archive "${customer.name}"?`}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="space-y-2 pt-2">
            {isArchived ? (
              <p>
                Reactivating will restore this customer to active lists and enable creating new
                invoices and orders.
              </p>
            ) : (
              <>
                <p>Archiving hides this customer from active ordering and new invoice creation.</p>
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                  <strong>Preserved Historical Data:</strong> All existing customer orders (
                  {customer.orderCount}), invoices ({customer.invoiceCount}), and payment records (
                  {customer.paymentCount}) remain permanently preserved in your ledger.
                </div>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              void handleAction();
            }}
            disabled={isProcessing}
            className={
              isArchived
                ? "bg-primary hover:bg-primary/90"
                : "bg-amber-600 hover:bg-amber-700 text-white"
            }
          >
            {isProcessing
              ? "Processing..."
              : isArchived
                ? "Reactivate Customer"
                : "Archive Customer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
