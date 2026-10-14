import React, { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supplierApi } from "@/lib/api/supplierApi";
import { SupplierDetailHeader } from "@/components/suppliers/supplier-detail-header";
import { SupplierDetailMetrics } from "@/components/suppliers/supplier-detail-metrics";
import { SupplierDetailTabs } from "@/components/suppliers/supplier-detail-tabs";
import { SupplierDialog } from "@/components/suppliers/supplier-dialog";
import { SupplierArchiveDialog } from "@/components/suppliers/supplier-archive-dialog";
import { ErrorState } from "@/components/shared/error-state";
import type { SupplierDetailData, UpdateSupplierInput } from "@/types";

const supplierDetailQuery = (supplierId: string) =>
  queryOptions({
    queryKey: ["suppliers", "detail", supplierId],
    queryFn: () => supplierApi.getSupplierDetail(supplierId),
  });

export const Route = createFileRoute("/_app/suppliers/$supplierId")({
  loader: async ({ context, params }) => {
    await context.queryClient.ensureQueryData(supplierDetailQuery(params.supplierId));
  },
  head: () => ({
    meta: [
      { title: "Supplier Details — Ripple" },
      {
        name: "description",
        content:
          "Detailed supplier account with purchase order history, payable bills, and reliability.",
      },
      { property: "og:title", content: "Supplier Profile — Ripple" },
      {
        property: "og:description",
        content: "Vendor profile, payment terms, and delivery performance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SupplierDetailPage,
  errorComponent: ({ error, reset }) => (
    <ErrorState
      title="Could not load supplier"
      message={error instanceof Error ? error.message : "The requested supplier profile could not be found."}
      onRetry={reset}
    />
  ),
});

function SupplierDetailPage() {
  const { supplierId } = Route.useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data } = useSuspenseQuery(supplierDetailQuery(supplierId));
  const supplierDetail: SupplierDetailData = data;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [archiveDialogOpen, setArchiveDialogOpen] = useState(false);
  const [archiveMode, setArchiveMode] = useState<"archive" | "unarchive" | "delete">("archive");

  const handleUpdate = async (values: UpdateSupplierInput) => {
    await supplierApi.update(supplierId, values);
    toast.success(
      `Supplier "${values.name || supplierDetail.supplier.name}" updated successfully.`,
    );

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["relationships"] }),
    ]);
  };

  const handleConfirmArchiveAction = async () => {
    if (archiveMode === "archive") {
      await supplierApi.archive(supplierId);
      toast.success(`Supplier "${supplierDetail.supplier.name}" archived.`);
    } else if (archiveMode === "unarchive") {
      await supplierApi.unarchive(supplierId);
      toast.success(`Supplier "${supplierDetail.supplier.name}" reactivated.`);
    } else if (archiveMode === "delete") {
      await supplierApi.remove(supplierId);
      toast.success(`Supplier "${supplierDetail.supplier.name}" permanently deleted.`);
      navigate({ to: "/suppliers" });
    }

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["suppliers"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      queryClient.invalidateQueries({ queryKey: ["relationships"] }),
    ]);
  };

  const isArchived = supplierDetail.supplier.status === "archived";

  return (
    <div className="space-y-6">
      {/* Header with Title, Badges, and Action Buttons */}
      <SupplierDetailHeader
        data={supplierDetail}
        onEdit={() => setEditDialogOpen(true)}
        onArchiveToggle={() => {
          setArchiveMode(isArchived ? "unarchive" : "archive");
          setArchiveDialogOpen(true);
        }}
      />

      {/* Financial & Delivery Metric Cards */}
      <SupplierDetailMetrics metrics={supplierDetail.metrics} />

      {/* Tabs: Overview, Purchase Orders, Payable Bills, Payments, Inventory */}
      <SupplierDetailTabs data={supplierDetail} />

      {/* Edit Form Modal */}
      <SupplierDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        supplier={supplierDetail.supplier}
        onSubmit={handleUpdate}
      />

      {/* Safe Archive Confirmation Modal */}
      <SupplierArchiveDialog
        open={archiveDialogOpen}
        onOpenChange={setArchiveDialogOpen}
        supplier={supplierDetail.supplier}
        mode={archiveMode}
        onConfirm={handleConfirmArchiveAction}
      />
    </div>
  );
}
