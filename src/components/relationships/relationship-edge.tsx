import React, { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import { cn } from "@/lib/utils";

export interface CustomEdgeData {
  description?: string;
  isHighlighted?: boolean;
  isAtRisk?: boolean;
  isDelayed?: boolean;
  isDimmed?: boolean;
  status?: string;
}

export const RelationshipCustomEdge = memo(({
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
}: EdgeProps<CustomEdgeData>) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 6,
  });

  const edgeData = data as CustomEdgeData | undefined;
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
        markerEnd={markerEnd}
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
                ? "bg-card/98 text-foreground border-primary ring-2 ring-primary/30 shadow-md font-bold"
                : isAtRisk
                  ? "bg-warning/20 text-warning-foreground border-warning ring-1 ring-warning/40 shadow-xs"
                  : isDelayed
                    ? "bg-destructive/20 text-destructive border-destructive ring-1 ring-destructive/40 shadow-xs"
                    : "bg-card/95 text-muted-foreground border-border",
            )}
          >
            {description}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

RelationshipCustomEdge.displayName = "RelationshipCustomEdge";
