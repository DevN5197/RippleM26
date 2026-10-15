import React, { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  queryOptions,
  useSuspenseQuery,
  useQueryClient,
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { CustomerSummaryCards } from "@/components/customers/customer-summary-cards";
import { CustomerTable } from "@/components/customers/customer-table";
import { CustomerDialog } from "@/components/customers/customer-dialog";
import { CustomerArchiveDialog } from "@/components/customers/customer-archive-dialog";
import { customerApi, type CustomerListFilterParams } from "@/lib/api/customerApi";
import { PlusCircle } from "lucide-react";
import { toast } from "sonner";
import type { EnrichedCustomer, CreateCustomerInput, UpdateCustomerInput } from "@/types";

interface CustomersSearchParams {
  search?: string | undefined;
  status?: "all" | "active" | "archived" | undefined;
  overdueStatus?: "all" | "has_overdue" | "healthy" | undefined;
  sortBy?: "name" | "outstanding" | "reliability" | undefined;
  sortDir?: "asc" | "desc" | undefined;
}

const customerSummaryQuery = queryOptions({
  queryKey: ["customers", "summary"],
  queryFn: () => customerApi.getSummaryMetrics(),
});

const customersListQuery = (params: CustomerListFilterParams) =>
  queryOptions({
    queryKey: ["customers", "list", params],
    queryFn: () => customerApi.list(params),
  });

export const Route = createFileRoute("/_app/customers/")({
  validateSearch: (search: Record<string, unknown>): CustomersSearchParams => {
    const s = typeof search["search"] === "string" ? search["search"] : undefined;
    const status =
      search["status"] === "active" || search["status"] === "archived" || search["status"] === "all"
        ? (search["status"] as "all" | "active" | "archived")
        : "all";
    const overdueStatus =
      search["overdueStatus"] === "has_overdue" ||
      search["overdueStatus"] === "healthy" ||
      search["overdueStatus"] === "all"
        ? (search["overdueStatus"] as "all" | "has_overdue" | "healthy")
        : "all";
    const sortBy =
      search["sortBy"] === "name" ||
      search["sortBy"] === "outstanding" ||
      search["sortBy"] === "reliability"
        ? (search["sortBy"] as "name" | "outstanding" | "reliability")
        : "name";
    const sortDir = search["sortDir"] === "desc" ? "desc" : "asc";

    return {
      search: s,
      status,
      overdueStatus,
      sortBy,
      sortDir,
    };
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(customerSummaryQuery),
      context.queryClient.ensureQueryData(customersListQuery({})),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Customers — Ripple" },
      {
        name: "description",
        content: "Customer directory, credit terms, receivables, and payment reliability ratings.",
      },
    ],
  }),
  component: CustomersIndexPage,
  errorComponent: ({ error, reset }) => (
    <ErrorState
      title="Could not load customers"
      message={error instanceof Error ? error.message : "Failed to load customer records."}
      onRetry={reset}
    />
  ),
});

function CustomersIndexPage() {
  const queryClient = useQueryClient();
  const searchParams = Route.useSearch();
  const navigate = Route.useNavigate();

  const { data: metrics } = useSuspenseQuery(customerSummaryQuery);
  const { data: listResponse = { data: [], total: 0, page: 1, limit: 50 } } = useQuery({
    ...customersListQuery(searchParams),
    placeholderData: keepPreviousData,
  });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedForEdit, setSelectedForEdit] = useState<EnrichedCustomer | null>(null);

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [selectedForArchive, setSelectedForArchive] = useState<EnrichedCustomer | null>(null);

  const updateSearch = (patch: Partial<CustomersSearchParams>) => {
    void navigate({
      search: (prev) => ({
        ...prev,
        ...patch,
      }),
    });
  };

  const handleCreateCustomer = () => {
    setSelectedForEdit(null);
    setDialogOpen(true);
  };

  const handleEditCustomer = (customer: EnrichedCustomer) => {
    setSelectedForEdit(customer);
    setDialogOpen(true);
  };

  const handleArchiveToggle = (customer: EnrichedCustomer) => {
    setSelectedForArchive(customer);
    setArchiveDialogOpen(true);
  };

  const handleFormSubmit = async (data: CreateCustomerInput | UpdateCustomerInput) => {
    if (selectedForEdit) {
      await customerApi.update(selectedForEdit.id, data);
      toast.success(`Customer "${data.name || selectedForEdit.name}" updated successfully.`);
    } else {
      await customerApi.create(data as CreateCustomerInput);
      toast.success(`Customer "${data.name}" created successfully.`);
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["customers"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  const handleArchiveConfirm = async () => {
    if (!selectedForArchive) return;
    if (selectedForArchive.status === "archived") {
      await customerApi.unarchive(selectedForArchive.id);
    } else {
      await customerApi.archive(selectedForArchive.id);
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["customers"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Every customer account, credit payment terms, receivables ledger, and payment reliability ratings."
        actions={
          <Button onClick={handleCreateCustomer} size="sm" className="gap-1.5">
            <PlusCircle className="h-4 w-4" />
            New Customer
          </Button>
        }
      />

      <CustomerSummaryCards metrics={metrics} />

      <CustomerTable
        customers={listResponse.data}
        search={searchParams.search ?? ""}
        onSearchChange={(search) => updateSearch({ search: search || undefined })}
        statusFilter={searchParams.status ?? "all"}
        onStatusFilterChange={(status) => updateSearch({ status })}
        overdueFilter={searchParams.overdueStatus ?? "all"}
        onOverdueFilterChange={(overdueStatus) => updateSearch({ overdueStatus })}
        sortBy={searchParams.sortBy ?? "name"}
        onSortByChange={(sortBy) => updateSearch({ sortBy })}
        onEdit={handleEditCustomer}
        onArchiveToggle={handleArchiveToggle}
      />

      {/* Create / Edit Dialog */}
      <CustomerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={selectedForEdit}
        onSubmit={handleFormSubmit}
      />

      {/* Archive Confirmation Dialog */}
      <CustomerArchiveDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        customer={selectedForArchive}
        onConfirm={handleArchiveConfirm}
      />
    </div>
  );
}
