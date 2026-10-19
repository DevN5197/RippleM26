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

import { useState } from "react";
import { RelationshipOrbitalView } from "@/components/relationships/relationship-orbital-view";

function RelationshipsPage() {
  const { data } = useSuspenseQuery(relationshipsQuery);
  const search = Route.useSearch();
  const graph: RelationshipGraphData = data;
  const [viewMode, setViewMode] = useState<"orbital" | "flow">("orbital");

  const totalTouchpoints = graph.summary.totalNodes;
  const totalDependencies = graph.summary.totalEdges;
  const atRiskCount = graph.summary.atRiskCount;
  const cashAtRiskPaise = graph.summary.totalCashAtRiskPaise;

  return (
    <div className="space-y-8 bg-black text-white min-h-screen pb-12">
      {/* ── Page Header with View Switcher ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Relationships</h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium text-emerald-400 bg-emerald-950/40 border border-emerald-500/30">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              NEXUS ACTIVE
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Radial counterparty intelligence mapping live receivables, supplier obligations, and payment terms.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center rounded-lg border border-white/15 bg-black/60 p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => setViewMode("orbital")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                viewMode === "orbital"
                  ? "bg-white text-black font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Orbital Command Deck
            </button>
            <button
              type="button"
              onClick={() => setViewMode("flow")}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                viewMode === "flow"
                  ? "bg-white text-black font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-white"
              }`}
            >
              Full Dependency Flow
            </button>
          </div>

          <Button size="sm" asChild className="btn-rump-solid gap-1.5 shadow-xs px-3.5 py-1.5 text-xs font-semibold">
            <Link to="/simulator">
              <FlaskConical className="h-3.5 w-3.5 text-black" />
              <span>Simulate a Delay</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* ── High-Signal Metric Cards in .card-rump ── */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card-rump p-5 border border-white/15 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase font-bold font-mono tracking-wider">Touchpoints</span>
            <Layers className="h-4 w-4 text-white/70" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white tracking-tight">{totalTouchpoints}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Counterparties & cash events</p>
          </div>
        </div>

        <div className="card-rump p-5 border border-white/15 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase font-bold font-mono tracking-wider">Active Dependencies</span>
            <Share2 className="h-4 w-4 text-white/70" />
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold font-mono text-white tracking-tight">{totalDependencies}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">Causal flow edges</p>
          </div>
        </div>

        <div className="card-rump p-5 border border-white/15 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase font-bold font-mono tracking-wider">Bottlenecks</span>
            <AlertTriangle className={`h-4 w-4 ${atRiskCount > 0 ? "text-red-400" : "text-emerald-400"}`} />
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold font-mono tracking-tight ${atRiskCount > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {atRiskCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {atRiskCount > 0 ? `${atRiskCount} nodes under stress` : "Zero critical bottlenecks"}
            </p>
          </div>
        </div>

        <div className="card-rump p-5 border border-white/15 flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs uppercase font-bold font-mono tracking-wider">Liquidity Exposed</span>
            <TrendingDown className={`h-4 w-4 ${cashAtRiskPaise > 0 ? "text-red-400" : "text-emerald-400"}`} />
          </div>
          <div className="mt-3">
            <div className={`text-2xl font-bold font-mono tracking-tight ${cashAtRiskPaise > 0 ? "text-red-400" : "text-emerald-400"}`}>
              {formatMoney(cashAtRiskPaise)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {cashAtRiskPaise > 0 ? "Compromised in operating cycle" : "No liquidity deficit"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Main View: Orbital Command Deck (Default) or Detailed Flow ── */}
      {viewMode === "orbital" ? (
        <RelationshipOrbitalView data={graph} initialSelectedId={search.selectedId} />
      ) : (
        <div className="card-rump p-4 border border-white/15">
          <RelationshipGraphView data={graph} initialSelectedId={search.selectedId} />
        </div>
      )}
    </div>
  );
}
