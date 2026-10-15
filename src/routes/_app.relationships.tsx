import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { isUserAuthenticated } from "@/lib/api/authApi";
import {
  Network,
  Share2,
  AlertTriangle,
  FlaskConical,
  Layers,
  ArrowRight,
  TrendingDown,
} from "lucide-react";
import { relationshipsApi } from "@/lib/api/relationshipsApi";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { MetricCard } from "@/components/shared/metric-card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/formatters";
import { RelationshipGraphView } from "@/components/relationships/relationship-graph-view";
import type { RelationshipGraphData } from "@/types";

const relationshipsQuery = queryOptions({
  queryKey: ["relationships", "graph"],
  queryFn: () => relationshipsApi.getGraph(),
});

interface RelationshipsSearchParams {
  selectedId?: string | undefined;
}

export const Route = createFileRoute("/_app/relationships")({
  beforeLoad: ({ location }) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token || !isUserAuthenticated()) {
        throw redirect({
          to: "/login",
          search: { redirect: location.href },
        });
      }
    }
  },
  validateSearch: (search: Record<string, unknown>): RelationshipsSearchParams => ({
    selectedId: typeof search["selectedId"] === "string" ? search["selectedId"] : undefined,
  }),
  loader: async ({ context, location }) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token || !isUserAuthenticated()) {
        throw redirect({
          to: "/login",
          search: { redirect: location.href },
        });
      }
    }
    try {
      return await context.queryClient.ensureQueryData(relationshipsQuery);
    } catch {
      throw redirect({
        to: "/login",
        search: { redirect: location.href },
      });
    }
  },
  head: () => ({
    meta: [
      { title: "Relationships — Ripple" },
      {
        name: "description",
        content: "See how suppliers, inventory, sales, invoices, and payments are connected.",
      },
      { property: "og:title", content: "Relationships — Ripple" },
      {
        property: "og:description",
        content: "Interactive dependency graph and cash-flow intelligence for small businesses.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RelationshipsPage,
  errorComponent: ({ error, reset }) => (
    <ErrorState
      title="Could not load relationships"
      message={error instanceof Error ? error.message : "Failed to load relationship graph."}
      onRetry={reset}
    />
  ),
});

function RelationshipsPage() {
  const { data } = useSuspenseQuery(relationshipsQuery);
  const search = Route.useSearch();
  const graph: RelationshipGraphData = data;

  const totalTouchpoints = graph.summary.totalNodes;
  const totalDependencies = graph.summary.totalEdges;
  const atRiskCount = graph.summary.atRiskCount;
  const cashAtRiskPaise = graph.summary.totalCashAtRiskPaise;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Relationships"
        description="See how suppliers, inventory, sales, invoices, and payments are connected."
        actions={
          <div className="flex items-center gap-2">
            <Button size="sm" asChild className="gap-1.5 shadow-xs">
              <Link to="/simulator">
                <FlaskConical className="h-4 w-4" />
                <span>Simulate a Delay</span>
              </Link>
            </Button>
          </div>
        }
      />

      {/* High-level Metric Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Operating Touchpoints"
          value={String(totalTouchpoints)}
          icon={Layers}
          hint="Suppliers, orders, inventory & receipts"
        />
        <MetricCard
          label="Active Dependencies"
          value={String(totalDependencies)}
          icon={Share2}
          hint="Known causal sequence edges"
        />
        <MetricCard
          label="Bottlenecks & At Risk"
          value={String(atRiskCount)}
          icon={AlertTriangle}
          trend={{
            direction: atRiskCount > 0 ? "down" : "flat",
            label: `${atRiskCount} events need operational attention`,
            sentiment: atRiskCount > 0 ? "bad" : "good",
          }}
        />
        <MetricCard
          label="Liquidity at Risk"
          value={formatMoney(cashAtRiskPaise)}
          icon={TrendingDown}
          trend={{
            direction: cashAtRiskPaise > 0 ? "down" : "flat",
            label:
              cashAtRiskPaise > 0
                ? `${formatMoney(cashAtRiskPaise)} exposed across cycle`
                : "No liquidity deficits detected",
            sentiment: cashAtRiskPaise > 0 ? "bad" : "good",
          }}
        />
      </div>

      {/* Interactive Dependency Graph Canvas + Toolbar + Details Drawer */}
      <RelationshipGraphView data={graph} initialSelectedId={search.selectedId} />
    </div>
  );
}
