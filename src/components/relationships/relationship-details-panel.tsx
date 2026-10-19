import React from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  X,
  ArrowRight,
  ArrowLeft,
  Calendar,
  AlertTriangle,
  FlaskConical,
  ExternalLink,
  Info,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/shared/status-badge";
import { MoneyAmount } from "@/components/shared/money-amount";
import { DateLabel } from "@/components/shared/date-label";
import { formatMoney } from "@/lib/formatters";
import type {
  RelationshipGraphNode,
  RelationshipGraphEdge,
  RelationshipGraphData,
  RippleImpactPreview,
} from "@/types";
import { calculateRippleImpact } from "@/lib/api/relationshipsApi";

interface RelationshipDetailsPanelProps {
  nodeId: string | null;
  graph: RelationshipGraphData;
  onSelectNode: (nodeId: string) => void;
  onClose: () => void;
}

export function RelationshipDetailsPanel({
  nodeId,
  graph,
  onSelectNode,
  onClose,
}: RelationshipDetailsPanelProps) {
  const navigate = useNavigate();

  if (!nodeId) return null;

  const node = graph.nodes.find((n) => n.id === nodeId);
  if (!node) return null;

  // Immediate Upstream Dependencies (incoming edges)
  const incomingEdges = graph.edges.filter((e) => e.target === nodeId);
  const upstreamNodes = incomingEdges
    .map((e) => ({
      edge: e,
      node: graph.nodes.find((n) => n.id === e.source),
    }))
    .filter((item): item is { edge: RelationshipGraphEdge; node: RelationshipGraphNode } =>
      Boolean(item.node),
    );

  // Immediate Downstream Dependencies (outgoing edges)
  const outgoingEdges = graph.edges.filter((e) => e.source === nodeId);
  const downstreamNodes = outgoingEdges
    .map((e) => ({
      edge: e,
      node: graph.nodes.find((n) => n.id === e.target),
    }))
    .filter((item): item is { edge: RelationshipGraphEdge; node: RelationshipGraphNode } =>
      Boolean(item.node),
    );

  // Calculate ripple impact preview
  const ripplePreview: RippleImpactPreview = calculateRippleImpact(nodeId, graph);

  const handleSimulateDelay = () => {
    window.open(
      `/simulator?eventId=${encodeURIComponent(node.id)}&eventName=${encodeURIComponent(node.label)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <Card className="flex flex-col h-full border-border/80 shadow-md overflow-hidden bg-card text-card-foreground">
      {/* Panel Header */}
      <CardHeader className="pb-3 px-4 pt-4 border-b border-border/60 bg-muted/20">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-[10px] font-semibold uppercase tracking-wider"
              >
                {node.type.replace(/_/g, " ")}
              </Badge>
              <StatusBadge status={node.status} />
            </div>
            <CardTitle className="text-base font-bold text-foreground leading-snug truncate">
              {node.label}
            </CardTitle>
            {node.metadata.partnerName && (
              <CardDescription className="text-xs truncate font-medium text-muted-foreground">
                Partner: {node.metadata.partnerName}
              </CardDescription>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            aria-label="Close details"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Key Attributes Grid */}
        <div className="grid grid-cols-2 gap-2.5 rounded-lg border border-white/15 bg-white/[0.04] p-3 text-xs">
          {node.metadata.referenceNumber && (
            <div>
              <span className="text-[10px] uppercase font-bold text-white/70 block">
                Reference
              </span>
              <span className="font-semibold text-white">{node.metadata.referenceNumber}</span>
            </div>
          )}

          {node.date && (
            <div>
              <span className="text-[10px] uppercase font-bold text-white/70 block">
                Scheduled / Due
              </span>
              <DateLabel iso={node.date} className="font-semibold text-white" />
            </div>
          )}

          {node.metadata.actualDate && (
            <div>
              <span className="text-[10px] uppercase font-bold text-white/70 block">
                Actual Date
              </span>
              <DateLabel iso={node.metadata.actualDate} className="font-semibold text-white" />
            </div>
          )}

          {node.amountPaise !== undefined && node.amountPaise > 0 && (
            <div>
              <span className="text-[10px] uppercase font-bold text-white/70 block">
                Amount
              </span>
              <MoneyAmount paise={node.amountPaise} className="font-bold text-emerald-300" />
            </div>
          )}

          {node.metadata.quantity !== undefined && (
            <div>
              <span className="text-[10px] uppercase font-bold text-white/70 block">
                Quantity
              </span>
              <span className="font-semibold text-white">
                {node.metadata.quantity} units {node.metadata.sku ? `(${node.metadata.sku})` : ""}
              </span>
            </div>
          )}

          {node.metadata.expectedDate && !node.date && (
            <div>
              <span className="text-[10px] uppercase font-bold text-white/70 block">
                Timeline / Terms
              </span>
              <span className="font-semibold text-white">{node.metadata.expectedDate}</span>
            </div>
          )}
        </div>

        {/* Why this node matters */}
        <div className="rounded-lg border border-white/20 bg-white/[0.05] p-3">
          <div className="flex items-center gap-1.5 font-bold text-white mb-1.5">
            <Info className="h-3.5 w-3.5 text-emerald-400" />
            <span>Workflow Significance</span>
          </div>
          <p className="text-xs leading-relaxed text-white/90">
            {node.metadata.workflowSignificance}
          </p>
        </div>

        {/* Cash-Flow Impact & Risk Note */}
        {(node.metadata.cashImpactPaise !== undefined || node.metadata.riskDescription) && (
          <div
            className={`rounded-lg border p-3 ${
              node.metadata.riskSeverity === "critical"
                ? "border-rose-500/40 bg-rose-500/15 text-rose-200"
                : "border-amber-500/40 bg-amber-500/15 text-amber-200"
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold mb-1 text-white">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
              <span>Cash-Flow Assessment</span>
            </div>
            {node.metadata.cashImpactPaise !== undefined && (
              <p className="text-xs font-medium mb-1 text-white">
                Net liquidity delta:{" "}
                <span className="font-bold text-emerald-300">{formatMoney(node.metadata.cashImpactPaise)}</span> (
                {node.metadata.cashDirection === "outgoing" ? "cash outflow" : "cash inflow"})
              </p>
            )}
            {node.metadata.riskDescription && (
              <p className="text-xs leading-relaxed text-white/90">
                {node.metadata.riskDescription}
              </p>
            )}
          </div>
        )}

        {/* Upstream Dependencies */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-white">
            <span className="flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5 text-emerald-400" />
              Must Happen First ({upstreamNodes.length})
            </span>
          </div>
          {upstreamNodes.length === 0 ? (
            <p className="text-xs text-white/70 italic rounded-md border border-dashed border-white/20 p-2 bg-white/[0.02]">
              Initial initiating entity — no preceding business dependencies.
            </p>
          ) : (
            <div className="space-y-1.5">
              {upstreamNodes.map(({ edge, node: upstreamNode }) => (
                <button
                  key={upstreamNode.id}
                  onClick={() => onSelectNode(upstreamNode.id)}
                  className="w-full flex items-center justify-between gap-2 p-2.5 rounded-md border border-white/15 bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/40 text-left transition-colors group cursor-pointer"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white group-hover:text-emerald-300 transition-colors">
                      {upstreamNode.label}
                    </p>
                    <p className="truncate text-[11px] text-white/70">{edge.description}</p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-white/70 group-hover:text-emerald-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Downstream Consequences */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-foreground">
            <span className="flex items-center gap-1.5">
              <ArrowRight className="h-3.5 w-3.5 text-warning" />
              Downstream Events Affected ({downstreamNodes.length})
            </span>
          </div>
          {downstreamNodes.length === 0 ? (
            <p className="text-xs text-muted-foreground italic rounded-md border border-dashed p-2">
              Terminal event — does not trigger further active events.
            </p>
          ) : (
            <div className="space-y-1.5">
              {downstreamNodes.map(({ edge, node: downstreamNode }) => (
                <button
                  key={downstreamNode.id}
                  onClick={() => onSelectNode(downstreamNode.id)}
                  className="w-full flex items-center justify-between gap-2 p-2 rounded-md border bg-background hover:bg-accent hover:border-primary/40 text-left transition-colors group"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground group-hover:text-primary transition-colors">
                      {downstreamNode.label}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">{edge.description}</p>
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Ripple Impact Preview */}
        <div className="rounded-xl border bg-muted/30 p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="font-bold text-xs uppercase tracking-wide text-foreground flex items-center gap-1.5">
              <FlaskConical className="h-3.5 w-3.5 text-primary" />
              Potential Ripple Effect
            </h5>
            <span className="text-[10px] text-muted-foreground">Causal Chain</span>
          </div>

          <p className="text-xs leading-relaxed text-muted-foreground">
            {ripplePreview.businessImpactSummary}
          </p>

          {/* Chain visualization */}
          {ripplePreview.chain.length > 0 && (
            <div className="space-y-1.5 pt-1">
              {ripplePreview.chain.slice(0, 4).map((milestone, i) => (
                <div
                  key={milestone.nodeId}
                  className="flex items-center gap-2 text-xs py-1 px-2 rounded-md bg-card border border-border/70"
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-foreground truncate block">
                      {milestone.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground block truncate">
                      {milestone.consequence}
                    </span>
                  </div>
                  {milestone.date && (
                    <span className="text-[11px] font-medium text-muted-foreground tabular-nums shrink-0">
                      {milestone.date.slice(5)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Action to simulate delay */}
          <Button
            onClick={handleSimulateDelay}
            className="w-full gap-2 mt-2 h-9 text-xs font-semibold shadow-xs"
          >
            <FlaskConical className="h-4 w-4" />
            <span>Simulate a Delay in Ripple</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
