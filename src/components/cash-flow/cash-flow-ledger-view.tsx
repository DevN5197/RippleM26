import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ChevronDown,
  ChevronRight,
  Search,
  ArrowUpDown,
  Filter,
  ExternalLink,
  FlaskConical,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  Truck,
  RotateCcw,
  AlertTriangle,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney, formatDate } from "@/lib/formatters";
import type { DailyLedgerEntry, CashFlowEvent, CashFlowEventType } from "@/types";

interface CashFlowLedgerViewProps {
  ledger: DailyLedgerEntry[];
  safetyThresholdPaise: number;
}

export function CashFlowLedgerView({ ledger, safetyThresholdPaise }: CashFlowLedgerViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  const todayIso = new Date().toISOString().slice(0, 10);

  const toggleExpand = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) {
        next.delete(date);
      } else {
        next.add(date);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedDates(new Set(ledger.map((e) => e.date)));
  };

  const collapseAll = () => {
    setExpandedDates(new Set());
  };

  // Filter and sort ledger entries
  const filteredLedger = useMemo(() => {
    let result = [...ledger];

    // Search query filter (matches date, event label, counterparty, invoice ID, PO ID)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((entry) => {
        if (entry.date.toLowerCase().includes(q)) return true;
        return entry.events.some(
          (e) =>
            e.label.toLowerCase().includes(q) ||
            e.counterpartyName?.toLowerCase().includes(q) ||
            e.relatedInvoiceId?.toLowerCase().includes(q) ||
            e.relatedPurchaseOrderId?.toLowerCase().includes(q) ||
            e.type.toLowerCase().includes(q),
        );
      });
    }

    // Status filter
    if (statusFilter === "deficit") {
      result = result.filter((entry) => entry.closingBalancePaise < 0);
    } else if (statusFilter === "warning") {
      result = result.filter(
        (entry) =>
          entry.closingBalancePaise < safetyThresholdPaise && entry.closingBalancePaise >= 0,
      );
    } else if (statusFilter === "breach_or_deficit") {
      result = result.filter((entry) => entry.closingBalancePaise < safetyThresholdPaise);
    } else if (statusFilter === "has_activity") {
      result = result.filter((entry) => entry.events.length > 0);
    }

    // Event type filter
    if (eventTypeFilter !== "all") {
      result = result.filter((entry) => entry.events.some((e) => e.type === eventTypeFilter));
    }

    // Sorting by date
    result.sort((a, b) => {
      const cmp = a.date.localeCompare(b.date);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [ledger, searchQuery, statusFilter, eventTypeFilter, sortDir, safetyThresholdPaise]);

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setEventTypeFilter("all");
    setSortDir("asc");
  };

  const hasActiveFilters =
    searchQuery !== "" || statusFilter !== "all" || eventTypeFilter !== "all";

  return (
    <div className="space-y-4">
      {/* Controls Bar: Search, Filters, Sort, Expand/Collapse */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search events, counterparties, invoices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs w-[170px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Days</SelectItem>
              <SelectItem value="breach_or_deficit">Below Buffer or Deficit</SelectItem>
              <SelectItem value="deficit">Deficit Only (&lt; ₹0)</SelectItem>
              <SelectItem value="warning">Below Buffer Only</SelectItem>
              <SelectItem value="has_activity">Days With Transactions</SelectItem>
            </SelectContent>
          </Select>

          {/* Event type filter */}
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="h-8 text-xs w-[170px]">
              <SelectValue placeholder="Event type" />
            </SelectTrigger>
            <SelectContent className="text-xs">
              <SelectItem value="all">All Event Types</SelectItem>
              <SelectItem value="customer_payment">Customer Payments</SelectItem>
              <SelectItem value="supplier_payment">Supplier Payments</SelectItem>
              <SelectItem value="rent">Rent</SelectItem>
              <SelectItem value="payroll">Payroll</SelectItem>
              <SelectItem value="tax">Taxes / GST</SelectItem>
              <SelectItem value="other">Other Inflows/Outflows</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Right side actions: Sort, Expand/Collapse, Reset */}
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
            className="h-8 gap-1 text-xs"
          >
            <ArrowUpDown className="h-3 w-3" />
            <span>{sortDir === "asc" ? "Date: Earliest" : "Date: Latest"}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={expandedDates.size > 0 ? collapseAll : expandAll}
            className="h-8 text-xs"
          >
            {expandedDates.size > 0 ? "Collapse all" : "Expand all"}
          </Button>
        </div>
      </div>

      {/* Daily Ledger Table */}
      {filteredLedger.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No ledger days match your criteria"
          description="Try broadening your search term or resetting the status and event type filters."
          actionLabel="Clear all filters"
          onAction={clearFilters}
        />
      ) : (
        <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 text-xs">
                  <TableHead className="w-10 px-2"></TableHead>
                  <TableHead className="min-w-[120px]">Date</TableHead>
                  <TableHead className="text-right min-w-[110px]">Opening Cash</TableHead>
                  <TableHead className="text-right min-w-[120px] text-success">
                    Expected Inflows
                  </TableHead>
                  <TableHead className="text-right min-w-[100px] text-success">
                    Other Inflows
                  </TableHead>
                  <TableHead className="text-right min-w-[120px] text-destructive">
                    Supplier Payments
                  </TableHead>
                  <TableHead className="text-right min-w-[110px] text-destructive">
                    Operating Exp.
                  </TableHead>
                  <TableHead className="text-right min-w-[110px] text-destructive">
                    Other Outflows
                  </TableHead>
                  <TableHead className="text-right min-w-[120px] font-bold">Closing Cash</TableHead>
                  <TableHead className="text-center min-w-[110px]">Status</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredLedger.map((entry) => {
                  const isExpanded = expandedDates.has(entry.date);
                  const isToday = entry.date === todayIso;
                  const hasEvents = entry.events.length > 0;
                  const isShortfall = entry.closingBalancePaise < 0;
                  const isBelowThreshold =
                    entry.closingBalancePaise < safetyThresholdPaise && !isShortfall;

                  return (
                    <DailyLedgerRow
                      key={entry.date}
                      entry={entry}
                      isExpanded={isExpanded}
                      isToday={isToday}
                      hasEvents={hasEvents}
                      isShortfall={isShortfall}
                      isBelowThreshold={isBelowThreshold}
                      onToggleExpand={() => toggleExpand(entry.date)}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}

interface DailyLedgerRowProps {
  entry: DailyLedgerEntry;
  isExpanded: boolean;
  isToday: boolean;
  hasEvents: boolean;
  isShortfall: boolean;
  isBelowThreshold: boolean;
  onToggleExpand: () => void;
}

function DailyLedgerRow({
  entry,
  isExpanded,
  isToday,
  hasEvents,
  isShortfall,
  isBelowThreshold,
  onToggleExpand,
}: DailyLedgerRowProps) {
  return (
    <>
      <TableRow
        className={`text-xs transition-colors cursor-pointer hover:bg-muted/40 ${
          isShortfall
            ? "bg-destructive/5 hover:bg-destructive/10"
            : isBelowThreshold
              ? "bg-warning/5 hover:bg-warning/10"
              : isToday
                ? "bg-primary/5 font-medium"
                : ""
        }`}
        onClick={onToggleExpand}
      >
        {/* Expand toggle */}
        <TableCell className="w-10 px-2 py-2.5 text-center">
          <button
            type="button"
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
            aria-label={isExpanded ? "Collapse day" : "Expand day"}
          >
            {isExpanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </button>
        </TableCell>

        {/* Date */}
        <TableCell className="font-medium whitespace-nowrap py-2.5">
          <div className="flex items-center gap-1.5">
            <span>{formatDate(entry.date, "d MMM yyyy")}</span>
            {isToday && (
              <Badge
                variant="outline"
                className="border-primary/30 bg-primary/10 text-primary text-[10px] py-0 px-1"
              >
                Today
              </Badge>
            )}
            {hasEvents && (
              <span className="text-[10px] text-muted-foreground">({entry.events.length})</span>
            )}
          </div>
        </TableCell>

        {/* Opening cash */}
        <TableCell className="text-right tabular-nums text-muted-foreground py-2.5">
          {formatMoney(entry.openingBalancePaise)}
        </TableCell>

        {/* Expected incoming payments */}
        <TableCell className="text-right tabular-nums py-2.5">
          {entry.expectedIncomingPaise > 0 ? (
            <span className="text-success font-medium">
              +{formatMoney(entry.expectedIncomingPaise)}
            </span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </TableCell>

        {/* Other cash inflows */}
        <TableCell className="text-right tabular-nums py-2.5">
          {entry.otherInflowsPaise > 0 ? (
            <span className="text-success">+{formatMoney(entry.otherInflowsPaise)}</span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </TableCell>

        {/* Supplier payments */}
        <TableCell className="text-right tabular-nums py-2.5">
          {entry.supplierPaymentsPaise > 0 ? (
            <span className="text-destructive font-medium">
              −{formatMoney(entry.supplierPaymentsPaise)}
            </span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </TableCell>

        {/* Operating expenses */}
        <TableCell className="text-right tabular-nums py-2.5">
          {entry.operatingExpensesPaise > 0 ? (
            <span className="text-destructive">−{formatMoney(entry.operatingExpensesPaise)}</span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </TableCell>

        {/* Other outgoing payments */}
        <TableCell className="text-right tabular-nums py-2.5">
          {entry.otherOutflowsPaise > 0 ? (
            <span className="text-destructive">−{formatMoney(entry.otherOutflowsPaise)}</span>
          ) : (
            <span className="text-muted-foreground/60">—</span>
          )}
        </TableCell>

        {/* Closing cash */}
        <TableCell className="text-right tabular-nums py-2.5 font-bold">
          <span
            className={
              isShortfall
                ? "text-destructive"
                : isBelowThreshold
                  ? "text-warning-foreground"
                  : "text-foreground"
            }
          >
            {entry.closingBalancePaise < 0 ? "−" : ""}
            {formatMoney(Math.abs(entry.closingBalancePaise))}
          </span>
        </TableCell>

        {/* Status */}
        <TableCell className="text-center py-2.5">
          {isShortfall ? (
            <Badge variant="destructive" className="text-[10px] py-0 px-2 font-medium">
              Deficit
            </Badge>
          ) : isBelowThreshold ? (
            <Badge
              variant="outline"
              className="border-warning/40 bg-warning/15 text-warning-foreground text-[10px] py-0 px-2 font-medium"
            >
              Below Buffer
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-success/30 bg-success/10 text-success text-[10px] py-0 px-2 font-medium"
            >
              Healthy
            </Badge>
          )}
        </TableCell>
      </TableRow>

      {/* Expanded Underlying Events Row */}
      {isExpanded && (
        <TableRow className="bg-muted/20 hover:bg-muted/20">
          <TableCell colSpan={10} className="p-3 pl-10 pr-6">
            <div className="rounded-lg border bg-card p-3 shadow-2xs space-y-2">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-semibold text-foreground">
                  Transactions & Obligations for {formatDate(entry.date, "EEEE, d MMMM yyyy")}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  Day net:{" "}
                  <span
                    className={`font-semibold ${
                      entry.netMovementPaise >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {entry.netMovementPaise >= 0 ? "+" : "−"}
                    {formatMoney(Math.abs(entry.netMovementPaise))}
                  </span>
                </span>
              </div>

              {entry.events.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2 italic">
                  No discrete transactions scheduled for this date. Opening balance carried forward.
                </p>
              ) : (
                <div className="divide-y">
                  {entry.events.map((event) => (
                    <DailyEventItem key={event.id} event={event} />
                  ))}
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function DailyEventItem({ event }: { event: CashFlowEvent }) {
  const isIncoming = event.direction === "incoming";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 text-xs">
      <div className="flex items-start gap-2.5 min-w-0">
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
            isIncoming ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          }`}
        >
          {isIncoming ? (
            <ArrowDownLeft className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5" />
          )}
        </span>

        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-foreground truncate">{event.label}</span>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 capitalize">
              {event.type.replace(/_/g, " ")}
            </Badge>
            {event.status && (
              <Badge
                variant="outline"
                className={`text-[10px] py-0 px-1.5 ${
                  event.status === "completed"
                    ? "text-success border-success/30"
                    : event.status === "overdue"
                      ? "text-destructive border-destructive/30"
                      : "text-muted-foreground"
                }`}
              >
                {event.status}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-[11px]">
            {event.counterpartyName && <span>Party: {event.counterpartyName}</span>}
            {event.riskNote && (
              <span className="flex items-center gap-1 text-destructive font-medium">
                <AlertTriangle className="h-3 w-3" />
                {event.riskNote}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Amount and Linked Source Records */}
      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
        <span
          className={`font-bold tabular-nums text-sm ${
            isIncoming ? "text-success" : "text-destructive"
          }`}
        >
          {isIncoming ? "+" : "−"}
          {formatMoney(event.amountPaise)}
        </span>

        {/* Source Record Links */}
        <div className="flex items-center gap-1">
          {event.relatedInvoiceId && (
            <Button variant="outline" size="sm" asChild className="h-6 text-[10px] px-2 gap-1">
              <Link to="/invoices">
                <FileText className="h-3 w-3 text-primary" />
                <span>{event.relatedInvoiceId.toUpperCase()}</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </Button>
          )}

          {event.relatedPurchaseOrderId && (
            <Button variant="outline" size="sm" asChild className="h-6 text-[10px] px-2 gap-1">
              <Link to="/suppliers">
                <Truck className="h-3 w-3 text-primary" />
                <span>{event.relatedPurchaseOrderId.toUpperCase()}</span>
                <ExternalLink className="h-2.5 w-2.5" />
              </Link>
            </Button>
          )}

          {/* Quick link to Ripple Simulator */}
          <Button variant="ghost" size="sm" asChild className="h-6 text-[10px] px-1.5 text-primary">
            <Link
              to="/simulator"
              search={{
                eventId: event.id,
                eventName: event.label,
              }}
              title="Simulate delay/advance in Ripple Simulator"
            >
              <FlaskConical className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
