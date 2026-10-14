import React from "react";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
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

import { SupplierSummaryCards } from "@/components/suppliers/supplier-summary-cards";
import { SupplierTable } from "@/components/suppliers/supplier-table";
import { SupplierDetailTabs } from "@/components/suppliers/supplier-detail-tabs";
import { SupplierArchiveDialog } from "@/components/suppliers/supplier-archive-dialog";
import type { SupplierSummaryMetrics, EnrichedSupplier, SupplierDetailData } from "@/types";

const mockMetrics: SupplierSummaryMetrics = {
  totalSuppliers: 4,
  activeSuppliers: 3,
  archivedSuppliers: 1,
  totalOutstandingPayablesPaise: 5970000,
  dueInSevenDaysPaise: 3000000,
  overduePayablesPaise: 120000,
  atRiskSuppliersCount: 1,
};

const mockSuppliers: EnrichedSupplier[] = [
  {
    id: "sup_1",
    businessId: "biz_1",
    name: "Shree Textiles",
    contactName: "Anil Shree",
    email: "anil@shreetextiles.in",
    phone: "+91 98200 12345",
    address: "Plot 42, GIDC, Surat",
    taxId: "24AAACS1234F1Z8",
    paymentTermsDays: 30,
    outstandingPaise: 3000000,
    reliabilityScore: 86,
    status: "active",
    leadTimeDays: 4,
    openPoCount: 1,
    totalPoCount: 2,
    nextPaymentDate: "2026-10-18",
    nextPaymentAmountPaise: 3000000,
    overdueAmountPaise: 0,
    hasOverdue: false,
    isAtRisk: false,
    riskReasons: [],
    payableInvoicesCount: 1,
  },
  {
    id: "sup_3",
    businessId: "biz_1",
    name: "Khan Dye House",
    contactName: "Imran Khan",
    email: "imran@khandye.in",
    phone: "+91 98200 54321",
    taxId: "27AAECK9012H1ZQ",
    paymentTermsDays: 15,
    outstandingPaise: 720000,
    reliabilityScore: 71,
    status: "active",
    leadTimeDays: 7,
    openPoCount: 1,
    totalPoCount: 1,
    nextPaymentDate: "2026-10-26",
    nextPaymentAmountPaise: 600000,
    overdueAmountPaise: 120000,
    hasOverdue: true,
    isAtRisk: true,
    riskReasons: ["Reliability below 80%", "Overdue payment ₹1,200"],
    payableInvoicesCount: 2,
  },
  {
    id: "sup_4",
    businessId: "biz_1",
    name: "Heritage Weaves",
    contactName: "Kavita Rao",
    email: "kavita@heritageweaves.in",
    taxId: "23AABCH8877J1ZV",
    paymentTermsDays: 30,
    outstandingPaise: 0,
    reliabilityScore: 95,
    status: "archived",
    openPoCount: 0,
    totalPoCount: 0,
    overdueAmountPaise: 0,
    hasOverdue: false,
    isAtRisk: false,
    riskReasons: [],
    payableInvoicesCount: 0,
  },
];

const mockSupplierDetail: SupplierDetailData = {
  supplier: mockSuppliers[0]!,
  metrics: {
    totalPurchasesPaise: 3500000,
    totalPaymentsMadePaise: 500000,
    outstandingPayablesPaise: 3000000,
    overdueBalancePaise: 0,
    openPoCount: 1,
    totalPoCount: 1,
    onTimeDeliveryRate: 95,
    reliabilityScore: 86,
    riskLevel: "low",
    riskFactors: ["All payments and delivery terms in good standing"],
  },
  purchaseOrders: [
    {
      id: "po_1",
      poNumber: "PO-2026-001",
      supplierId: "sup_1",
      productId: "prd_1",
      quantity: 100,
      totalPaise: 3500000,
      advancePaidPaise: 500000,
      status: "confirmed",
      orderDate: "2026-10-12",
      expectedDeliveryDate: "2026-10-18",
      paymentTermsDays: 30,
      paymentDueDate: "2026-11-17",
      receivedQuantity: 0,
      orderedUnits: 100,
      receivedUnits: 0,
      outstandingPaise: 3000000,
      lineItemsDetails: [
        {
          id: "poli_1",
          purchaseOrderId: "po_1",
          productId: "prd_1",
          quantity: 100,
          unitPricePaise: 35000,
          totalPaise: 3500000,
          product: {
            id: "prd_1",
            businessId: "biz_1",
            sku: "KUR-COT-001",
            name: "Cotton Kurti",
            unitCostPaise: 35000,
            unitPricePaise: 80000,
            reorderPoint: 25,
          },
        },
      ],
    },
  ],
  invoices: [
    {
      id: "inv_bill_101",
      invoiceNumber: "BILL-2026-001",
      type: "payable",
      supplierId: "sup_1",
      purchaseOrderId: "po_1",
      amountPaise: 3500000,
      amountPaidPaise: 500000,
      status: "partially_paid",
      issueDate: "2026-10-12",
      dueDate: "2026-11-17",
      notes: "Advance settled; balance net-30.",
    },
  ],
  payments: [
    {
      id: "pay_1",
      direction: "outgoing",
      supplierId: "sup_1",
      purchaseOrderId: "po_1",
      amountPaise: 500000,
      status: "completed",
      scheduledDate: "2026-10-12",
      completedDate: "2026-10-12",
      method: "UPI",
    },
  ],
  upcomingPayments: [
    {
      id: "pay_3",
      direction: "outgoing",
      supplierId: "sup_1",
      purchaseOrderId: "po_1",
      invoiceId: "inv_bill_101",
      amountPaise: 3000000,
      status: "scheduled",
      scheduledDate: "2026-10-18",
      method: "Bank Transfer",
      dueDate: "2026-10-18",
      linkedReference: "PO-2026-001",
      cashFlowImpactNote: "Scheduled outflow in 4 days",
    },
  ],
  completedPayments: [
    {
      id: "pay_1",
      direction: "outgoing",
      supplierId: "sup_1",
      purchaseOrderId: "po_1",
      amountPaise: 500000,
      status: "completed",
      scheduledDate: "2026-10-12",
      completedDate: "2026-10-12",
      method: "UPI",
    },
  ],
  products: [
    {
      id: "prd_1",
      businessId: "biz_1",
      sku: "KUR-COT-001",
      name: "Cotton Kurti",
      category: "Kurtis & Tunics",
      unitCostPaise: 35000,
      unitPricePaise: 80000,
      reorderPoint: 25,
      preferredSupplierId: "sup_1",
    },
  ],
};

