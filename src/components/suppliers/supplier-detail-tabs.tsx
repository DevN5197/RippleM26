import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Calendar,
  Clock,
  Package,
  Receipt,
  CreditCard,
  FileText,
  Truck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ShieldAlert,
  Info,
  MapPin,
  Mail,
  Phone,
  Layers,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MoneyAmount } from "@/components/shared/money-amount";
import { DateLabel } from "@/components/shared/date-label";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney, formatDate } from "@/lib/formatters";
import type { SupplierDetailData } from "@/types";

interface SupplierDetailTabsProps {
  data: SupplierDetailData;
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function SupplierDetailTabs({
  data,
  defaultTab = "overview",
  activeTab,
  onTabChange,
}: SupplierDetailTabsProps) {
  const [internalTab, setInternalTab] = useState<string>(defaultTab);
  const currentTab = activeTab ?? internalTab;
  const handleTabChange = onTabChange ?? setInternalTab;

  const {
    supplier,
    metrics,
    purchaseOrders,
    invoices,
    upcomingPayments,
    completedPayments,
    products,
  } = data;

  return (
    <Tabs value={currentTab} onValueChange={handleTabChange} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 md:grid-cols-5">
        <TabsTrigger value="overview">Overview & Profile</TabsTrigger>
        <TabsTrigger value="orders" className="gap-1.5">
          <span>Purchase Orders</span>
          {purchaseOrders.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
              {purchaseOrders.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="invoices" className="gap-1.5">
          <span>Payable Invoices</span>
          {invoices.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
              {invoices.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="payments" className="gap-1.5">
          <span>Payments & Commitments</span>
          {upcomingPayments.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
              {upcomingPayments.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="inventory" className="gap-1.5">
          <span>Supplied Products</span>
          {products.length > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-[11px]">
              {products.length}
            </Badge>
          )}
        </TabsTrigger>
      </TabsList>

      {/* --- TAB 1: OVERVIEW & PROFILE --- */}
      <TabsContent value="overview" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Vendor Information Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Vendor Profile & Terms
              </CardTitle>
              <CardDescription>
                Official business credentials and settlement arrangement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3.5 text-sm">
              <div className="grid grid-cols-2 gap-2 border-b pb-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Entity Name</span>
                  <p className="font-semibold text-foreground text-sm">{supplier.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Operational Status</span>
                  <div className="mt-0.5">
                    <StatusBadge status={supplier.status ?? "active"} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b pb-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Primary Contact</span>
                  <p className="font-medium text-foreground">{supplier.contactName || "—"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Tax Identifier (GSTIN)</span>
                  <p className="font-mono font-medium text-foreground">{supplier.taxId || "—"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b pb-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Email</span>
                  <p className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                    {supplier.email ? (
                      <>
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="truncate">{supplier.email}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Phone</span>
                  <p className="font-medium text-foreground flex items-center gap-1 mt-0.5">
                    {supplier.phone ? (
                      <>
                        <Phone className="h-3 w-3 text-muted-foreground" />
                        <span>{supplier.phone}</span>
                      </>
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 border-b pb-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Agreed Credit Terms</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    Net {supplier.paymentTermsDays} Days
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Expected Delivery Lead Time</span>
                  <p className="font-semibold text-foreground mt-0.5">
                    {supplier.leadTimeDays ? `${supplier.leadTimeDays} Days` : "Standard (7 Days)"}
                  </p>
                </div>
              </div>

              <div className="text-xs">
                <span className="text-muted-foreground">Registered Address</span>
                <p className="font-medium text-foreground mt-0.5 flex items-start gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground mt-0.5" />
                  <span>{supplier.address || "No formal address recorded on file"}</span>
                </p>
              </div>

              {supplier.notes && (
                <div className="rounded-md bg-muted/50 p-2.5 text-xs text-muted-foreground">
                  <strong className="text-foreground font-medium">Notes:</strong> {supplier.notes}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Reliability & Risk Assessment Card */}
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Truck className="h-4 w-4 text-primary" />
                Reliability & Fulfillment Assessment
              </CardTitle>
              <CardDescription>
                Historic delivery timeliness and settlement risk factors
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-muted-foreground">
                    Overall Reliability Index
                  </span>
                  <span className="font-bold text-foreground tabular-nums">
                    {metrics.reliabilityScore}/100
                  </span>
                </div>
                <Progress value={metrics.reliabilityScore} className="h-2" />
                <span className="mt-1 block text-[11px] text-muted-foreground">
                  Computed from on-time delivery track record, defect rate, and terms adherence.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-card p-3 text-xs">
                <div>
                  <span className="text-muted-foreground">On-Time Delivery Rate</span>
                  <p className="text-lg font-bold text-foreground mt-0.5">
                    {metrics.onTimeDeliveryRate}%
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Risk Category</span>
                  <div className="mt-1">
                    <StatusBadge status={metrics.riskLevel} />
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-medium text-foreground block mb-1.5">
                  Identified Risk Factors:
                </span>
                <ul className="space-y-1.5">
                  {metrics.riskFactors.map((factor, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground"
                    >
                      {metrics.riskLevel === "high" ? (
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-destructive mt-0.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success mt-0.5" />
                      )}
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-2">
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link to="/relationships" search={{ selectedId: `node_${supplier.id}` }}>
                    <Layers className="mr-1.5 h-3.5 w-3.5" />
                    Inspect Ripple Dependency Graph
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* --- TAB 2: PURCHASE ORDERS & DELIVERIES --- */}
      <TabsContent value="orders" className="space-y-4">
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Purchase Orders & Physical Deliveries</CardTitle>
                <CardDescription>
                  Tracking procurement orders, fulfilled quantities, and delivery dates
                  independently from payment status.
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link to="/inventory" search={{ tab: "purchase_orders" }}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Inventory PO Manager
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {purchaseOrders.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No purchase orders issued"
                description={`No purchase orders have been dispatched to ${supplier.name} yet.`}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>PO Number</TableHead>
                      <TableHead>Order Date</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead>Received / Ordered</TableHead>
                      <TableHead className="text-right">Order Amount</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead className="text-center">Delivery Status</TableHead>
                      <TableHead className="text-center">Payment Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrders.map((po) => {
                      const remainingPaise = Math.max(0, po.totalPaise - po.advancePaidPaise);
                      const paymentStatus =
                        remainingPaise === 0
                          ? "paid"
                          : po.advancePaidPaise > 0
                            ? "partially_paid"
                            : "sent";

                      return (
                        <TableRow key={po.id}>
                          <TableCell className="font-medium text-foreground">
                            {po.poNumber ?? po.id}
                            {po.lineItemsDetails && po.lineItemsDetails[0]?.product && (
                              <span className="block text-[11px] text-muted-foreground truncate max-w-[180px]">
                                {po.lineItemsDetails[0].product.name}
                                {po.lineItemsDetails.length > 1 &&
                                  ` (+${po.lineItemsDetails.length - 1} more)`}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <DateLabel iso={po.orderDate} />
                          </TableCell>
                          <TableCell>
                            <DateLabel iso={po.expectedDeliveryDate} />
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium text-foreground">
                              {po.receivedUnits} / {po.orderedUnits} units
                            </span>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <MoneyAmount amountPaise={po.totalPaise} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <MoneyAmount amountPaise={po.advancePaidPaise} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <MoneyAmount amountPaise={remainingPaise} className="font-medium" />
                          </TableCell>
                          {/* Delivery Status - Separate from payment */}
                          <TableCell className="text-center">
                            <StatusBadge status={po.status} />
                          </TableCell>
                          {/* Payment Status */}
                          <TableCell className="text-center">
                            <StatusBadge status={paymentStatus} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* --- TAB 3: PAYABLE INVOICES (BILLS) --- */}
      <TabsContent value="invoices" className="space-y-4">
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Accounts Payable Invoices (Supplier Bills)</CardTitle>
            <CardDescription>
              Supplier invoices received, due dates, settlement status, and balance payable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No payable invoices recorded"
                description={`No bills or accounts payable invoices are currently linked to ${supplier.name}.`}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill / Invoice #</TableHead>
                      <TableHead>PO Reference</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Bill Total</TableHead>
                      <TableHead className="text-right">Amount Paid</TableHead>
                      <TableHead className="text-right">Balance Due</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => {
                      const balancePaise = Math.max(0, inv.amountPaise - inv.amountPaidPaise);

                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-medium text-foreground">
                            {inv.invoiceNumber}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {inv.purchaseOrderId ?? "Direct Purchase"}
                          </TableCell>
                          <TableCell>
                            <DateLabel iso={inv.issueDate} />
                          </TableCell>
                          <TableCell>
                            <DateLabel iso={inv.dueDate} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <MoneyAmount amountPaise={inv.amountPaise} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <MoneyAmount amountPaise={inv.amountPaidPaise} />
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            <MoneyAmount amountPaise={balancePaise} className="font-medium" />
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusBadge status={inv.status} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* --- TAB 4: PAYMENTS & COMMITMENTS --- */}
      <TabsContent value="payments" className="space-y-4">
        {/* Notice on payment execution */}
        <Alert className="bg-primary/5 border-primary/20">
          <Info className="h-4 w-4 text-primary" />
          <AlertTitle className="text-xs font-semibold text-foreground">
            Cash-flow planning interface (Read-only)
          </AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            Upcoming payment commitments reflect planned bank disbursements and affect projected
            cash balance in the Cash Flow module. Execution occurs through banking settlement rails.
          </AlertDescription>
        </Alert>

        {/* Upcoming Commitments */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Upcoming Payment Commitments
            </CardTitle>
            <CardDescription>
              Scheduled disbursements with estimated cash-flow liquidity impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingPayments.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="No pending disbursements"
                description={`All current liabilities for ${supplier.name} are fully settled or not yet scheduled.`}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Linked Order / Invoice</TableHead>
                      <TableHead className="text-right">Scheduled Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="min-w-[200px]">Cash Flow Impact</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-medium">
                          <DateLabel iso={payment.scheduledDate} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {payment.linkedReference || payment.purchaseOrderId || "Vendor account"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <MoneyAmount
                            amountPaise={payment.amountPaise}
                            className="font-semibold"
                          />
                        </TableCell>
                        <TableCell className="text-xs">
                          {payment.method || "Bank Transfer"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <span className="font-medium text-foreground">
                            {payment.cashFlowImpactNote}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={payment.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historical Settled Payments */}
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Settled Payment History
            </CardTitle>
            <CardDescription>Reconciled historical disbursements to this vendor</CardDescription>
          </CardHeader>
          <CardContent>
            {completedPayments.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                No past settled payments recorded for this supplier.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payment Date</TableHead>
                      <TableHead>Linked Order / Invoice</TableHead>
                      <TableHead className="text-right">Disbursed Amount</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {completedPayments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <DateLabel iso={payment.completedDate ?? payment.scheduledDate} />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {payment.invoiceId ?? payment.purchaseOrderId ?? "Vendor settlement"}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <MoneyAmount amountPaise={payment.amountPaise} />
                        </TableCell>
                        <TableCell className="text-xs">
                          {payment.method || "Electronic Transfer"}
                        </TableCell>
                        <TableCell className="text-center">
                          <StatusBadge status={payment.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* --- TAB 5: SUPPLIED PRODUCTS & INVENTORY --- */}
      <TabsContent value="inventory" className="space-y-4">
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">
                  Catalog Products Sourced from {supplier.name}
                </CardTitle>
                <CardDescription>
                  Inventory items with stock on hand, reorder thresholds, and unit costs.
                </CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link to="/inventory">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  View Inventory
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {products.length === 0 ? (
              <EmptyState
                icon={Package}
                title="No catalog products assigned"
                description={`No inventory items currently list ${supplier.name} as their preferred supplier.`}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-center">Reorder Point</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium text-foreground">
                          {product.name}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {product.sku}
                        </TableCell>
                        <TableCell className="text-xs">{product.category || "General"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          <MoneyAmount amountPaise={product.unitCostPaise} />
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          <MoneyAmount amountPaise={product.unitPricePaise} />
                        </TableCell>
                        <TableCell className="text-center text-xs font-semibold">
                          {product.reorderPoint} units
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
