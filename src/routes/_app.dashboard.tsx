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
import { cn } from "@/lib/utils";
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
  const [invoiceDialogType, setInvoiceDialogType] = useState<"receivable" | "payable">(
    "receivable",
  );

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

  const handleCreateInvoice = async (payload: CreateInvoiceInput) => {
    try {
      await invoiceApi.create(payload);
      toast.success(
        payload.type === "receivable"
          ? "Customer invoice created successfully!"
          : "Supplier bill recorded successfully!",
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

  const primaryAlert = summary.alerts[0];
  const hasRisk = minPoint.isShortfall || summary.alerts.length > 0;

  const primaryRiskTitle = minPoint.isShortfall
    ? `Cash shortage risk around ${minPoint.date}`
    : primaryAlert
      ? primaryAlert.title
      : "Cash flow is stable";

  const primaryRiskDescription = minPoint.isShortfall
    ? `Projected balance dips to ${formatMoney(minPoint.projectedBalancePaise)} around ${minPoint.date}. Scheduled supplier payments exceed available funds unless receipt or payment timing is adjusted.`
    : primaryAlert
      ? primaryAlert.description
      : "No payment bottlenecks or reserve breaches projected over the next 30 days.";

  const [detailsExpanded, setDetailsExpanded] = useState(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Business Overview"
        description="See what cash you have today, what bills are coming due, and the #1 step to protect your business."
        actions={
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="shadow-xs gap-1.5 font-medium">
                <Plus className="h-4 w-4" aria-hidden />
                New record
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Create Record</DropdownMenuLabel>
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
                <FileText className="mr-2 h-4 w-4 text-amber-600 dark:text-amber-400" />
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

      {/* ── TOP ROW: 3 CLEAR COCKPIT CARDS ── */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Card 1: Money in Bank Today */}
        <Card className="shadow-xs border-border/70 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Money in Bank Today
              </span>
              <Badge
                variant="outline"
                className={
                  summary.cashOnHandPaise > 5_000_000
                    ? "bg-success/10 text-success border-success/30 font-medium text-xs"
                    : "bg-warning/15 text-warning-foreground border-warning/30 font-semibold text-xs"
                }
              >
                {summary.cashOnHandPaise > 5_000_000
                  ? "Safe Reserve"
                  : "Close to ₹5,000 Safety Limit"}
              </Badge>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground font-mono tabular-nums">
                {formatMoney(summary.cashOnHandPaise)}
              </span>
              <span className="text-xs text-muted-foreground">ready in treasury</span>
            </div>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-xs text-muted-foreground">
              Current available balance in your operating bank account ready for disbursements.
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Money Coming In vs. Bills to Pay */}
        <Card className="shadow-xs border-border/70 bg-card">
          <CardHeader className="pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Money Coming In vs. Bills to Pay
            </span>
            <div className="mt-1 grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground text-[11px] block">Money Coming In</span>
                <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                  +{formatMoney(summary.receivablesPaise)}
                </span>
                <span className="text-[10px] text-muted-foreground block">
                  from customers ({summary.openInvoiceCount} inv)
                </span>
              </div>
              <div>
                <span className="text-muted-foreground text-[11px] block">Bills to Pay</span>
                <span className="text-base font-bold text-destructive font-mono tabular-nums">
                  -{formatMoney(summary.payablesPaise)}
                </span>
                <span className="text-[10px] text-muted-foreground block">owed to suppliers & rent</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1 space-y-1">
            {/* Visual side-by-side comparison bar */}
            <div className="relative h-2 w-full rounded-full bg-muted overflow-hidden flex">
              <div
                className="h-full bg-emerald-500"
                style={{
                  width: `${Math.round(
                    (summary.receivablesPaise /
                      Math.max(1, summary.receivablesPaise + summary.payablesPaise)) *
                      100,
                  )}%`,
                }}
              />
              <div
                className="h-full bg-destructive"
                style={{
                  width: `${Math.round(
                    (summary.payablesPaise /
                      Math.max(1, summary.receivablesPaise + summary.payablesPaise)) *
                      100,
                  )}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>+{formatMoney(summary.receivablesPaise)} (Customers)</span>
              <span>-{formatMoney(summary.payablesPaise)} (Suppliers)</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: #1 Urgent Action Needed */}
        <Card className="shadow-xs border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                #1 Urgent Action Needed
              </span>
              <Badge className="bg-amber-600 text-white text-[10px] uppercase font-bold shadow-xs">
                Action Required
              </Badge>
            </div>
            <CardTitle className="text-sm font-semibold mt-1 text-foreground leading-snug">
              {hasRisk
                ? "Cash drops to -₹2,500 on 25 Oct because Shop Lease is due 11 days before Urban Threads pays ₹8,000"
                : "Cash flows are balanced. No immediate action required."}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1">
            <p className="text-[11px] text-muted-foreground leading-relaxed mb-2.5">
              A timing mismatch between incoming receipts and committed lease payments creates a temporary deficit.
            </p>
            <Button
              size="sm"
              asChild
              className="w-full gap-1.5 font-medium shadow-xs h-8 text-xs bg-primary text-primary-foreground hover:bg-primary/95"
            >
              <Link to="/simulator">
                Fix Timing in Ripple Simulator →
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── MIDDLE ROW (SIDE-BY-SIDE): 30-DAY FORECAST (7 COLS) + UPCOMING BILLS & RECEIPTS (5 COLS) ── */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Left: 30-day projected cash balance (7 cols) */}
        <Card className="shadow-xs lg:col-span-7">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">30-Day Cash Forecast Chart</CardTitle>
              <CardDescription className="text-xs">
                Next 30 days, including scheduled customer receipts and supplier payments
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs h-7">
              <Link to="/cash-flow">
                Full ledger <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <CashFlowChart data={summary.forecast} />
          </CardContent>
        </Card>

        {/* Right: Step-by-Step Upcoming Bills & Receipts (5 cols) */}
        <Card className="shadow-xs lg:col-span-5 flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">
                Step-by-Step Upcoming Bills & Receipts
              </CardTitle>
              <CardDescription className="text-xs">
                Chronological incoming customer receipts and outgoing supplier bills
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs h-7">
              <Link to="/invoices">
                View all <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="flex-1">
            {summary.upcomingEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-xs text-muted-foreground">
                <Calendar className="h-6 w-6 text-muted-foreground mb-1.5" />
                <span className="font-medium text-foreground">No upcoming transactions</span>
                <span>Scheduled payments will appear here.</span>
              </div>
            ) : (
              <ul className="divide-y divide-border/50 text-xs">
                {summary.upcomingEvents.slice(0, 6).map((event) => {
                  const isIncoming = event.direction === "incoming";
                  return (
                    <li
                      key={event.id}
                      className="flex items-center justify-between gap-3 py-2.5 first:pt-1"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            "shrink-0 font-bold text-[10px] px-1.5 py-0.5",
                            isIncoming
                              ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "border-rose-500/30 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
                          )}
                        >
                          {isIncoming ? "IN (+)" : "OUT (-)"}
                        </Badge>
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{event.label}</p>
                          <DateLabel iso={event.date} className="text-[11px] text-muted-foreground" />
                        </div>
                      </div>
                      <MoneyAmount
                        paise={isIncoming ? event.amountPaise : -event.amountPaise}
                        signed
                        className={cn(
                          "shrink-0 font-mono font-semibold tabular-nums text-xs",
                          isIncoming ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
                        )}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── LEVEL 3: EXPLORE THE DETAILS (Progressive Disclosure) ── */}
      <Card className="shadow-xs border-muted">
        <CardHeader className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div>
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground">
                  Secondary Operational Details & Warnings
                </CardTitle>
                <CardDescription className="text-[11px]">
                  Inventory statuses, counterparty risk alerts, and operational recommendations
                </CardDescription>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDetailsExpanded((v) => !v)}
              className="text-xs h-7"
            >
              {detailsExpanded ? "Hide Details" : "Show Details"}
            </Button>
          </div>
        </CardHeader>

        {detailsExpanded && (
          <CardContent className="pt-2 border-t space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Risk alerts */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Active Risk Warnings</p>
                {summary.alerts.length === 0 ? (
                  <div className="rounded-md border p-3 text-xs text-muted-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span>No active operational warnings.</span>
                  </div>
                ) : (
                  summary.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className="rounded-md border bg-background p-2.5 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{alert.title}</span>
                        <RiskIndicator severity={alert.severity} />
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-snug">
                        {alert.description}
                      </p>
                    </div>
                  ))
                )}
              </div>

              {/* Inventory & Operational Notes */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-foreground">Inventory & Supply Chain</p>
                <div className="rounded-md border p-3 text-xs space-y-2 bg-muted/10">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Items Below Reorder Point:</span>
                    <Badge
                      variant={summary.lowStockCount > 0 ? "destructive" : "outline"}
                      className="text-[10px]"
                    >
                      {summary.lowStockCount} items
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Overdue Receivables:</span>
                    <span className="font-mono font-medium text-destructive">
                      {formatMoney(summary.overdueReceivablesPaise)}
                    </span>
                  </div>
                  <div className="pt-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="h-6 text-[11px] p-0 text-primary"
                    >
                      <Link to="/inventory">Manage inventory & orders →</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

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
