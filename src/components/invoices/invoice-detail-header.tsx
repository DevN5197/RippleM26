import React from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import {
  ArrowLeft,
  CreditCard,
  Bell,
  Ban,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import type { EnrichedInvoice } from "@/types";

interface InvoiceDetailHeaderProps {
  invoice: EnrichedInvoice;
  onRecordPayment: () => void;
  onSendReminder: () => void;
  onCancelInvoice: () => void;
}

export function InvoiceDetailHeader({
  invoice,
  onRecordPayment,
  onSendReminder,
  onCancelInvoice,
}: InvoiceDetailHeaderProps) {
  const isReceivable = invoice.type === "receivable" || !invoice.type;
  const isOverdue = invoice.isOverdue;
  const isCancellable = invoice.status !== "void" && invoice.status !== "paid";

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2 text-muted-foreground">
          <Link to="/invoices">
            <ArrowLeft className="h-4 w-4" />
            Back to Invoices
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {invoice.invoiceNumber}
            </h1>

            <Badge
              variant="secondary"
              className={`text-xs gap-1 font-medium ${
                isReceivable
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                  : "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
              }`}
            >
              {isReceivable ? (
                <>
                  <ArrowDownLeft className="h-3 w-3" />
                  Receivable (Customer)
                </>
              ) : (
                <>
                  <ArrowUpRight className="h-3 w-3" />
                  Payable (Vendor)
                </>
              )}
            </Badge>

            <StatusBadge status={invoice.status} />

            {isOverdue && (
              <Badge variant="outline" className="border-destructive/40 bg-destructive/10 text-destructive text-xs">
                {invoice.daysOverdue} days overdue
              </Badge>
            )}
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Counterparty: <span className="font-medium text-foreground">{invoice.counterpartyName}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isOverdue && isReceivable && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSendReminder}
              className="text-amber-700 hover:text-amber-800 dark:text-amber-400"
            >
              <Bell className="mr-1.5 h-3.5 w-3.5" />
              Overdue Reminder
            </Button>
          )}

          {invoice.outstandingPaise > 0 && invoice.status !== "void" && (
            <Button size="sm" onClick={onRecordPayment}>
              <CreditCard className="mr-1.5 h-3.5 w-3.5" />
              Record Payment
            </Button>
          )}

          {isCancellable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancelInvoice}
              className="text-destructive hover:bg-destructive/10"
            >
              <Ban className="mr-1.5 h-3.5 w-3.5" />
              Cancel Invoice
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
