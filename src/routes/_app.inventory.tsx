import React, { useState, useMemo } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Package, ShoppingCart, Truck, AlertTriangle, ArrowLeftRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { inventoryApi } from "@/lib/api/inventoryApi";
import { purchaseOrderApi } from "@/lib/api/purchaseOrderApi";
import { supplierApi } from "@/lib/api/supplierApi";
import { InventoryHeader } from "@/components/inventory/inventory-header";
import { InventorySummaryCards } from "@/components/inventory/inventory-summary-cards";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { ProductDialog, type ProductFormValues } from "@/components/inventory/product-dialog";
import {
  StockMovementDialog,
  type MovementFormValues,
} from "@/components/inventory/stock-movement-dialog";
import { PurchaseOrderWizard } from "@/components/inventory/purchase-order-wizard";
import { ProductDetailSheet } from "@/components/inventory/product-detail-sheet";
import { PurchaseOrderList } from "@/components/inventory/purchase-order-list";
import { PurchaseOrderDetailSheet } from "@/components/inventory/purchase-order-detail-sheet";
import { ReorderRecommendationsPanel } from "@/components/inventory/reorder-recommendations-panel";
import { InventoryRiskAlertsPanel } from "@/components/inventory/inventory-risk-alerts-panel";
import type {
  Product,
  InventoryItemWithDetails,
  StockStatus,
  Supplier,
  CreatePurchaseOrderInput,
} from "@/types";

interface InventorySearchParams {
  tab?: "items" | "purchase_orders" | "reorders" | "alerts" | undefined;
  search?: string | undefined;
  category?: string | undefined;
  status?: StockStatus | "all" | undefined;
  selectedProductId?: string | undefined;
  selectedPoId?: string | undefined;
}

const inventoryListQuery = queryOptions({
  queryKey: ["inventory", "list"],
  queryFn: () => inventoryApi.list(),
});

const inventorySummaryQuery = queryOptions({
  queryKey: ["inventory", "summary"],
  queryFn: () => inventoryApi.getSummary(),
});

const suppliersQuery = queryOptions({
  queryKey: ["suppliers", "list"],
  queryFn: () => supplierApi.list(),
});

const purchaseOrdersQuery = queryOptions({
  queryKey: ["purchase-orders", "list"],
  queryFn: () => purchaseOrderApi.list(),
});

const reorderRecommendationsQuery = queryOptions({
  queryKey: ["inventory", "reorders"],
  queryFn: () => inventoryApi.getReorderRecommendations(),
});

const inventoryRiskAlertsQuery = queryOptions({
  queryKey: ["inventory", "alerts"],
  queryFn: () => inventoryApi.getRiskAlerts(),
});

