import React from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Edit2,
  Archive,
  RefreshCw,
  Network,
  Truck,
  ShieldAlert,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/shared/status-badge";
import type { SupplierDetailData } from "@/types";

interface SupplierDetailHeaderProps {
  data: SupplierDetailData;
  onEdit: () => void;
  onArchiveToggle: () => void;
}

export function SupplierDetailHeader({ data, onEdit, onArchiveToggle }: SupplierDetailHeaderProps) {
  const { supplier, metrics } = data;
  const isArchived = supplier.status === "archived";

  return (
    <div className="space-y-4">
      {/* Breadcrumb / Back Link */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" asChild className="-ml-2 h-8 px-2 text-xs">
          <Link to="/suppliers">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Suppliers
          </Link>
        </Button>
      </div>

      {/* Main Header Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{supplier.name}</h1>
            <StatusBadge status={supplier.status ?? "active"} />
            <Badge
              variant="outline"
              className={
                metrics.reliabilityScore >= 85
                  ? "border-success/30 bg-success/10 text-success"
                  : metrics.reliabilityScore >= 75
                    ? "border-warning/30 bg-warning/15 text-warning-foreground"
                    : "border-destructive/30 bg-destructive/10 text-destructive"
              }
            >
              {metrics.reliabilityScore}% Reliability
            </Badge>
            {metrics.riskLevel === "high" && (
              <Badge variant="destructive" className="gap-1">
                <ShieldAlert className="h-3 w-3" />
                At Risk
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {supplier.taxId && (
              <span>
                GSTIN: <strong className="font-medium text-foreground">{supplier.taxId}</strong>
              </span>
            )}
            <span>Net {supplier.paymentTermsDays} Days</span>
            {supplier.leadTimeDays && <span>{supplier.leadTimeDays}-day delivery lead</span>}
            {supplier.contactName && <span>Contact: {supplier.contactName}</span>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/relationships" search={{ selectedId: `node_${supplier.id}` }}>
              <Network className="mr-1.5 h-3.5 w-3.5" />
              View Dependency
            </Link>
          </Button>

          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit2 className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>

          <Button variant={isArchived ? "default" : "outline"} size="sm" onClick={onArchiveToggle}>
            {isArchived ? (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Reactivate
              </>
            ) : (
              <>
                <Archive className="mr-1.5 h-3.5 w-3.5" />
                Archive
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
