import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient, useQuery } from "@tanstack/react-query";
import { customerApi, enrichCustomer } from "@/lib/api/customerApi";
import { supplierApi } from "@/lib/api/supplierApi";
import { invoiceApi, type OverdueReminderPayload } from "@/lib/api/invoiceApi";
import { CustomerDetailHeader } from "@/components/customers/customer-detail-header";
import { CustomerDetailMetrics } from "@/components/customers/customer-detail-metrics";
import { CustomerDetailTabs } from "@/components/customers/customer-detail-tabs";
import { CustomerDialog } from "@/components/customers/customer-dialog";
import { CustomerArchiveDialog } from "@/components/customers/customer-archive-dialog";
import { InvoiceDialog } from "@/components/invoices/invoice-dialog";
import { RecordPaymentDialog } from "@/components/invoices/record-payment-dialog";
import { OverdueReminderDialog } from "@/components/invoices/overdue-reminder-dialog";
import { ErrorState } from "@/components/shared/error-state";
import { toast } from "sonner";
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CreateInvoiceInput,
  RecordPaymentInput,
  Invoice,
} from "@/types";

const customerDetailQuery = (customerId: string) =>
  queryOptions({
    queryKey: ["customers", "detail", customerId],
    queryFn: () => customerApi.getDetails(customerId),
  });

export const Route = createFileRoute("/_app/customers/$customerId")({
  loader: async ({ params, context }) => {
    await context.queryClient.ensureQueryData(customerDetailQuery(params.customerId));
  },
  head: () => ({
    meta: [
      { title: "Customer Profile — Ripple" },
      { name: "description", content: "Customer detail, balance, orders, invoices and ratings." },
    ],
  }),
  component: CustomerDetailPage,
  errorComponent: ({ error, reset }) => (
    <ErrorState
      title="Could not load customer"
      message={
        error instanceof Error
          ? error.message
          : "The requested customer profile could not be found."
      }
      onRetry={reset}
    />
  ),
});

function CustomerDetailPage() {
  const { customerId } = Route.useParams();
  const queryClient = useQueryClient();

  const { data } = useSuspenseQuery(customerDetailQuery(customerId));
  const { customer, metrics } = data;

  // Dialogs
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<Invoice | null>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "list-quick"],
    queryFn: () =>
      customerApi
        .list({ pageSize: 100 })
        .then((r) => r.data)
        .catch(() => []),
    enabled: invoiceDialogOpen,
    staleTime: 60_000,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", "list-quick"],
    queryFn: () =>
      supplierApi
        .list({ pageSize: 100 })
        .then((r) => r.data)
        .catch(() => []),
    enabled: invoiceDialogOpen,
    staleTime: 60_000,
  });

  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderData, setReminderData] = useState<OverdueReminderPayload | null>(null);

  const handleEditSubmit = async (formData: CreateCustomerInput | UpdateCustomerInput) => {
    await customerApi.update(customer.id, formData);
    toast.success(`Customer "${formData.name || customer.name}" updated successfully.`);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["customers"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const handleArchiveConfirm = async () => {
    if (customer.status === "archived") {
      await customerApi.unarchive(customer.id);
    } else {
      await customerApi.archive(customer.id);
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["customers"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const handleCreateInvoice = async (formData: CreateInvoiceInput) => {
    await invoiceApi.create(formData);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["customers"] }),
      queryClient.invalidateQueries({ queryKey: ["invoices"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["forecast"] }),
      queryClient.invalidateQueries({ queryKey: ["simulator"] }),
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] }),
      queryClient.invalidateQueries({ queryKey: ["relationships"] }),
    ]);
  };

  const handleRecordPayment = (inv: Invoice) => {
    setSelectedInvoiceForPayment(inv);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async (invoiceId: string, payInput: RecordPaymentInput) => {
    await invoiceApi.recordPayment(invoiceId, payInput);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["customers"] }),
      queryClient.invalidateQueries({ queryKey: ["invoices"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const handleSendReminder = (inv: Invoice) => {
    try {
      const payload = invoiceApi.generateOverdueReminder(inv);
      setReminderData(payload);
      setReminderDialogOpen(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate reminder");
    }
  };

  const enrichedForArchive = enrichCustomer(customer);

  return (
    <div className="space-y-6">
      <CustomerDetailHeader
        customer={customer}
        onEdit={() => setEditDialogOpen(true)}
        onArchiveToggle={() => setArchiveDialogOpen(true)}
        onCreateInvoice={() => setInvoiceDialogOpen(true)}
      />

      <CustomerDetailMetrics metrics={metrics} />

      <CustomerDetailTabs
        data={data}
        onRecordPayment={handleRecordPayment}
        onSendReminder={handleSendReminder}
        onCreateInvoice={() => setInvoiceDialogOpen(true)}
      />

      {/* Edit Customer Dialog */}
      <CustomerDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        customer={customer}
        onSubmit={handleEditSubmit}
      />

      {/* Archive Dialog */}
      <CustomerArchiveDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        customer={enrichedForArchive}
        onConfirm={handleArchiveConfirm}
      />

      {/* Create Invoice Dialog */}
      <InvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        customers={customers}
        suppliers={suppliers}
        initialType="receivable"
        preselectedCustomerId={customer.id}
        onSubmit={handleCreateInvoice}
      />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={selectedInvoiceForPayment}
        onSubmit={handlePaymentSubmit}
      />

      {/* Overdue Reminder Dialog */}
      <OverdueReminderDialog
        open={reminderDialogOpen}
        onOpenChange={setReminderDialogOpen}
        reminderData={reminderData}
      />
    </div>
  );
}