export const Route = createFileRoute("/_app/inventory")({
  validateSearch: (search: Record<string, unknown>): InventorySearchParams => {
    const rawTab = search["tab"];
    const validTabs = ["items", "purchase_orders", "reorders", "alerts"];
    const tab =
      typeof rawTab === "string" && validTabs.includes(rawTab)
        ? (rawTab as InventorySearchParams["tab"])
        : "items";

    const searchParam = typeof search["search"] === "string" ? search["search"] : undefined;
    const category = typeof search["category"] === "string" ? search["category"] : undefined;
    const status =
      typeof search["status"] === "string" ? (search["status"] as StockStatus | "all") : undefined;
    const selectedProductId =
      typeof search["selectedProductId"] === "string" ? search["selectedProductId"] : undefined;
    const selectedPoId =
      typeof search["selectedPoId"] === "string" ? search["selectedPoId"] : undefined;

    return {
      tab,
      search: searchParam,
      category,
      status,
      selectedProductId,
      selectedPoId,
    };
  },
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(inventoryListQuery),
      context.queryClient.ensureQueryData(inventorySummaryQuery),
      context.queryClient.ensureQueryData(suppliersQuery),
      context.queryClient.ensureQueryData(purchaseOrdersQuery),
      context.queryClient.ensureQueryData(reorderRecommendationsQuery),
      context.queryClient.ensureQueryData(inventoryRiskAlertsQuery),
    ]);
  },
  head: () => ({
    meta: [
      { title: "Inventory — Ripple" },
      {
        name: "description",
        content:
          "Connect stock availability with procurement costs and customer commitments for Rupi Clothing.",
      },
      { property: "og:title", content: "Inventory — Ripple" },
      {
        property: "og:description",
        content: "Stock levels, reorder planning, purchase orders and cash flow impact.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate({ from: Route.fullPath });
  const searchParams = Route.useSearch();

  // Suspense Queries
  const {
    data: inventoryData,
    isLoading,
    error,
    refetch: refetchInventory,
  } = useSuspenseQuery(inventoryListQuery);
  const { data: summaryMetrics } = useSuspenseQuery(inventorySummaryQuery);
  const { data: suppliersData } = useSuspenseQuery(suppliersQuery);
  const { data: purchaseOrdersData } = useSuspenseQuery(purchaseOrdersQuery);
  const { data: reordersData } = useSuspenseQuery(reorderRecommendationsQuery);
  const { data: alertsData } = useSuspenseQuery(inventoryRiskAlertsQuery);

  const items = inventoryData.data;
  const suppliers = suppliersData.data;
  const purchaseOrders = purchaseOrdersData.data;
  const reorders = reordersData;
  const alerts = alertsData;

  // Local UI State
  const activeTab = searchParams.tab || "items";
  const searchFilter = searchParams.search || "";
  const categoryFilter = searchParams.category || "all";
  const statusFilter = searchParams.status || "all";
  const selectedProductId = searchParams.selectedProductId || null;
  const selectedPoId = searchParams.selectedPoId || null;

  // Dialog States
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [isMovementDialogOpen, setIsMovementDialogOpen] = useState(false);
  const [movementPrefillProductId, setMovementPrefillProductId] = useState<string | null>(null);

  const [isPoWizardOpen, setIsPoWizardOpen] = useState(false);
  const [poPrefillProductId, setPoPrefillProductId] = useState<string | null>(null);
  const [poPrefillSupplierId, setPoPrefillSupplierId] = useState<string | null>(null);

  // Detail Sheet Query for Selected Product
  const selectedProductDetailQuery = useQuery({
    queryKey: ["inventory", "detail", selectedProductId],
    queryFn: () => (selectedProductId ? inventoryApi.getById(selectedProductId) : null),
    enabled: Boolean(selectedProductId),
  });

  // Selected PO Detail
  const selectedPoDetail = useMemo(() => {
    if (!selectedPoId) return null;
    return purchaseOrders.find((p) => p.id === selectedPoId) || null;
  }, [selectedPoId, purchaseOrders]);

  // Distinct categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const item of items) {
      if (item.product.category) set.add(item.product.category);
    }
    return Array.from(set).sort();
  }, [items]);

  // Filtered Inventory Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const matchesName = item.product.name.toLowerCase().includes(q);
        const matchesSku = item.product.sku.toLowerCase().includes(q);
        const matchesCat = item.product.category?.toLowerCase().includes(q);
        if (!matchesName && !matchesSku && !matchesCat) return false;
      }
      if (categoryFilter !== "all" && item.product.category !== categoryFilter) {
        return false;
      }
      if (statusFilter !== "all" && item.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [items, searchFilter, categoryFilter, statusFilter]);

  // Handlers for URL search params updates
  const handleUpdateSearch = (patch: Partial<InventorySearchParams>) => {
    navigate({
      search: (prev) => {
        const updated = { ...prev, ...patch };
        // Clean undefined or empty strings
        if (!updated.search) delete updated.search;
        if (updated.category === "all") delete updated.category;
        if (updated.status === "all") delete updated.status;
        if (!updated.selectedProductId) delete updated.selectedProductId;
        if (!updated.selectedPoId) delete updated.selectedPoId;
        return updated;
      },
    });
  };

  const handleClearFilters = () => {
    navigate({
      search: (prev) => ({
        tab: prev.tab,
      }),
    });
  };

  const hasActiveFilters = Boolean(
    searchFilter.trim() !== "" || categoryFilter !== "all" || statusFilter !== "all",
  );

  // Invalidate all inventory-related queries
  const invalidateAll = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["inventory"] }),
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard", "summary"] }),
      queryClient.invalidateQueries({ queryKey: ["forecast"] }),
      queryClient.invalidateQueries({ queryKey: ["relationships", "graph"] }),
    ]);
  };

  // Product Add / Edit Handler
  const handleProductSubmit = async (values: ProductFormValues, isEdit: boolean) => {
    if (isEdit && editingProduct) {
      await inventoryApi.update(editingProduct.id, {
        name: values.name,
        sku: values.sku,
        category: values.category,
        description: values.description,
        unitOfMeasure: values.unitOfMeasure,
        reorderPoint: values.reorderPoint,
        preferredSupplierId: values.preferredSupplierId,
        unitCostPaise: values.unitCostRupees ? Math.round(values.unitCostRupees * 100) : 0,
      });
      toast.success(`Product "${values.name}" updated successfully.`);
    } else {
      await inventoryApi.create({
        name: values.name,
        sku: values.sku,
        category: values.category,
        description: values.description,
        unitOfMeasure: values.unitOfMeasure,
        initialStockQuantity: values.initialStockQuantity,
        reorderPoint: values.reorderPoint,
        preferredSupplierId: values.preferredSupplierId,
        unitCostPaise: values.unitCostRupees ? Math.round(values.unitCostRupees * 100) : 0,
        currency: values.currency,
      });
      toast.success(`Product "${values.name}" created with SKU ${values.sku}.`);
    }

    await invalidateAll();
    setIsProductDialogOpen(false);
    setEditingProduct(null);
  };

  // Record Stock Movement Handler
  const handleRecordMovementSubmit = async (values: MovementFormValues) => {
    const mov = await inventoryApi.recordMovement({
      productId: values.productId,
      type: values.type,
      quantity: values.quantity,
      date: values.date,
      referenceType: values.referenceType,
      referenceId: values.referenceId,
      note: values.note,
    });

    const prod = items.find((p) => p.product.id === values.productId);
    toast.success(
      `Recorded ${values.type.replace(/_/g, " ")} of ${values.quantity} units for ${
        prod?.product.name || "product"
      }. New balance: ${mov.resultingBalance} units.`,
    );

    await invalidateAll();
    setIsMovementDialogOpen(false);
  };

  // Create Purchase Order Handler
  const handleCreatePoSubmit = async (input: CreatePurchaseOrderInput): Promise<string> => {
    const po = await purchaseOrderApi.create(input);
    toast.success(`Purchase order ${po.poNumber || po.id} created successfully.`);
    await invalidateAll();
    return po.id;
  };

  return (
    <div className="space-y-6">
      {/* A. Inventory Header & Controls */}
      <InventoryHeader
        businessName="Rupi Clothing"
        currency="INR"
        search={searchFilter}
        onSearchChange={(search) => handleUpdateSearch({ search })}
        category={categoryFilter}
        onCategoryChange={(category) => handleUpdateSearch({ category })}
        status={statusFilter}
        onStatusChange={(status) => handleUpdateSearch({ status })}
        categories={categories}
        onAddProduct={() => {
          setEditingProduct(null);
          setIsProductDialogOpen(true);
        }}
        onRecordMovement={() => {
          setMovementPrefillProductId(null);
          setIsMovementDialogOpen(true);
        }}
        onCreatePurchaseOrder={() => {
          setPoPrefillProductId(null);
          setPoPrefillSupplierId(null);
          setIsPoWizardOpen(true);
        }}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Summary Metrics Cards */}
      <InventorySummaryCards
        metrics={summaryMetrics}
        activeStatusFilter={statusFilter}
        onSelectStatusFilter={(status) => handleUpdateSearch({ status })}
        onNavigateToPurchaseOrders={() => handleUpdateSearch({ tab: "purchase_orders" })}
      />

      {/* Module Tabs Navigation */}
      <Tabs
        value={activeTab}
        onValueChange={(tab) => handleUpdateSearch({ tab: tab as InventorySearchParams["tab"] })}
        className="w-full space-y-4"
      >
        <TabsList className="grid grid-cols-4 w-full sm:w-[540px] h-9">
          <TabsTrigger value="items" className="text-xs">
            Inventory ({items.length})
          </TabsTrigger>
          <TabsTrigger value="purchase_orders" className="text-xs">
            Purchase Orders ({purchaseOrders.length})
          </TabsTrigger>
          <TabsTrigger value="reorders" className="text-xs">
            Reorders ({reorders.length})
          </TabsTrigger>
          <TabsTrigger value="alerts" className="text-xs">
            Risk Alerts ({alerts.length})
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Inventory Table */}
        <TabsContent value="items" className="space-y-4">
          <InventoryTable
            items={filteredItems}
            isLoading={isLoading}
            error={error}
            onRetry={refetchInventory}
            onSelectProduct={(id) => handleUpdateSearch({ selectedProductId: id })}
            onRecordMovement={(id) => {
              setMovementPrefillProductId(id);
              setIsMovementDialogOpen(true);
            }}
            onCreatePurchaseOrder={(id) => {
              const prod = items.find((p) => p.product.id === id);
              setPoPrefillProductId(id);
              setPoPrefillSupplierId(prod?.product.preferredSupplierId || null);
              setIsPoWizardOpen(true);
            }}
            onEditProduct={(product) => {
              setEditingProduct(product);
              setIsProductDialogOpen(true);
            }}
            onViewInGraph={(id) => {
              navigate({
                to: "/relationships",
                search: { selectedId: `node_stock_1` },
              });
            }}
            onSimulate={(id, name) => {
              navigate({
                to: "/simulator",
                search: {
                  eventId: `node_stock_1`,
                  eventName: `${name} Restock`,
                },
              });
            }}
            onAddProduct={() => {
              setEditingProduct(null);
              setIsProductDialogOpen(true);
            }}
            onClearFilters={handleClearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </TabsContent>

        {/* TAB 2: Purchase Orders Tracking */}
        <TabsContent value="purchase_orders" className="space-y-4">
          <PurchaseOrderList
            orders={purchaseOrders}
            suppliers={suppliers}
            isLoading={false}
            onSelectPo={(poId) => handleUpdateSearch({ selectedPoId: poId })}
            onCreatePo={() => {
              setPoPrefillProductId(null);
              setPoPrefillSupplierId(null);
              setIsPoWizardOpen(true);
            }}
            onReceiveItems={(poId) => {
              const po = purchaseOrders.find((p) => p.id === poId);
              const firstItem = po?.lineItemsDetails?.[0];
              if (firstItem) {
                setMovementPrefillProductId(firstItem.productId);
              }
              setIsMovementDialogOpen(true);
            }}
          />
        </TabsContent>

        {/* TAB 3: Reorder Recommendations */}
        <TabsContent value="reorders" className="space-y-4">
          <ReorderRecommendationsPanel
            recommendations={reorders}
            isLoading={false}
            onSelectProduct={(id) => handleUpdateSearch({ selectedProductId: id })}
            onCreatePurchaseOrder={(productId, supplierId) => {
              setPoPrefillProductId(productId);
              setPoPrefillSupplierId(supplierId || null);
              setIsPoWizardOpen(true);
            }}
          />
        </TabsContent>

        {/* TAB 4: Inventory Risk Alerts */}
        <TabsContent value="alerts" className="space-y-4">
          <InventoryRiskAlertsPanel
            alerts={alerts}
            isLoading={false}
            onSelectProduct={(id) => handleUpdateSearch({ selectedProductId: id })}
            onSelectPurchaseOrder={(poId) => handleUpdateSearch({ selectedPoId: poId })}
          />
        </TabsContent>
      </Tabs>

      {/* Product Creation & Editing Dialog */}
      <ProductDialog
        open={isProductDialogOpen}
        onOpenChange={(open) => {
          setIsProductDialogOpen(open);
          if (!open) setEditingProduct(null);
        }}
        product={editingProduct}
        suppliers={suppliers}
        categories={categories}
        onSubmit={handleProductSubmit}
      />

      {/* Stock Movement Recording Dialog */}
      <StockMovementDialog
        open={isMovementDialogOpen}
        onOpenChange={setIsMovementDialogOpen}
        products={items}
        purchaseOrders={purchaseOrders}
        customerOrders={items.flatMap((p) => [])}
        prefilledProductId={movementPrefillProductId}
        onSubmit={handleRecordMovementSubmit}
      />

      {/* Purchase Order 5-Step Creation Wizard */}
      <PurchaseOrderWizard
        open={isPoWizardOpen}
        onOpenChange={setIsPoWizardOpen}
        suppliers={suppliers}
        products={items}
        prefilledProductId={poPrefillProductId}
        prefilledSupplierId={poPrefillSupplierId}
        onSubmit={handleCreatePoSubmit}
        onSuccessNavigate={(poId) => {
          handleUpdateSearch({ tab: "purchase_orders", selectedPoId: poId });
        }}
      />

      {/* Product Detail Side Panel */}
      <ProductDetailSheet
        open={Boolean(selectedProductId)}
        onOpenChange={(open) => {
          if (!open) handleUpdateSearch({ selectedProductId: undefined });
        }}
        data={selectedProductDetailQuery.data}
        isLoading={selectedProductDetailQuery.isLoading}
        onRecordMovement={(id) => {
          setMovementPrefillProductId(id);
          setIsMovementDialogOpen(true);
        }}
        onCreatePurchaseOrder={(id) => {
          const prod = items.find((p) => p.product.id === id);
          setPoPrefillProductId(id);
          setPoPrefillSupplierId(prod?.product.preferredSupplierId || null);
          setIsPoWizardOpen(true);
        }}
        onEditProduct={() => {
          if (selectedProductDetailQuery.data) {
            setEditingProduct(selectedProductDetailQuery.data.product);
            setIsProductDialogOpen(true);
          }
        }}
        onViewPoDetails={(poId) => {
          handleUpdateSearch({
            selectedProductId: undefined,
            selectedPoId: poId,
            tab: "purchase_orders",
          });
        }}
      />

      {/* Purchase Order Detail Sheet */}
      <PurchaseOrderDetailSheet
        open={Boolean(selectedPoId)}
        onOpenChange={(open) => {
          if (!open) handleUpdateSearch({ selectedPoId: undefined });
        }}
        order={selectedPoDetail}
        onReceiveStock={(poId) => {
          const po = purchaseOrders.find((p) => p.id === poId);
          const firstItem = po?.lineItemsDetails?.[0];
          if (firstItem) {
            setMovementPrefillProductId(firstItem.productId);
          }
          setIsMovementDialogOpen(true);
        }}
      />
    </div>
  );
}
