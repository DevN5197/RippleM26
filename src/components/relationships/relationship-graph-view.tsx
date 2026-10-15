import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  BackgroundVariant,
  type NodeMouseHandler,
  type Node,
} from "@xyflow/react";
import { Network, Sparkles, FilterX, Maximize2, Minimize2 } from "lucide-react";
import { adaptToReactFlow } from "./graph-adapter";
import { RelationshipCustomNode, LaneHeaderNode, type CustomNodeData } from "./relationship-node";
import { RelationshipCustomEdge } from "./relationship-edge";
import { RelationshipToolbar, type FilterState } from "./relationship-toolbar";
import { RelationshipDetailsPanel } from "./relationship-details-panel";
import { RelationshipLegend } from "./relationship-legend";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import type { RelationshipGraphData } from "@/types";

interface RelationshipGraphViewProps {
  data: RelationshipGraphData;
  initialSelectedId?: string | undefined;
}

const nodeTypes = {
  custom: RelationshipCustomNode,
  lane_header: LaneHeaderNode,
};

const edgeTypes = {
  custom: RelationshipCustomEdge,
};

const initialFilters: FilterState = {
  search: "",
  type: "all",
  status: "all",
  partner: "all",
  riskOnly: false,
};

function InnerGraphView({ data, initialSelectedId }: RelationshipGraphViewProps) {
  const reactFlowInstance = useReactFlow();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const resolvedInitialId = useMemo(() => {
    if (!initialSelectedId) return "node_delivery_1";
    const found = data.nodes.find(
      (n) => n.id === initialSelectedId || n.entityId === initialSelectedId,
    );
    return found ? found.id : initialSelectedId;
  }, [data.nodes, initialSelectedId]);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(resolvedInitialId);

  useEffect(() => {
    if (initialSelectedId) {
      const found = data.nodes.find(
        (n) => n.id === initialSelectedId || n.entityId === initialSelectedId,
      );
      setSelectedNodeId(found ? found.id : initialSelectedId);
    }
  }, [initialSelectedId, data.nodes]);
  const [filters, setFilters] = useState<FilterState>(initialFilters);

  // Escape key handler for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
        setTimeout(() => reactFlowInstance?.fitView({ padding: 0.15, duration: 300 }), 100);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, reactFlowInstance]);

  // Filter nodes according to active filters
  const filteredNodeIds = useMemo(() => {
    const query = filters.search.toLowerCase().trim();
    const typeFilter = filters.type;
    const statusFilter = filters.status;
    const partnerFilter = filters.partner;
    const riskOnly = filters.riskOnly;

    return new Set(
      data.nodes
        .filter((node) => {
          if (query) {
            const matchesQuery =
              node.label.toLowerCase().includes(query) ||
              node.type.toLowerCase().includes(query) ||
              Boolean(node.metadata.referenceNumber?.toLowerCase().includes(query)) ||
              Boolean(node.metadata.partnerName?.toLowerCase().includes(query)) ||
              Boolean(node.metadata.productName?.toLowerCase().includes(query)) ||
              Boolean(node.metadata.sku?.toLowerCase().includes(query));
            if (!matchesQuery) return false;
          }

          if (typeFilter !== "all" && node.type !== typeFilter) {
            return false;
          }

          if (statusFilter !== "all" && node.status !== statusFilter) {
            return false;
          }

          if (partnerFilter !== "all") {
            const matchesPartner =
              Boolean(
                node.metadata.partnerName?.toLowerCase().includes(partnerFilter.toLowerCase()),
              ) || node.entityId === partnerFilter;
            if (!matchesPartner) return false;
          }

          if (riskOnly) {
            const isRisk =
              node.status === "at_risk" ||
              node.status === "delayed" ||
              node.type === "cash_flow_risk" ||
              Boolean(node.metadata.riskSeverity);
            if (!isRisk) return false;
          }

          return true;
        })
        .map((n) => n.id),
    );
  }, [data.nodes, filters]);

  // Compute React Flow nodes & edges
  const { nodes: flowNodes, edges: flowEdges } = useMemo(() => {
    return adaptToReactFlow(data, {
      selectedNodeId,
      filteredNodeIds,
    });
  }, [data, selectedNodeId, filteredNodeIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<CustomNodeData>>(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Sync state when dependencies or selection changes
  useEffect(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  // Handle fitView on initial render
  const initialFitDone = useRef(false);
  useEffect(() => {
    if (!initialFitDone.current && reactFlowInstance && flowNodes.length > 0) {
      setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.15, duration: 400 });
        initialFitDone.current = true;
      }, 100);
    }
  }, [reactFlowInstance, flowNodes.length]);

  // Handle Reset View
  const handleResetView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView({ padding: 0.2, duration: 400 });
    }
  }, [reactFlowInstance]);

  // Focus and select node
  const handleSelectNode = useCallback(
    (id: string) => {
      setSelectedNodeId(id);
      const targetNode = nodes.find((n) => n.id === id);
      if (targetNode && reactFlowInstance) {
        reactFlowInstance.setCenter(targetNode.position.x + 130, targetNode.position.y + 60, {
          zoom: 1.1,
          duration: 450,
        });
      }
    },
    [nodes, reactFlowInstance],
  );

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    if (node.type === "lane_header") return;
    setSelectedNodeId(node.id);
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const handleResetFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  // Check if active selection exists in filtered results
  const isSelectedVisible = selectedNodeId && filteredNodeIds.has(selectedNodeId);

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Toolbar */}
      <RelationshipToolbar
        filters={filters}
        onFilterChange={setFilters}
        onResetView={handleResetView}
        onResetFilters={handleResetFilters}
        matchCount={filteredNodeIds.size}
        totalCount={data.nodes.length}
      />

      {/* Main Workspace: Graph Canvas + Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Graph Canvas Container */}
        <div
          className={
            isFullscreen
              ? "fixed inset-0 z-50 h-screen w-screen bg-background p-4 flex flex-col overflow-hidden"
              : "lg:col-span-8 xl:col-span-8 flex flex-col rounded-xl border bg-card shadow-xs overflow-hidden h-[620px] sm:h-[680px] relative"
          }
        >
          {filteredNodeIds.size === 0 ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <EmptyState
                icon={FilterX}
                title="No matching events found"
                description="Adjust your search query or reset filters to view all connected business events."
                actionLabel="Reset all filters"
                onAction={handleResetFilters}
              />
            </div>
          ) : (
            <>
              {isFullscreen && (
                <div className="flex items-center justify-between pb-3 border-b mb-3">
                  <div className="flex items-center gap-2">
                    <Network className="h-5 w-5 text-primary" />
                    <span className="font-bold text-foreground text-sm">
                      Business Relationship Graph — Fullscreen View
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResetView}
                      className="h-8 text-xs"
                    >
                      Reset View
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setIsFullscreen(false);
                        setTimeout(
                          () => reactFlowInstance?.fitView({ padding: 0.15, duration: 300 }),
                          100,
                        );
                      }}
                      className="h-8 gap-1.5 text-xs"
                    >
                      <Minimize2 className="h-3.5 w-3.5" />
                      <span>Exit Fullscreen</span>
                    </Button>
                  </div>
                </div>
              )}

              <div className="relative flex-1 w-full h-full">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onNodeClick={handleNodeClick}
                  onPaneClick={handlePaneClick}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  nodesDraggable={false}
                  nodesConnectable={false}
                  elementsSelectable={true}
                  minZoom={0.25}
                  maxZoom={2.0}
                  defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                  fitView
                  fitViewOptions={{ padding: 0.15 }}
                  className="select-none"
                >
                  <Background
                    variant={BackgroundVariant.Lines}
                    gap={28}
                    size={1}
                    color="color-mix(in srgb, var(--color-border) 70%, transparent)"
                  />
                  <Controls
                    showInteractive={false}
                    position="bottom-left"
                    className="m-3 shadow-xs"
                  />
                  <MiniMap
                    nodeStrokeWidth={2}
                    zoomable
                    pannable
                    position="bottom-right"
                    className="hidden md:block m-3"
                    nodeColor={(n) => {
                      if (n.id === selectedNodeId) return "var(--color-primary)";
                      return "var(--color-muted-foreground)";
                    }}
                  />
                </ReactFlow>

                {/* Fullscreen & Quick Jump buttons on top-left of canvas */}
                <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = !isFullscreen;
                      setIsFullscreen(next);
                      setTimeout(
                        () => reactFlowInstance?.fitView({ padding: 0.15, duration: 300 }),
                        150,
                      );
                    }}
                    className="h-8 gap-1.5 text-xs bg-card/90 shadow-xs backdrop-blur-xs cursor-pointer font-medium"
                  >
                    {isFullscreen ? (
                      <Minimize2 className="h-3.5 w-3.5" />
                    ) : (
                      <Maximize2 className="h-3.5 w-3.5" />
                    )}
                    <span>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                  </Button>

                  <div className="hidden sm:flex items-center rounded-lg border bg-card/90 p-0.5 shadow-xs backdrop-blur-xs text-xs">
                    <button
                      onClick={() => reactFlowInstance?.fitView({ padding: 0.15, duration: 400 })}
                      className="rounded px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Fit all workflows"
                    >
                      Fit All
                    </button>
                    <button
                      onClick={() =>
                        reactFlowInstance?.setCenter(1840, 160, { zoom: 0.5, duration: 450 })
                      }
                      className="rounded px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Focus on Primary Operating Cycle"
                    >
                      Chain 1
                    </button>
                    <button
                      onClick={() =>
                        reactFlowInstance?.setCenter(665, 850, { zoom: 0.8, duration: 450 })
                      }
                      className="rounded px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Focus on Mehta Fabrics cycle"
                    >
                      Chain 2
                    </button>
                    <button
                      onClick={() =>
                        reactFlowInstance?.setCenter(900, 1450, { zoom: 0.75, duration: 450 })
                      }
                      className="rounded px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      title="Focus on Style Mart receivables"
                    >
                      Chain 3
                    </button>
                  </div>
                </div>

                {/* Collapsible Legend mounted at top-right inside canvas */}
                <div className="absolute top-3 right-3 z-10 max-w-sm">
                  <RelationshipLegend />
                </div>

                {/* Canvas status hint bar */}
                <div className="absolute bottom-3 left-16 z-10 hidden sm:flex items-center gap-2 rounded-full border bg-card/90 px-3 py-1 text-[11px] text-muted-foreground shadow-xs backdrop-blur-xs">
                  <Network className="h-3 w-3 text-primary" />
                  <span>Scroll to zoom · Drag to pan · Click any node to trace impact</span>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Side Details Panel */}
        <div className="lg:col-span-4 xl:col-span-4 h-[620px] sm:h-[680px]">
          {isSelectedVisible ? (
            <RelationshipDetailsPanel
              nodeId={selectedNodeId}
              graph={data}
              onSelectNode={handleSelectNode}
              onClose={() => setSelectedNodeId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-center h-full rounded-xl border border-dashed bg-card/50 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                <Sparkles className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-semibold text-foreground">Select a business event</h4>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs leading-relaxed">
                Click any node on the graph to inspect its upstream dependencies, downstream
                consequences, cash-flow impact, and simulate delays.
              </p>
              <div className="mt-4 flex flex-col gap-2 w-full max-w-xs">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Featured workflows
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectNode("node_delivery_1")}
                  className="justify-between text-xs h-8"
                >
                  <span>Inventory Delivery (Day 4)</span>
                  <span className="text-[10px] text-muted-foreground">Upcoming</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectNode("node_pay_3")}
                  className="justify-between text-xs h-8"
                >
                  <span>PO Balance Payment (₹30,000)</span>
                  <span className="text-[10px] text-destructive">Day 4 Outflow</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectNode("node_risk_1")}
                  className="justify-between text-xs h-8"
                >
                  <span>Cash Shortfall Risk (Day 5)</span>
                  <span className="text-[10px] text-warning">Critical</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function RelationshipGraphView(props: RelationshipGraphViewProps) {
  return (
    <ReactFlowProvider>
      <InnerGraphView {...props} />
    </ReactFlowProvider>
  );
}
