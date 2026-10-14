import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: {
      children?: React.ReactNode;
      to?: string;
      [key: string]: unknown;
    }) => {
      const href = typeof to === "string" ? to : "/";
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    },
  };
});

import { InventoryHeader } from "@/components/inventory/inventory-header";
import { InventorySummaryCards } from "@/components/inventory/inventory-summary-cards";
import { InventoryTable } from "@/components/inventory/inventory-table";
import { ReorderRecommendationsPanel } from "@/components/inventory/reorder-recommendations-panel";
import { InventoryRiskAlertsPanel } from "@/components/inventory/inventory-risk-alerts-panel";
import type { InventoryItemWithDetails, InventorySummaryMetrics, ReorderRecommendation, InventoryRiskAlert } from "@/types";

const mockMetrics: InventorySummaryMetrics = {
  totalProducts: 5,
  totalAvailableUnits: 38,
  lowStockCount: 1,
  stockoutRiskCount: 1,
  incomingUnits: 190,
  estimatedValuationPaise: 420000,
};

const mockItems: InventoryItemWithDetails[] = [
  {
    product: {
      id: "prd_1",
      businessId: "biz_1",
      sku: "KUR-COT-001",
      name: "Cotton Kurti",
      category: "Kurtis & Tunics",
      unitCostPaise: 35000,
      unitPricePaise: 80000,
      reorderPoint: 25,
    },
    inventory: {
      id: "inv_1",
      productId: "prd_1",
      quantityOnHand: 12,
      quantityReserved: 10,
      quantityOnOrder: 100,
      updatedAt: "2026-10-14",
    },
    stockOnHand: 12,
    reservedStock: 10,
    availableStock: 2,
    incomingStock: 100,
    reorderThreshold: 25,
    unitCostPaise: 35000,
    inventoryValuationPaise: 420000,
    status: "low_stock",
    statusLabel: "Low stock",
  },
];

describe("Inventory UI Components", () => {
  it("renders InventoryHeader with title, business badge and actions", () => {
    const onAdd = vi.fn();
    const onMovement = vi.fn();
    const onPo = vi.fn();

    render(
      <InventoryHeader
        businessName="Rupi Clothing"
        currency="INR"
        search=""
        onSearchChange={vi.fn()}
        category="all"
        onCategoryChange={vi.fn()}
        status="all"
        onStatusChange={vi.fn()}
        categories={["Kurtis & Tunics", "Outerwear"]}
        onAddProduct={onAdd}
        onRecordMovement={onMovement}
        onCreatePurchaseOrder={onPo}
        onClearFilters={vi.fn()}
        hasActiveFilters={false}
      />,
    );

    expect(screen.getByRole("heading", { name: "Inventory" })).toBeInTheDocument();
    expect(screen.getByText(/Rupi Clothing · INR/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Add product/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Record stock movement/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create purchase order/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Add product/i }));
    expect(onAdd).toHaveBeenCalled();
  });

  it("renders InventorySummaryCards with 6 KPI cards", () => {
    const onSelectFilter = vi.fn();

    render(
      <InventorySummaryCards
        metrics={mockMetrics}
        activeStatusFilter="all"
        onSelectStatusFilter={onSelectFilter}
      />,
    );

    expect(screen.getByText("Total products")).toBeInTheDocument();
    expect(screen.getByText("Available units")).toBeInTheDocument();
    expect(screen.getByText("Low-stock items")).toBeInTheDocument();
    expect(screen.getByText("Stockout risk")).toBeInTheDocument();
    expect(screen.getByText("Incoming units")).toBeInTheDocument();
    expect(screen.getByText("Estimated value")).toBeInTheDocument();

    // Clicking Low-stock card invokes status filter toggle
    fireEvent.click(screen.getByText("Low-stock items"));
    expect(onSelectFilter).toHaveBeenCalledWith("low_stock");
  });

  it("renders InventoryTable with columns, product data and status badge", () => {
    render(
      <InventoryTable
        items={mockItems}
        isLoading={false}
        onSelectProduct={vi.fn()}
        onRecordMovement={vi.fn()}
        onCreatePurchaseOrder={vi.fn()}
        onEditProduct={vi.fn()}
        onViewInGraph={vi.fn()}
        onSimulate={vi.fn()}
        onAddProduct={vi.fn()}
        onClearFilters={vi.fn()}
        hasActiveFilters={false}
      />,
    );

    expect(screen.getByText("Cotton Kurti")).toBeInTheDocument();
    expect(screen.getByText("KUR-COT-001")).toBeInTheDocument();
    expect(screen.getByText("Kurtis & Tunics")).toBeInTheDocument();
    expect(screen.getByText("Low stock")).toBeInTheDocument();
  });

  it("renders ReorderRecommendationsPanel with clear calculations", () => {
    const mockRecs: ReorderRecommendation[] = [
      {
        productId: "prd_1",
        productName: "Cotton Kurti",
        sku: "KUR-COT-001",
        category: "Kurtis & Tunics",
        currentAvailableStock: 2,
        reorderPoint: 25,
        incomingQuantity: 100,
        forecastDemand: 10,
        suggestedReorderQuantity: 20,
        preferredSupplierName: "Shree Textiles",
        proposedPurchaseAmountPaise: 700000,
        customerCommitmentsAtRisk: ["Urban Threads Boutique (10 units)"],
        reason: "Available stock (2 units) is below reorder threshold (25 units).",
        hasSufficientData: true,
      },
    ];

    render(
      <ReorderRecommendationsPanel
        recommendations={mockRecs}
        isLoading={false}
        onSelectProduct={vi.fn()}
        onCreatePurchaseOrder={vi.fn()}
      />,
    );

    expect(screen.getByText("Cotton Kurti")).toBeInTheDocument();
    expect(screen.getByText("Suggested Reorder")).toBeInTheDocument();
    expect(screen.getByText("20 units")).toBeInTheDocument();
    expect(screen.getByText("Shree Textiles (15d lead)")).toBeInTheDocument();
  });

  it("renders InventoryRiskAlertsPanel with severity badge and actions", () => {
    const mockAlerts: InventoryRiskAlert[] = [
      {
        id: "alert_1",
        severity: "critical",
        category: "projected_stockout",
        title: "Projected stockout: Denim Jacket (JKT-DEN-002)",
        explanation: "Only 2 units available with 6 units reserved for Style Mart on Day 9.",
        financialImpactPaise: 1320000,
        actionType: "simulate",
      },
    ];

    render(
      <InventoryRiskAlertsPanel
        alerts={mockAlerts}
        isLoading={false}
        onSelectProduct={vi.fn()}
      />,
    );

    expect(screen.getByText(/Projected stockout: Denim Jacket/)).toBeInTheDocument();
    expect(screen.getByText("critical")).toBeInTheDocument();
    expect(screen.getByText(/Only 2 units available/)).toBeInTheDocument();
  });
});
