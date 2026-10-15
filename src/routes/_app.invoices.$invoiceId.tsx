import React, { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { invoiceApi, type OverdueReminderPayload } from "@/lib/api/invoiceApi";
import { InvoiceDetailHeader } from "@/components/invoices/invoice-detail-header";
import { InvoiceDetailView } from "@/components/invoices/invoice-detail-view";
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog";
import { OverdueReminderDialog } from "@/components/invoices/overdue-reminder-dialog";
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
import { Ban } from "lucide-react";
import { toast } from "sonner";
import { ErrorState } from "@/components/shared/error-state";
import type { RecordPaymentInput } from "@/types";

const invoiceDetailQuery = (invoiceId: string) =>
  queryOptions({
    queryKey: ["invoices", "detail", invoiceId],
    queryFn: () => invoiceApi.getById(invoiceId),
  });

export const Route = createFileRoute("/_app/invoices/$invoiceId")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(invoiceDetailQuery(params.invoiceId));
  },
  head: () => ({
    meta: [
      { title: "Invoice Details — Ripple" },
      {
        name: "description",
        content: "Invoice breakdown, payment history and counterparty details.",
      },
    ],
  }),
  component: InvoiceDetailPage,
  errorComponent: ({ error, reset }) => (
    <ErrorState
      title="Could not load invoice"
      message={error instanceof Error ? error.message : "The requested invoice could not be found."}
      onRetry={reset}
    />
  ),
});

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data } = useSuspenseQuery(invoiceDetailQuery(invoiceId));
  const { invoice } = data;

  // Dialogs
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderData, setReminderData] = useState<OverdueReminderPayload | null>(null);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleRecordPayment = () => {
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async (invId: string, payInput: RecordPaymentInput) => {
    await invoiceApi.recordPayment(invId, payInput);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["invoices"] }),
      queryClient.invalidateQueries({ queryKey: ["customers"] }),
      queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["forecast"] }),
      queryClient.invalidateQueries({ queryKey: ["simulator"] }),
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] }),
      queryClient.invalidateQueries({ queryKey: ["relationships"] }),
    ]);
  };

  const handleSendReminder = () => {
    try {
      const payload = invoiceApi.generateOverdueReminder(invoice);
      setReminderData(payload);
      setReminderDialogOpen(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate reminder");
    }
  };

  const handleCancelConfirm = async () => {
    try {
      setIsCancelling(true);
      await invoiceApi.cancel(invoice.id);
      toast.success(`Invoice ${invoice.invoiceNumber} cancelled.`);
      setCancelDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
        queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["forecast"] }),
        queryClient.invalidateQueries({ queryKey: ["simulator"] }),
        queryClient.invalidateQueries({ queryKey: ["cash-flow"] }),
        queryClient.invalidateQueries({ queryKey: ["relationships"] }),
      ]);
      void navigate({ to: "/invoices" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel invoice");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <InvoiceDetailHeader
        invoice={invoice}
        onRecordPayment={handleRecordPayment}
        onSendReminder={handleSendReminder}
        onCancelInvoice={() => setCancelDialogOpen(true)}
      />

      <InvoiceDetailView data={data} onRecordPayment={handleRecordPayment} />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={invoice}
        onSubmit={handlePaymentSubmit}
      />

      {/* Overdue Reminder Dialog */}
      <OverdueReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        reminderData={reminderData}
      />

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-destructive" />
              <AlertDialogTitle>Cancel Invoice {invoice.invoiceNumber}?</AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Cancelling will mark this invoice as void and reduce the counterparty outstanding
              balance. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Invoice</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleCancelConfirm();
              }}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling ? "Cancelling..." : "Cancel Invoice"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
