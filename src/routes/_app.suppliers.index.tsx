import React, { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  queryOptions,
  useSuspenseQuery,
  useQueryClient,
  useQuery,
  keepPreviousData,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { supplierApi, type SupplierListFilterParams } from "@/lib/api/supplierApi";
import { SupplierHeader } from "@/components/suppliers/supplier-header";
import { ErrorState } from "@/components/shared/error-state";
import { SupplierSummaryCards } from "@/components/suppliers/supplier-summary-cards";
import { SupplierTable } from "@/components/suppliers/supplier-table";
import { SupplierDialog } from "@/components/suppliers/supplier-dialog";
import { SupplierArchiveDialog } from "@/components/suppliers/supplier-archive-dialog";
import type { EnrichedSupplier, CreateSupplierInput, UpdateSupplierInput } from "@/types";

interface SuppliersSearchParams {
  search?: string | undefined;
  status?: "all" | "active" | "archived" | undefined;
  riskStatus?: "all" | "at_risk" | "healthy" | undefined;
  sortBy?: "name" | "outstanding" | "nextPayment" | "reliability" | undefined;
  sortDir?: "asc" | "desc" | undefined;
}

const supplierSummaryQuery = queryOptions({
  queryKey: ["suppliers", "summary"],
  queryFn: () => supplierApi.getSummaryMetrics(),
});

const suppliersListQuery = (params: SupplierListFilterParams) =>
  queryOptions({
    queryKey: ["suppliers", "list", params],
    queryFn: () => supplierApi.list(params),
  });

export const Route = createFileRoute("/_app/suppliers/")({
  validateSearch: (search: Record<string, unknown>): SuppliersSearchParams => {
    const s = typeof search["search"] === "string" ? search["search"] : undefined;
    const status =
      search["status"] === "active" || search["status"] === "archived" || search["status"] === "all"
        ? (search["status"] as "all" | "active" | "archived")
        : "all";
    const riskStatus =
      search["riskStatus"] === "at_risk" ||
      search["riskStatus"] === "healthy" ||
      search["riskStatus"] === "all"
        ? (search["riskStatus"] as "all" | "at_risk" | "healthy")
        : "all";
    const sortBy =
      search["sortBy"] === "name" ||
      search["sortBy"] === "outstanding" ||
      search["sortBy"] === "nextPayment" ||
      search["sortBy"] === "reliability"
        ? (search["sortBy"] as "name" | "outstanding" | "nextPayment" | "reliability")
        : "name";
    const sortDir = search["sortDir"] === "desc" ? "desc" : "asc";

    return {
      search: s,
      status,
      riskStatus,
      sortBy,
      sortDir,
    };
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(supplierSummaryQuery),
      context.queryClient.ensureQueryData(suppliersListQuery({})),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Suppliers — Ripple" },
      {
        name: "description",
        content:
          "Vendor directory, credit terms, payables, and delivery reliability for Rupi Clothing.",
      },
      { property: "og:title", content: "Suppliers — Ripple" },
      { property: "og:description", content: "Manage suppliers and accounts payable." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuppliersPage,
  errorComponent: ({ error, reset }) => (
    <ErrorState
      title="Could not load suppliers"
      message={error instanceof Error ? error.message : "Failed to load supplier records."}
      onRetry={reset}
    />
  ),
});

function SuppliersPage() {
  const navigate = Route.useNavigate();
  const searchParams = Route.useSearch();
  const queryClient = useQueryClient();

  const { data: metrics } = useSuspenseQuery(supplierSummaryQuery);
  const { data: suppliersResponse = { data: [], total: 0, page: 1, limit: 50 } } = useQuery({
    ...suppliersListQuery(searchParams),
    placeholderData: keepPreviousData,
  });

  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplierForEdit, setSelectedSupplierForEdit] = useState<EnrichedSupplier | null>(
    null,
  );

  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [targetSupplierForAction, setTargetSupplierForAction] = useState<EnrichedSupplier | null>(
    null,
  );
  const [archiveMode, setArchiveMode] = useState<"archive" | "unarchive" | "delete">("archive");

  const updateSearch = (newParams: Partial<SuppliersSearchParams>) => {
    navigate({
      search: (prev) => ({
        ...prev,
        ...newParams,
      }),
    });
  };

  const handleCreateOrUpdate = async (values: CreateSupplierInput | UpdateSupplierInput) => {
    if (selectedSupplierForEdit) {
      await supplierApi.update(selectedSupplierForEdit.id, values);
      toast.success(
        `Supplier "${values.name || selectedSupplierForEdit.name}" updated successfully.`,
      );
    } else {
      await supplierApi.create(values as CreateSupplierInput);
      toast.success(`Supplier "${values.name}" created successfully.`);
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["relationships"] }),
    ]);
  };

  const handleConfirmArchiveAction = async () => {
    if (!targetSupplierForAction) return;

    if (archiveMode === "archive") {
      await supplierApi.archive(targetSupplierForAction.id);
      toast.success(`Supplier "${targetSupplierForAction.name}" archived.`);
    } else if (archiveMode === "unarchive") {
      await supplierApi.unarchive(targetSupplierForAction.id);
      toast.success(`Supplier "${targetSupplierForAction.name}" reactivated.`);
    } else if (archiveMode === "delete") {
      await supplierApi.remove(targetSupplierForAction.id);
      toast.success(`Supplier "${targetSupplierForAction.name}" permanently deleted.`);
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["relationships"] }),
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <SupplierHeader
        onAddSupplier={() => {
          setSelectedSupplierForEdit(null);
          setDialogOpen(true);
        }}
        totalSuppliers={metrics.totalSuppliers}
      />

      {/* Summary KPI Cards */}
      <SupplierSummaryCards metrics={metrics} />

      {/* Main Suppliers Table */}
      <SupplierTable
        suppliers={suppliersResponse.data}
        searchQuery={searchParams.search ?? ""}
        onSearchChange={(q) => updateSearch({ search: q || undefined })}
        statusFilter={searchParams.status ?? "all"}
        onStatusFilterChange={(status) => updateSearch({ status })}
        riskFilter={searchParams.riskStatus ?? "all"}
        onRiskFilterChange={(riskStatus) => updateSearch({ riskStatus })}
        sortBy={searchParams.sortBy ?? "name"}
        onSortChange={(sortBy) => updateSearch({ sortBy })}
        sortDir={searchParams.sortDir ?? "asc"}
        onSortDirToggle={() =>
          updateSearch({ sortDir: searchParams.sortDir === "desc" ? "asc" : "desc" })
        }
        onEdit={(sup) => {
          setSelectedSupplierForEdit(sup);
          setDialogOpen(true);
        }}
        onArchive={(sup) => {
          setTargetSupplierForAction(sup);
          setArchiveMode("archive");
          setArchiveDialogOpen(true);
        }}
        onUnarchive={(sup) => {
          setTargetSupplierForAction(sup);
          setArchiveMode("unarchive");
          setArchiveDialogOpen(true);
        }}
        onDelete={(sup) => {
          setTargetSupplierForAction(sup);
          setArchiveMode("delete");
          setArchiveDialogOpen(true);
        }}
        onAddSupplier={() => {
          setSelectedSupplierForEdit(null);
          setDialogOpen(true);
        }}
      />

      {/* Create / Edit Form Modal */}
      <SupplierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={selectedSupplierForEdit}
        onSubmit={handleCreateOrUpdate}
      />

      {/* Safe Archive / Delete Confirmation Modal */}
      <SupplierArchiveDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        supplier={targetSupplierForAction}
        mode={archiveMode}
        onConfirm={handleConfirmArchiveAction}
      />
    </div>
  );
}
