import React, { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Wallet,
  ArrowDownToLine,
  ArrowUpFromLine,
  PackageSearch,
  Plus,
  ArrowRight,
  FileText,
  Package,
  Users,
  Truck,
  CheckCircle2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { dashboardApi, type DashboardSummary } from "@/lib/api/dashboardApi";
import { invoiceApi } from "@/lib/api/invoiceApi";
import { customerApi } from "@/lib/api/customerApi";
import { supplierApi } from "@/lib/api/supplierApi";
import { InvoiceDialog } from "@/components/invoices/invoice-dialog";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { MetricCard } from "@/components/shared/metric-card";
import { MoneyAmount } from "@/components/shared/money-amount";
import { DateLabel } from "@/components/shared/date-label";
import { RiskIndicator } from "@/components/shared/risk-indicator";
import { CashFlowChart } from "@/components/charts/cash-flow-chart";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatMoney } from "@/lib/formatters";
import { toast } from "sonner";
import type { CreateInvoiceInput } from "@/types";

const summaryQuery = queryOptions({
  queryKey: ["dashboard", "summary"],
  queryFn: () => dashboardApi.getSummary(),
  staleTime: 10_000,
});

export const Route = createFileRoute("/_app/dashboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(summaryQuery),
  head: () => ({
    meta: [
      { title: "Overview — Ripple" },
      {
        name: "description",
        content:
          "Cash position, receivables, payables and risk alerts — see the impact before it happens.",
      },
      { property: "og:title", content: "Overview — Ripple" },
      {
        property: "og:description",
        content: "Cash-flow intelligence and dependency tracking for small businesses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DashboardPage,
  errorComponent: ({ error, reset }) => (
    <ErrorState
      title="Could not load overview"
      message={error instanceof Error ? error.message : "Failed to load dashboard data."}
      onRetry={reset}
    />
  ),
});

function DashboardPage() {
  const queryClient = useQueryClient();
  const { data } = useSuspenseQuery(summaryQuery);
  const summary: DashboardSummary = data;

  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceDialogType, setInvoiceDialogType] = useState<"receivable" | "payable">("receivable");

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "list-quick"],
    queryFn: () => customerApi.list({ pageSize: 100 }).then((r) => r.data).catch(() => []),
    enabled: invoiceDialogOpen,
    staleTime: 60_000,
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ["suppliers", "list-quick"],
    queryFn: () => supplierApi.list({ pageSize: 100 }).then((r) => r.data).catch(() => []),
    enabled: invoiceDialogOpen,
    staleTime: 60_000,
  });

  const handleCreateInvoice = async (payload: CreateInvoiceInput) => {
    try {
      await invoiceApi.create(payload);
      toast.success(
        payload.type === "receivable"
          ? "Customer invoice created successfully!"
          : "Supplier bill recorded successfully!"
      );
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["cash-flow"] });
      setInvoiceDialogOpen(false);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice record.");
    }
  };

  const minPoint =
    summary.forecast.length > 0
      ? summary.forecast.reduce((a, b) =>
          a.projectedBalancePaise <= b.projectedBalancePaise ? a : b,
        )
      : {
          date: new Date().toISOString().slice(0, 10),
          projectedBalancePaise: summary.cashOnHandPaise,
          inflowsPaise: 0,
          outflowsPaise: 0,
          isShortfall: summary.cashOnHandPaise < 0,
        };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Overview"
        description={`${summary.businessName || "Business"} · 30-day cash forecast`}
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" aria-hidden />
                New record
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Create New Record</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  setInvoiceDialogType("receivable");
                  setInvoiceDialogOpen(true);
                }}
              >
                <FileText className="mr-2 h-4 w-4 text-emerald-600" />
                <span>Customer Invoice</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => {
                  setInvoiceDialogType("payable");
                  setInvoiceDialogOpen(true);
                }}
              >
                <FileText className="mr-2 h-4 w-4 text-amber-600" />
                <span>Supplier Bill</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/inventory">
                  <Package className="mr-2 h-4 w-4 text-primary" />
                  <span>Purchase Order</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/customers">
                  <Users className="mr-2 h-4 w-4 text-blue-600" />
                  <span>Add Customer</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/suppliers">
                  <Truck className="mr-2 h-4 w-4 text-violet-600" />
                  <span>Add Supplier</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Cash on hand"
          value={formatMoney(summary.cashOnHandPaise)}
          icon={Wallet}
          trend={{
            direction: minPoint.isShortfall ? "down" : "flat",
            label: minPoint.isShortfall
              ? `Dips below zero around ${formatMoney(minPoint.projectedBalancePaise)}`
              : "Stays positive for 30 days",
            sentiment: minPoint.isShortfall ? "bad" : "good",
          }}
        />
        <MetricCard
          label="Receivables"
          value={formatMoney(summary.receivablesPaise)}
          icon={ArrowDownToLine}
          hint={`${summary.openInvoiceCount} open invoices · ${formatMoney(summary.overdueReceivablesPaise)} overdue`}
        />
        <MetricCard
          label="Payables"
          value={formatMoney(summary.payablesPaise)}
          icon={ArrowUpFromLine}
          hint="Scheduled supplier payments"
        />
        <MetricCard
          label="Low-stock items"
          value={String(summary.lowStockCount)}
          icon={PackageSearch}
          trend={
            summary.lowStockCount > 0
              ? { direction: "down", label: "Below reorder point", sentiment: "bad" }
              : { direction: "flat", label: "All healthy", sentiment: "good" }
          }
        />
      </div>

      <Card className="shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Projected cash balance</CardTitle>
              <CardDescription>Next 30 days, including scheduled payments</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/cash-flow">
                Details <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <CashFlowChart data={summary.forecast} />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="shadow-xs">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Risk alerts</CardTitle>
            <CardDescription>What needs attention right now</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.alerts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="h-6 w-6 text-emerald-500 mb-1.5" />
                <span className="font-medium text-foreground">No active risk alerts</span>
                <span>All cash buffers and counterparty scores are healthy.</span>
              </div>
            ) : (
              summary.alerts.map((alert) => (
                <div key={alert.id} className="rounded-md border bg-background p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-foreground">{alert.title}</span>
                    <RiskIndicator severity={alert.severity} />
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {alert.description}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Upcoming cash events</CardTitle>
              <CardDescription>Next scheduled inflows and outflows</CardDescription>
            </CardHeader>
            <CardContent>
              {summary.upcomingEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground">
                  <Calendar className="h-6 w-6 text-muted-foreground mb-1.5" />
                  <span className="font-medium text-foreground">No upcoming cash events</span>
                  <span>Scheduled receipts and disbursements will appear here.</span>
                </div>
              ) : (
                <ul className="divide-y">
                  {summary.upcomingEvents.map((event) => (
                    <li key={event.id} className="flex items-center justify-between gap-3 py-2.5">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{event.label}</p>
                        <DateLabel iso={event.date} className="text-xs text-muted-foreground" />
                      </div>
                      <MoneyAmount
                        paise={
                          event.direction === "incoming" ? event.amountPaise : -event.amountPaise
                        }
                        signed
                        className="shrink-0 text-sm font-medium"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recommended actions</CardTitle>
              <CardDescription>Ranked by impact on your cash position</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary.recommendations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 text-center text-xs text-muted-foreground">
                  <Sparkles className="h-6 w-6 text-muted-foreground mb-1.5" />
                  <span className="font-medium text-foreground">No pending recommendations</span>
                  <span>Your cash-flow coordination is currently optimized.</span>
                </div>
              ) : (
                summary.recommendations.map((rec) => (
                  <div key={rec.id} className="rounded-md border bg-background p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{rec.title}</span>
                      <Badge
                        variant="outline"
                        className={
                          rec.priority === "high"
                            ? "border-transparent bg-destructive/10 text-destructive"
                            : rec.priority === "medium"
                              ? "border-transparent bg-warning/15 text-warning-foreground"
                              : "border-transparent bg-muted text-muted-foreground"
                        }
                      >
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {rec.rationale}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Action Modal for Invoices & Bills */}
      <InvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={setInvoiceDialogOpen}
        customers={customers}
        suppliers={suppliers}
        initialType={invoiceDialogType}
        onSubmit={handleCreateInvoice}
      />
    </div>
  );
}
