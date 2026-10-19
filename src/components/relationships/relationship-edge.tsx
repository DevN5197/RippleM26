import React, { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { cn } from "@/lib/utils";

/**
 * Declared as a `type` alias rather than an `interface` on purpose: only object
 * type aliases receive an implicit index signature, which is what lets this
 * satisfy React Flow's `Edge<T extends Record<string, unknown>>` constraint.
 */
export type CustomEdgeData = {
  description?: string | undefined;
  isHighlighted?: boolean | undefined;
  isAtRisk?: boolean | undefined;
  isDelayed?: boolean | undefined;
  isDimmed?: boolean | undefined;
  status?: string | undefined;
};

export type RelationshipEdge = Edge<CustomEdgeData>;

export const RelationshipCustomEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    data,
  }: EdgeProps<RelationshipEdge>) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
      borderRadius: 6,
    });

    const edgeData = data;
    const isHighlighted = edgeData?.isHighlighted;
    const isAtRisk = edgeData?.isAtRisk;
    const isDelayed = edgeData?.isDelayed;
    const isDimmed = edgeData?.isDimmed;
    const description = edgeData?.description;

    const shouldShowLabel = Boolean(description) && (isHighlighted || isAtRisk || isDelayed);

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          // React Flow types this as `markerEnd?: string`, which under
          // `exactOptionalPropertyTypes` rejects an explicit `undefined`.
          {...(markerEnd ? { markerEnd } : {})}
          style={{
            ...style,
            strokeWidth: isHighlighted ? 2.5 : isAtRisk || isDelayed ? 2 : 1.5,
            stroke: isHighlighted
              ? "var(--primary)"
              : isAtRisk
                ? "var(--warning)"
                : isDelayed
                  ? "var(--destructive)"
                  : "var(--muted-foreground)",
            opacity: isDimmed ? 0.3 : isHighlighted ? 1 : 0.75,
            strokeDasharray: isAtRisk ? "5,5" : isDelayed ? "4,4" : undefined,
            transition: "all 0.2s ease",
          }}
        />
        {shouldShowLabel && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: "absolute",
                transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                pointerEvents: "all",
                zIndex: 1000,
              }}
              className={cn(
                "rounded-md border px-2.5 py-1 text-[10px] font-semibold shadow-xs select-none backdrop-blur-md whitespace-nowrap",
                isHighlighted
                  ? "bg-[#18181b] text-white border-white/60 ring-2 ring-white/30 shadow-md font-bold"
                  : isAtRisk
                    ? "bg-amber-950/80 text-amber-200 border-amber-400 ring-1 ring-amber-400/40 shadow-xs font-semibold"
                    : isDelayed
                      ? "bg-rose-950/80 text-rose-200 border-rose-400 ring-1 ring-rose-400/40 shadow-xs font-semibold"
                      : "bg-[#18181b] text-white/90 border-white/20 font-medium",
              )}
            >
              {description}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  },
);

RelationshipCustomEdge.displayName = "RelationshipCustomEdge";
