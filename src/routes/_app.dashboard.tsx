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
        description={`${summary.businessName || "Rupi Clothing"} · What matters today and what to do next`}
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

      {/* ── LEVEL 1: WHAT MATTERS NOW (Compact & focused answers to the 4 core questions) ── */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Question 1: How much usable cash do I have? */}
        <Card className="shadow-xs border-primary/20 bg-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Available Cash
              </span>
              <Badge
                variant="outline"
                className={
                  summary.cashOnHandPaise >= 5_000_000
                    ? "bg-success/10 text-success border-success/30 font-medium text-xs"
                    : "bg-warning/15 text-warning-foreground border-warning/30 font-medium text-xs"
                }
              >
                {summary.cashOnHandPaise >= 5_000_000 ? "Healthy Reserve" : "Near Minimum Reserve"}
              </Badge>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
                {formatMoney(summary.cashOnHandPaise)}
              </span>
              <span className="text-xs text-muted-foreground">cash on hand</span>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-2.5 text-xs">
              <div>
                <span className="text-muted-foreground">Incoming Receivables:</span>
                <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums">
                  +{formatMoney(summary.receivablesPaise)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {summary.openInvoiceCount} open invoices
                </p>
              </div>
              <div>
                <span className="text-muted-foreground">Committed Payables:</span>
                <p className="font-semibold text-destructive mt-0.5 tabular-nums">
                  -{formatMoney(summary.payablesPaise)}
                </p>
                <p className="text-[10px] text-muted-foreground">Scheduled supplier bills</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions 2, 3, 4: What could go wrong? Who causes it? What should I do? */}
        <Card
          className={cn(
            "shadow-xs transition-all",
            hasRisk
              ? "border-amber-500/40 bg-amber-500/5 ring-1 ring-amber-500/20"
              : "border-success/30 bg-success/5",
          )}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Primary Cash Risk & Action
              </span>
              <Badge
                className={
                  hasRisk
                    ? "bg-amber-600 text-white text-[10px] uppercase font-bold"
                    : "bg-success text-white text-[10px]"
                }
              >
                {hasRisk ? "Action Needed" : "All Clear"}
              </Badge>
            </div>
            <CardTitle className="text-base font-semibold mt-1 text-foreground leading-snug">
              {primaryRiskTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {primaryRiskDescription}
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Button size="sm" asChild className="gap-1.5 font-medium shadow-xs h-8 text-xs">
                <Link to="/simulator">
                  {hasRisk ? "Explore payment options" : "Run what-if scenario"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="text-xs h-8">
                <Link to="/cash-flow">View 30-day forecast</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── LEVEL 2: WHAT IS HAPPENING (Timeline & Upcoming Transactions) ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Left: 30-day projected cash balance */}
        <Card className="shadow-xs lg:col-span-2">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Projected Cash Balance</CardTitle>
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

        {/* Right: Key upcoming transactions */}
        <Card className="shadow-xs lg:col-span-1 flex flex-col">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Upcoming Transactions</CardTitle>
              <CardDescription className="text-xs">
                Next key receipts and disbursements
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
              <ul className="divide-y text-xs">
                {summary.upcomingEvents.slice(0, 5).map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between gap-3 py-2.5 first:pt-1"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">{event.label}</p>
                      <DateLabel iso={event.date} className="text-[11px] text-muted-foreground" />
                    </div>
                    <MoneyAmount
                      paise={
                        event.direction === "incoming" ? event.amountPaise : -event.amountPaise
                      }
                      signed
                      className="shrink-0 font-medium tabular-nums text-xs"
                    />
                  </li>
                ))}
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
