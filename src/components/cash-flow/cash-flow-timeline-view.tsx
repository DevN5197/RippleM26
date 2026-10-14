import { useState, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Calendar,
  Building2,
  FileText,
  Truck,
  FlaskConical,
  AlertTriangle,
  ExternalLink,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney, formatDate, formatRelative } from "@/lib/formatters";
import type { CashFlowEvent } from "@/types";

interface CashFlowTimelineViewProps {
  events: CashFlowEvent[];
  safetyThresholdPaise: number;
}

export function CashFlowTimelineView({ events, safetyThresholdPaise }: CashFlowTimelineViewProps) {
  const [filterMode, setFilterMode] = useState<"all" | "incoming" | "outgoing" | "risks">("all");

  const todayIso = new Date().toISOString().slice(0, 10);

  // Filter events
  const filteredEvents = useMemo(() => {
    let list = [...events];
    if (filterMode === "incoming") {
      list = list.filter((e) => e.direction === "incoming");
    } else if (filterMode === "outgoing") {
      list = list.filter((e) => e.direction === "outgoing");
    } else if (filterMode === "risks") {
      list = list.filter((e) => Boolean(e.riskNote) || e.status === "overdue");
    }
    return list.sort((a, b) => a.date.localeCompare(b.date));
  }, [events, filterMode]);

  // Group events by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, CashFlowEvent[]> = {};
    for (const e of filteredEvents) {
      if (!groups[e.date]) {
        groups[e.date] = [];
      }
      groups[e.date].push(e);
    }
    return groups;
  }, [filteredEvents]);

  const dates = Object.keys(groupedByDate).sort();

  return (
    <div className="space-y-4">
      {/* Controls Bar: Filter pills */}
      <div className="flex flex-col gap-3 rounded-lg border bg-card p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-muted-foreground mr-1">Filter events:</span>
          <div className="inline-flex rounded-md bg-muted p-0.5">
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                filterMode === "all"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Events ({events.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("incoming")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                filterMode === "incoming"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Incoming Only
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("outgoing")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                filterMode === "outgoing"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Outgoing Only
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("risks")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
                filterMode === "risks"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Risk Items Only
            </button>
          </div>
        </div>

        <span className="text-xs text-muted-foreground">
          Showing {filteredEvents.length} transactions across {dates.length} scheduled dates
        </span>
      </div>

      {/* Timeline Stream */}
      {dates.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No timeline events match the filter"
          description="Adjust your timeline filter to inspect all planned incoming and outgoing transactions."
          actionLabel="Show all events"
          onAction={() => setFilterMode("all")}
        />
      ) : (
        <div className="space-y-6">
          {dates.map((date) => {
            const dayEvents = groupedByDate[date];
            const isToday = date === todayIso;
            const isPast = date < todayIso;

            const dayInflows = dayEvents
              .filter((e) => e.direction === "incoming")
              .reduce((s, e) => s + e.amountPaise, 0);
            const dayOutflows = dayEvents
              .filter((e) => e.direction === "outgoing")
              .reduce((s, e) => s + e.amountPaise, 0);
            const netFlow = dayInflows - dayOutflows;

            return (
              <div key={date} className="relative pl-6 sm:pl-8 border-l-2 border-border/80">
                {/* Node icon milestone */}
                <div
                  className={`absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 bg-card ${
                    isToday
                      ? "border-primary ring-4 ring-primary/20"
                      : isPast
                        ? "border-muted-foreground/40 bg-muted"
                        : "border-primary/60"
                  }`}
                />

                {/* Date Group Header */}
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">
                      {formatDate(date, "EEEE, d MMMM yyyy")}
                    </span>
                    {isToday ? (
                      <Badge className="bg-primary text-primary-foreground text-[10px] py-0 px-1.5">
                        Today
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        ({formatRelative(date)})
                      </span>
                    )}
                  </div>

                  {/* Day net badge */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Day Net:</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        netFlow >= 0 ? "text-success" : "text-destructive"
                      }`}
                    >
                      {netFlow >= 0 ? "+" : "−"}
                      {formatMoney(Math.abs(netFlow))}
                    </span>
                  </div>
                </div>

                {/* Events Cards Grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {dayEvents.map((event) => (
                    <TimelineEventCard key={event.id} event={event} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TimelineEventCard({ event }: { event: CashFlowEvent }) {
  const isIncoming = event.direction === "incoming";

  return (
    <Card
      className={`shadow-xs transition-shadow hover:shadow-sm ${
        isIncoming
          ? "border-success/30 bg-success/[0.02]"
          : "border-destructive/30 bg-destructive/[0.02]"
      }`}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: Direction, Category, and Amount */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                isIncoming ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
              }`}
            >
              {isIncoming ? (
                <ArrowDownLeft className="h-4 w-4" />
              ) : (
                <ArrowUpRight className="h-4 w-4" />
              )}
            </span>
            <div className="min-w-0">
              <span className="block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {isIncoming ? "Cash Inflow" : "Cash Outflow"} · {event.type.replace(/_/g, " ")}
              </span>
              <span className="block font-semibold text-foreground text-sm truncate">
                {event.label}
              </span>
            </div>
          </div>

          <div
            className={`text-right font-bold tabular-nums text-base shrink-0 ${
              isIncoming ? "text-success" : "text-destructive"
            }`}
          >
            {isIncoming ? "+" : "−"}
            {formatMoney(event.amountPaise)}
          </div>
        </div>

        {/* Counterparty & Status */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground truncate">
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {event.counterpartyName ?? (isIncoming ? "Customer" : "Supplier / Payee")}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {event.status === "completed" ? (
              <Badge
                variant="outline"
                className="gap-1 border-success/30 bg-success/10 text-success text-[10px] py-0 px-1.5"
              >
                <CheckCircle2 className="h-3 w-3" />
                Actual (Paid)
              </Badge>
            ) : event.status === "overdue" ? (
              <Badge variant="destructive" className="gap-1 text-[10px] py-0 px-1.5">
                <AlertCircle className="h-3 w-3" />
                Overdue
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 border-primary/30 bg-primary/10 text-primary text-[10px] py-0 px-1.5"
              >
                <Clock className="h-3 w-3" />
                {event.isProjected ? "Projected" : "Scheduled"}
              </Badge>
            )}
          </div>
        </div>

        {/* Risk Indicators & Simulator Link */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            {event.relatedInvoiceId && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-6 text-[10px] px-2 gap-1 text-primary border-primary/30"
              >
                <Link to="/invoices" target="_blank" rel="noreferrer">
                  <FileText className="h-3 w-3" />
                  <span>{event.relatedInvoiceId.toUpperCase()}</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              </Button>
            )}

            {event.relatedPurchaseOrderId && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="h-6 text-[10px] px-2 gap-1 text-primary border-primary/30"
              >
                <Link to="/suppliers" target="_blank" rel="noreferrer">
                  <Truck className="h-3 w-3" />
                  <span>{event.relatedPurchaseOrderId.toUpperCase()}</span>
                  <ExternalLink className="h-2.5 w-2.5" />
                </Link>
              </Button>
            )}

            {event.riskNote && (
              <span className="flex items-center gap-1 rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-medium text-destructive">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{event.riskNote}</span>
              </span>
            )}
          </div>

          {/* Action: Simulate in Ripple Simulator */}
          <Button
            size="sm"
            variant="ghost"
            asChild
            className="h-6 text-[11px] px-2 font-medium text-primary hover:text-primary hover:bg-primary/10 gap-1 ml-auto"
          >
            <Link
              to="/simulator"
              target="_blank"
              rel="noreferrer"
              search={{
                eventId: event.id,
                eventName: event.label,
              }}
            >
              <FlaskConical className="h-3 w-3" />
              <span>Simulate</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