describe("Supplier Components Rendering", () => {
  it("renders SupplierSummaryCards with all 5 metrics accurately", () => {
    render(<SupplierSummaryCards metrics={mockMetrics} />);

    expect(screen.getByText("Active suppliers")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();

    expect(screen.getByText("Total outstanding")).toBeInTheDocument();
    expect(screen.getByText("Due within 7 days")).toBeInTheDocument();
    expect(screen.getByText("Overdue payables")).toBeInTheDocument();
    expect(screen.getByText("At-risk suppliers")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders SupplierTable with columns, counterparty records, and risk badges", () => {
    const handleEdit = vi.fn();
    const handleArchive = vi.fn();
    const handleUnarchive = vi.fn();
    const handleDelete = vi.fn();
    const handleAdd = vi.fn();
    const handleSearch = vi.fn();
    const handleStatusFilter = vi.fn();
    const handleRiskFilter = vi.fn();
    const handleSort = vi.fn();
    const handleSortDir = vi.fn();

    render(
      <SupplierTable
        suppliers={mockSuppliers}
        searchQuery=""
        onSearchChange={handleSearch}
        statusFilter="all"
        onStatusFilterChange={handleStatusFilter}
        riskFilter="all"
        onRiskFilterChange={handleRiskFilter}
        sortBy="name"
        onSortChange={handleSort}
        sortDir="asc"
        onSortDirToggle={handleSortDir}
        onEdit={handleEdit}
        onArchive={handleArchive}
        onUnarchive={handleUnarchive}
        onDelete={handleDelete}
        onAddSupplier={handleAdd}
      />,
    );

    expect(screen.getByText("Shree Textiles")).toBeInTheDocument();
    expect(screen.getByText("Khan Dye House")).toBeInTheDocument();
    expect(screen.getByText("Heritage Weaves")).toBeInTheDocument();

    // Risk indicator badge for Khan Dye House
    expect(screen.getByText("At risk")).toBeInTheDocument();

    // Archived badge for Heritage Weaves
    expect(screen.getByText("Archived")).toBeInTheDocument();
  });

  it("renders SupplierDetailTabs with all sections and maintains delivery separation", () => {
    // 1. Overview tab
    const { rerender } = render(
      <SupplierDetailTabs data={mockSupplierDetail} activeTab="overview" />,
    );
    expect(screen.getByText("Vendor Profile & Terms")).toBeInTheDocument();
    expect(screen.getByText("Shree Textiles")).toBeInTheDocument();
    expect(screen.getByText("Net 30 Days")).toBeInTheDocument();

    // 2. Purchase Orders tab — Delivery status distinct from Payment status
    rerender(<SupplierDetailTabs data={mockSupplierDetail} activeTab="orders" />);
    expect(screen.getByText("PO-2026-001")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument(); // Delivery status
    expect(screen.getByText("Partially paid")).toBeInTheDocument(); // Payment status

    // 3. Payable Invoices tab
    rerender(<SupplierDetailTabs data={mockSupplierDetail} activeTab="invoices" />);
    expect(screen.getByText("BILL-2026-001")).toBeInTheDocument();

    // 4. Payments tab
    rerender(<SupplierDetailTabs data={mockSupplierDetail} activeTab="payments" />);
    expect(screen.getByText("Upcoming Payment Commitments")).toBeInTheDocument();
    expect(screen.getByText("Scheduled outflow in 4 days")).toBeInTheDocument();

    // 5. Supplied Products tab
    rerender(<SupplierDetailTabs data={mockSupplierDetail} activeTab="inventory" />);
    expect(screen.getByText("Cotton Kurti")).toBeInTheDocument();
    expect(screen.getByText("KUR-COT-001")).toBeInTheDocument();
  });

  it("renders SupplierArchiveDialog with safety explanations", async () => {
    const handleConfirm = vi.fn().mockResolvedValue(undefined);
    const handleOpenChange = vi.fn();

    render(
      <SupplierArchiveDialog
        open={true}
        onOpenChange={handleOpenChange}
        supplier={mockSuppliers[0]!}
        mode="archive"
        onConfirm={handleConfirm}
      />,
    );

    expect(screen.getByText(/Archive Shree Textiles\?/i)).toBeInTheDocument();
    expect(
      screen.getByText(/All historical purchase orders, payable invoices, outgoing payments/i),
    ).toBeInTheDocument();

    const archiveBtn = screen.getByRole("button", { name: /Archive Supplier/i });
    await act(async () => {
      fireEvent.click(archiveBtn);
    });
    expect(handleConfirm).toHaveBeenCalled();
  });
});
