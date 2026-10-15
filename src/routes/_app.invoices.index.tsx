import React, { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { isUserAuthenticated } from "@/lib/api/authApi";
import {
  queryOptions,
  useSuspenseQuery,
  useQueryClient,
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { InvoiceSummaryCards } from "@/components/invoices/invoice-summary-cards";
import { InvoiceTable } from "@/components/invoices/invoice-table";
import { InvoiceDialog } from "@/components/invoices/invoice-dialog";
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
import {
  invoiceApi,
  type InvoiceListFilterParams,
  type OverdueReminderPayload,
} from "@/lib/api/invoiceApi";
import { customerApi } from "@/lib/api/customerApi";
import { supplierApi } from "@/lib/api/supplierApi";
import { PlusCircle, Ban } from "lucide-react";
import { toast } from "sonner";
import type { EnrichedInvoice, CreateInvoiceInput, RecordPaymentInput, AgingBucket } from "@/types";

interface InvoicesSearchParams {
  search?: string | undefined;
  type?: "all" | "receivable" | "payable" | undefined;
  status?: "all" | "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled" | undefined;
  aging?: "all" | AgingBucket | undefined;
  sortBy?: "dueDate" | "amount" | "status" | "invoiceNumber" | "overdue" | undefined;
  sortDir?: "asc" | "desc" | undefined;
}

const invoiceSummaryQuery = queryOptions({
  queryKey: ["invoices", "summary"],
  queryFn: () => invoiceApi.getSummaryMetrics(),
});

const invoicesListQuery = (params: InvoiceListFilterParams) =>
  queryOptions({
    queryKey: ["invoices", "list", params],
    queryFn: () => invoiceApi.list(params),
  });

export const Route = createFileRoute("/_app/invoices/")({
  validateSearch: (search: Record<string, unknown>): InvoicesSearchParams => {
    const s = typeof search["search"] === "string" ? search["search"] : undefined;
    const type =
      search["type"] === "receivable" || search["type"] === "payable" || search["type"] === "all"
        ? (search["type"] as "all" | "receivable" | "payable")
        : "all";
    const status =
      search["status"] === "unpaid" ||
      search["status"] === "partially_paid" ||
      search["status"] === "paid" ||
      search["status"] === "overdue" ||
      search["status"] === "cancelled" ||
      search["status"] === "all"
        ? (search["status"] as
            "all" | "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled")
        : "all";
    const aging =
      search["aging"] === "1_7" ||
      search["aging"] === "8_30" ||
      search["aging"] === "31_60" ||
      search["aging"] === "over_60" ||
      search["aging"] === "all"
        ? (search["aging"] as "all" | AgingBucket)
        : "all";
    const sortBy =
      search["sortBy"] === "dueDate" ||
      search["sortBy"] === "amount" ||
      search["sortBy"] === "status" ||
      search["sortBy"] === "invoiceNumber" ||
      search["sortBy"] === "overdue"
        ? (search["sortBy"] as "dueDate" | "amount" | "status" | "invoiceNumber" | "overdue")
        : "dueDate";
    const sortDir = search["sortDir"] === "desc" ? "desc" : "asc";

    return {
      search: s,
      type,
      status,
      aging,
      sortBy,
      sortDir,
    };
  },
  beforeLoad: ({ location }) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token || !isUserAuthenticated()) {
        throw redirect({
          to: "/login",
          search: { redirect: location.href },
        });
      }
    }
  },
  loader: async ({ context, location }) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token || !isUserAuthenticated()) {
        throw redirect({
          to: "/login",
          search: { redirect: location.href },
        });
      }
    }
    try {
      await Promise.all([
        context.queryClient.ensureQueryData(invoiceSummaryQuery),
        context.queryClient.ensureQueryData(invoicesListQuery({})),
      ]);
    } catch {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Invoices & Payments — Ripple" },
      {
        name: "description",
        content:
          "Accounts receivable, accounts payable bills, payments, and overdue aging timeline.",
      },
    ],
  }),
  component: InvoicesIndexPage,
  errorComponent: ({ error, reset }) => (
    <ErrorState
      title="Could not load invoices"
      message={error instanceof Error ? error.message : "Failed to load invoices records."}
      onRetry={reset}
    />
  ),
});

function InvoicesIndexPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data: metrics } = useSuspenseQuery(invoiceSummaryQuery);
  const { data: listResponse = { data: [], total: 0, page: 1, limit: 50 } } = useQuery({
    ...invoicesListQuery(searchParams),
    placeholderData: keepPreviousData,
  });

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedForPayment, setSelectedForPayment] = useState<EnrichedInvoice | null>(null);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "list-quick"],
    queryFn: () =>
      customerApi
        .list({ pageSize: 100 })
        .then((r) => r.data)
        .catch(() => []),
    enabled: createDialogOpen,
    staleTime: 60_000,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", "list-quick"],
    queryFn: () =>
      supplierApi
        .list({ pageSize: 100 })
        .then((r) => r.data)
        .catch(() => []),
    enabled: createDialogOpen,
    staleTime: 60_000,
  });

  const [reminderDialogOpen, setReminderDialogOpen] = useState(false);
  const [reminderData, setReminderData] = useState<OverdueReminderPayload | null>(null);

  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedForCancel, setSelectedForCancel] = useState<EnrichedInvoice | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const updateSearch = (patch: Partial<InvoicesSearchParams>) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...patch,
      }),
    });
  };

  const handleCreateSubmit = async (formData: CreateInvoiceInput) => {
    await invoiceApi.create(formData);
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

  const handleRecordPayment = (invoice: EnrichedInvoice) => {
    setSelectedForPayment(invoice);
    setPaymentDialogOpen(true);
  };

  const handlePaymentSubmit = async (invoiceId: string, payInput: RecordPaymentInput) => {
    await invoiceApi.recordPayment(invoiceId, payInput);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["invoices"] }),
      queryClient.invalidateQueries({ queryKey: ["customers"] }),
      queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] }),
    ]);
  };

  const handleSendReminder = (invoice: EnrichedInvoice) => {
    try {
      const payload = invoiceApi.generateOverdueReminder(invoice);
      setReminderData(payload);
      setReminderDialogOpen(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to generate reminder");
    }
  };

  const handleCancelClick = (invoice: EnrichedInvoice) => {
    setSelectedForCancel(invoice);
    setCancelDialogOpen(true);
  };

  const handleCancelConfirm = async () => {
    if (!selectedForCancel) return;
    try {
      setIsCancelling(true);
      await invoiceApi.cancel(selectedForCancel.id);
      toast.success(`Invoice ${selectedForCancel.invoiceNumber} has been cancelled.`);
      setCancelDialogOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
        queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel invoice");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Invoices & Payments"
        description="Unified sub-ledger for customer receivables and supplier payables with aging analytics and settlement tracking."
        actions={
          <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-1.5">
            <PlusCircle className="h-4 w-4" />
            New Invoice / Bill
          </Button>
        }
      />

      {/* Summary KPI Cards & Aging Breakdown */}
      <InvoiceSummaryCards
        metrics={metrics}
        selectedAging={searchParams.aging}
        onSelectAging={(aging) => updateSearch({ aging })}
      />

      {/* Filterable Table */}
      <InvoiceTable
        invoices={listResponse.data}
        search={searchParams.search ?? ""}
        onSearchChange={(search) => updateSearch({ search: search || undefined })}
        typeFilter={searchParams.type ?? "all"}
        onTypeFilterChange={(type) => updateSearch({ type })}
        statusFilter={searchParams.status ?? "all"}
        onStatusFilterChange={(status) => updateSearch({ status })}
        agingFilter={searchParams.aging ?? "all"}
        onAgingFilterChange={(aging) => updateSearch({ aging })}
        sortBy={searchParams.sortBy ?? "dueDate"}
        onSortByChange={(sortBy) => updateSearch({ sortBy })}
        onRecordPayment={handleRecordPayment}
        onSendReminder={handleSendReminder}
        onCancelInvoice={handleCancelClick}
      />

      {/* Create Invoice Dialog */}
      <InvoiceDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        customers={customers}
        suppliers={suppliers}
        onSubmit={handleCreateSubmit}
      />

      {/* Record Payment Dialog */}
      <RecordPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        invoice={selectedForPayment}
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
              <AlertDialogTitle>
                Cancel Invoice {selectedForCancel?.invoiceNumber}?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription>
              Cancelling will mark this invoice as void and adjust the counterparty outstanding
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
