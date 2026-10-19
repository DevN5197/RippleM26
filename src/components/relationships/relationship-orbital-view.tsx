import React, { useState, useRef, useLayoutEffect, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  Users,
  Truck,
  AlertTriangle,
  ArrowRight,
  FlaskConical,
  X,
  Search,
  Filter,
  FileText,
  Clock,
  ShieldAlert,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { formatMoney } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { customerApi } from "@/lib/api/customerApi";
import { supplierApi } from "@/lib/api/supplierApi";
import { getStoredBusiness } from "@/lib/api/authApi";
import type { RelationshipGraphData, RelationshipGraphNode } from "@/types";

interface RelationshipOrbitalViewProps {
  data: RelationshipGraphData;
  initialSelectedId?: string | undefined;
}

interface CounterpartyItem {
  id: string;
  entityId: string;
  name: string;
  type: "customer" | "supplier";
  amountPaise: number;
  status: "active" | "at_risk" | "delayed";
  termsDays: number;
  reliabilityScore: number;
  initials: string;
  email?: string;
  contactName?: string;
}

export function RelationshipOrbitalView({ data, initialSelectedId }: RelationshipOrbitalViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "customer" | "supplier" | "risk">("all");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<CounterpartyItem | null>(null);
  const [lines, setLines] = useState<
    Array<{
      id: string;
      x1: number;
      y1: number;
      x2: number;
      y2: number;
      isAtRisk: boolean;
      type: "customer" | "supplier";
    }>
  >([]);

  const storedBiz = typeof window !== "undefined" ? getStoredBusiness() : null;
  const businessName = storedBiz?.name || "Rupi Clothing";
  const businessCash = storedBiz?.openingCashPaise || 15_000_000;

  // Extract counterparties from graph nodes
  const counterparties: CounterpartyItem[] = useMemo(() => {
    const items: CounterpartyItem[] = [];
    const seen = new Set<string>();

    for (const n of data.nodes) {
      if (n.type === "customer" || n.type === "supplier") {
        const id = n.id;
        if (seen.has(id)) continue;
        seen.add(id);

        const name = n.label || n.metadata.partnerName || "Unnamed Partner";
        const words = name.trim().split(/\s+/);
        const initials =
          words.length >= 2
            ? `${words[0][0]}${words[1][0]}`.toUpperCase()
            : name.slice(0, 2).toUpperCase();

        const termsStr = n.metadata.workflowSignificance || "";
        const termsMatch = termsStr.match(/(\d+)\s*d/i);
        const termsDays = termsMatch ? parseInt(termsMatch[1], 10) : n.type === "customer" ? 30 : 15;

        const relMatch = termsStr.match(/(\d+)%/);
        const reliabilityScore = relMatch ? parseInt(relMatch[1], 10) : 90;

        items.push({
          id: n.id,
          entityId: n.entityId || n.id.replace(/^node_/, ""),
          name,
          type: n.type,
          amountPaise: n.amountPaise || n.metadata.cashImpactPaise || 0,
          status: n.status === "at_risk" || n.status === "delayed" ? "at_risk" : "active",
          termsDays,
          reliabilityScore,
          initials,
        });
      }
    }

    return items;
  }, [data.nodes]);

  // Initial selection support
  useLayoutEffect(() => {
    if (initialSelectedId && !selectedNode) {
      const match = counterparties.find(
        (c) => c.id === initialSelectedId || c.entityId === initialSelectedId,
      );
      if (match) setSelectedNode(match);
    }
  }, [initialSelectedId, counterparties, selectedNode]);

  // Filtered counterparties
  const filteredNodes = useMemo(() => {
    return counterparties.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.initials.toLowerCase().includes(q)) {
          return false;
        }
      }
      if (filterType === "customer" && c.type !== "customer") return false;
      if (filterType === "supplier" && c.type !== "supplier") return false;
      if (filterType === "risk" && c.status !== "at_risk") return false;
      return true;
    });
  }, [counterparties, search, filterType]);

  // Calculate non-overlapping direct line vectors between center hub and each circular node
  const updateLines = useCallback(() => {
    if (!containerRef.current || !hubRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const hubRect = hubRef.current.getBoundingClientRect();
    const hubX = hubRect.left + hubRect.width / 2 - containerRect.left;
    const hubY = hubRect.top + hubRect.height / 2 - containerRect.top;

    const newLines = [];
    for (const node of filteredNodes) {
      const el = nodeRefs.current.get(node.id);
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      const nodeX = rect.left + rect.width / 2 - containerRect.left;
      const nodeY = rect.top + rect.height / 2 - containerRect.top;

      newLines.push({
        id: node.id,
        x1: hubX,
        y1: hubY,
        x2: nodeX,
        y2: nodeY,
        isAtRisk: node.status === "at_risk",
        type: node.type,
      });
    }
    setLines(newLines);
  }, [filteredNodes]);

  useLayoutEffect(() => {
    updateLines();
    const timer = setTimeout(updateLines, 80);
    window.addEventListener("resize", updateLines);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", updateLines);
    };
  }, [updateLines]);

  // Separate customers and suppliers for visual orbital harmony
  const customerList = useMemo(() => filteredNodes.filter((n) => n.type === "customer"), [filteredNodes]);
  const supplierList = useMemo(() => filteredNodes.filter((n) => n.type === "supplier"), [filteredNodes]);

  return (
    <div className="space-y-6">
      {/* ── Toolbar & Filters ── */}
      <div className="card-rump p-4 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search counterparties…"
            className="pl-9 h-9 text-xs bg-black/50 border-white/15 text-white placeholder:text-muted-foreground"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterType("all")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all cursor-pointer ${
              filterType === "all"
                ? "bg-white text-black font-semibold border-white"
                : "border-white/15 text-muted-foreground hover:text-white"
            }`}
          >
            All ({counterparties.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("customer")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all cursor-pointer ${
              filterType === "customer"
                ? "bg-emerald-500/30 text-emerald-300 font-semibold border-emerald-500/60"
                : "border-white/15 text-muted-foreground hover:text-white"
            }`}
          >
            Customers ({counterparties.filter((c) => c.type === "customer").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("supplier")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all cursor-pointer ${
              filterType === "supplier"
                ? "bg-indigo-500/30 text-indigo-300 font-semibold border-indigo-500/60"
                : "border-white/15 text-muted-foreground hover:text-white"
            }`}
          >
            Suppliers ({counterparties.filter((c) => c.type === "supplier").length})
          </button>
          <button
            type="button"
            onClick={() => setFilterType("risk")}
            className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-all cursor-pointer ${
              filterType === "risk"
                ? "bg-red-500/30 text-red-300 font-semibold border-red-500/60"
                : "border-white/15 text-muted-foreground hover:text-white"
            }`}
          >
            At Risk ({counterparties.filter((c) => c.status === "at_risk").length})
          </button>
        </div>
      </div>

      {/* ── Orbital Command Deck Canvas ── */}
      <div
        ref={containerRef}
        className="card-rump p-8 sm:p-12 border border-white/15 relative overflow-hidden bg-black min-h-[580px] flex flex-col justify-center items-center"
      >
        {/* Subtle Radial Backdrop Ambient Wash */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_0%,transparent_70%)] pointer-events-none" />

        {/* ── Non-Overlapping Subtle SVG Connector Lines ── */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
          {lines.map((line) => {
            const isHovered = hoveredId === line.id;
            return (
              <line
                key={`line_${line.id}`}
                x1={line.x1}
                y1={line.y1}
                x2={line.x2}
                y2={line.y2}
                stroke={
                  isHovered
                    ? "rgba(255, 255, 255, 0.75)"
                    : line.isAtRisk
                      ? "rgba(239, 68, 68, 0.35)"
                      : "rgba(255, 255, 255, 0.15)"
                }
                strokeWidth={isHovered ? 2.5 : 1.5}
                strokeDasharray={line.isAtRisk ? "3 3" : "5 5"}
                className="transition-all duration-300"
              />
            );
          })}
        </svg>

        {/* Orbital Layout Container: Customers Orbit (Top) -> Hub (Center) -> Suppliers Orbit (Bottom) */}
        <div className="relative z-10 w-full flex flex-col items-center gap-12 sm:gap-14">
          {/* Customers Arc / Orbit */}
          {customerList.length > 0 && (
            <div className="w-full space-y-2">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-emerald-400/80">
                  Customer Counterparties · Receivables Flow
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "40px",
                }}
              >
                {customerList.map((c) => (
                  <CounterpartyCircleNode
                    key={c.id}
                    node={c}
                    refCallback={(el) => {
                      if (el) nodeRefs.current.set(c.id, el);
                      else nodeRefs.current.delete(c.id);
                    }}
                    onHover={setHoveredId}
                    onClick={() => setSelectedNode(c)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Central Operating Hub Node */}
          <div
            ref={hubRef}
            className="w-44 h-44 rounded-full card-rump p-4 flex flex-col items-center justify-center text-center relative border-2 border-white/40 shadow-[0_0_40px_rgba(255,255,255,0.12)] bg-[#09090b] transition-transform duration-300 hover:scale-105 select-none"
          >
            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-white mb-1.5 border border-white/20">
              <Building2 className="h-5 w-5" />
            </div>
            <div className="text-xs font-bold text-white tracking-tight uppercase line-clamp-1">
              {businessName}
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold mt-0.5">
              OPERATING HUB
            </span>
            <span className="font-mono text-xs font-bold text-white/90 mt-1">
              {formatMoney(businessCash)}
            </span>
            <span className="text-[9px] text-muted-foreground font-mono">Available Cash</span>
          </div>

          {/* Suppliers Arc / Orbit */}
          {supplierList.length > 0 && (
            <div className="w-full space-y-2">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-indigo-400/80">
                  Supplier Counterparties · Payables Outlay
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: "40px",
                }}
              >
                {supplierList.map((s) => (
                  <CounterpartyCircleNode
                    key={s.id}
                    node={s}
                    refCallback={(el) => {
                      if (el) nodeRefs.current.set(s.id, el);
                      else nodeRefs.current.delete(s.id);
                    }}
                    onHover={setHoveredId}
                    onClick={() => setSelectedNode(s)}
                  />
                ))}
              </div>
            </div>
          )}

          {filteredNodes.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-xs font-mono">
              No counterparties match the active filter or search query.
            </div>
          )}
        </div>
      </div>

      {/* ── Frictionless Counterparty Flyout Modal (Invoice History & Terms) ── */}
      {selectedNode && (
        <CounterpartyDetailModal
          node={selectedNode}
          open={Boolean(selectedNode)}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}

// ── Circular SVG/HTML Node Component ──
interface CounterpartyCircleNodeProps {
  node: CounterpartyItem;
  refCallback: (el: HTMLDivElement | null) => void;
  onHover: (id: string | null) => void;
  onClick: () => void;
}

function CounterpartyCircleNode({
  node,
  refCallback,
  onHover,
  onClick,
}: CounterpartyCircleNodeProps) {
  const isCustomer = node.type === "customer";
  const isRisk = node.status === "at_risk";

  return (
    <div
      ref={refCallback}
      onClick={onClick}
      onMouseEnter={() => onHover(node.id)}
      onMouseLeave={() => onHover(null)}
      className="w-36 h-36 rounded-full card-rump p-3 flex flex-col items-center justify-center text-center relative cursor-pointer group transition-all duration-300 hover:scale-108 hover:border-white/50 hover:shadow-[0_0_30px_rgba(255,255,255,0.22)] select-none border border-white/15 bg-[#09090b]"
      title={`Click to inspect ${node.name}`}
    >
      {/* Risk / Status indicator dot */}
      <span className="absolute top-2.5 right-3 flex h-2.5 w-2.5">
        {isRisk && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
            isRisk ? "bg-red-500" : "bg-emerald-500"
          }`}
        />
      </span>

      {/* Initials Avatar */}
      <div
        className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold mb-1 border ${
          isCustomer
            ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30"
            : "bg-indigo-950/40 text-indigo-400 border-indigo-500/30"
        }`}
      >
        {node.initials}
      </div>

      {/* Business Name */}
      <div className="text-xs font-semibold text-white tracking-tight line-clamp-1 px-1">
        {node.name}
      </div>

      {/* Live Outstanding Paise Balance */}
      <div className="font-mono text-xs font-bold text-white mt-0.5">
        {formatMoney(node.amountPaise)}
      </div>

      {/* Category / Terms tag */}
      <div className="text-[10px] font-mono text-muted-foreground mt-0.5">
        {isCustomer ? "Customer" : "Supplier"} · {node.termsDays}d
      </div>
    </div>
  );
}

// ── Frictionless Counterparty Detail Modal ──
interface CounterpartyDetailModalProps {
  node: CounterpartyItem;
  open: boolean;
  onClose: () => void;
}

function CounterpartyDetailModal({ node, open, onClose }: CounterpartyDetailModalProps) {
  const isCustomer = node.type === "customer";

  // Fetch live backend details + invoice history from FastAPI backend
  const customerQuery = useQuery({
    queryKey: ["customer", "details", node.entityId],
    queryFn: () => customerApi.getDetails(node.entityId),
    enabled: isCustomer && open,
  });

  const supplierQuery = useQuery({
    queryKey: ["supplier", "details", node.entityId],
    queryFn: () => supplierApi.getDetails(node.entityId),
    enabled: !isCustomer && open,
  });

  const isLoading = isCustomer ? customerQuery.isLoading : supplierQuery.isLoading;
  const invoices = isCustomer
    ? customerQuery.data?.invoices || []
    : supplierQuery.data?.invoices || [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-xl card-rump border border-white/20 bg-[#09090b] text-white p-6">
        <DialogHeader className="pb-3 border-b border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`h-11 w-11 rounded-full flex items-center justify-center text-sm font-bold border ${
                  isCustomer
                    ? "bg-emerald-950/50 text-emerald-400 border-emerald-500/40"
                    : "bg-indigo-950/50 text-indigo-400 border-indigo-500/40"
                }`}
              >
                {node.initials}
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white flex items-center gap-2">
                  <span>{node.name}</span>
                  <Badge
                    className={
                      node.status === "at_risk"
                        ? "bg-red-950/50 text-red-400 border border-red-500/30 text-[10px]"
                        : "bg-emerald-950/50 text-emerald-400 border border-emerald-500/30 text-[10px]"
                    }
                  >
                    {node.status === "at_risk" ? "At Risk" : "Healthy"}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {isCustomer ? "Customer Partner" : "Supplier Partner"} · Live Profile & Payment Terms
                </DialogDescription>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Specifications Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-4">
          <div className="p-3 rounded-lg bg-black/60 border border-white/10">
            <span className="text-[10px] text-muted-foreground uppercase font-mono">Payment Terms</span>
            <div className="font-mono text-sm font-bold text-white mt-0.5">{node.termsDays} Days</div>
          </div>
          <div className="p-3 rounded-lg bg-black/60 border border-white/10">
            <span className="text-[10px] text-muted-foreground uppercase font-mono">Reliability</span>
            <div className="font-mono text-sm font-bold text-emerald-400 mt-0.5">
              {node.reliabilityScore}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-black/60 border border-white/10">
            <span className="text-[10px] text-muted-foreground uppercase font-mono">Outstanding</span>
            <div className="font-mono text-sm font-bold text-white mt-0.5">
              {formatMoney(node.amountPaise)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-black/60 border border-white/10">
            <span className="text-[10px] text-muted-foreground uppercase font-mono">Flow Direction</span>
            <div className="font-mono text-sm font-bold text-white mt-0.5">
              {isCustomer ? "Incoming" : "Outgoing"}
            </div>
          </div>
        </div>

        {/* Invoice History Section */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-white/90">
            <span className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-primary" />
              Invoice History
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {invoices.length} Record{invoices.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="rounded-lg border border-white/10 bg-black/50 overflow-hidden max-h-56 overflow-y-auto">
            {isLoading ? (
              <div className="p-6 text-center text-xs text-muted-foreground font-mono">
                Loading live invoice records from backend…
              </div>
            ) : invoices.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground font-mono">
                No invoices recorded for this counterparty.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 border-b border-white/10 text-[10px] font-mono text-muted-foreground uppercase">
                  <tr>
                    <th className="py-2 px-3">Invoice #</th>
                    <th className="py-2 px-3">Due Date</th>
                    <th className="py-2 px-3 text-right">Amount</th>
                    <th className="py-2 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-2 px-3 text-white font-medium">
                        {inv.invoiceNumber || inv.id}
                      </td>
                      <td className="py-2 px-3 text-muted-foreground">{inv.dueDate}</td>
                      <td className="py-2 px-3 text-right text-white font-semibold">
                        {formatMoney(inv.amountPaise)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            inv.status === "paid"
                              ? "text-emerald-400 bg-emerald-950/40"
                              : inv.status === "overdue"
                                ? "text-red-400 bg-red-950/40"
                                : "text-amber-400 bg-amber-950/40"
                          }`}
                        >
                          {inv.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Action Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between gap-2">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-xs border-white/20 text-white hover:bg-white/10 gap-1.5"
          >
            <Link to="/simulator" search={{ eventName: node.name }}>
              <FlaskConical className="h-3.5 w-3.5 text-primary" />
              <span>Simulate Counterparty Shock</span>
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={onClose}
            className="btn-rump-solid px-4 py-1.5 text-xs font-semibold"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
