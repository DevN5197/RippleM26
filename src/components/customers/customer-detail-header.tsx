import React from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { ArrowLeft, Edit, Archive, RotateCcw, PlusCircle, Mail, Phone, MapPin } from "lucide-react";
import type { Customer } from "@/types";

interface CustomerDetailHeaderProps {
  customer: Customer;
  onEdit: () => void;
  onArchiveToggle: () => void;
  onCreateInvoice: () => void;
}

export function CustomerDetailHeader({
  customer,
  onEdit,
  onArchiveToggle,
  onCreateInvoice,
}: CustomerDetailHeaderProps) {
  const isArchived = customer.status === "archived";

  return (
    <div className="space-y-3 pb-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" asChild className="gap-1.5 -ml-2 text-muted-foreground">
          <Link to="/customers">
            <ArrowLeft className="h-4 w-4" />
            Back to Customers
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{customer.name}</h1>
            <StatusBadge status={customer.status ?? "active"} />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {customer.contactName && <span>Contact: {customer.contactName}</span>}
            {customer.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" />
                <a href={`mailto:${customer.email}`} className="hover:underline">
                  {customer.email}
                </a>
              </span>
            )}
            {customer.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" />
                <span>{customer.phone}</span>
              </span>
            )}
            {customer.address && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate max-w-xs">{customer.address}</span>
              </span>
            )}
            <span className="font-medium text-foreground">
              Credit Terms: Net {customer.creditTermsDays} days
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            <Edit className="mr-1.5 h-3.5 w-3.5" />
            Edit Profile
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onArchiveToggle}
            className={isArchived ? "" : "text-amber-700 hover:text-amber-800 dark:text-amber-400"}
          >
            {isArchived ? (
              <>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reactivate
              </>
            ) : (
              <>
                <Archive className="mr-1.5 h-3.5 w-3.5" />
                Archive
              </>
            )}
          </Button>
          <Button size="sm" onClick={onCreateInvoice} disabled={isArchived}>
            <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
            New Invoice
          </Button>
        </div>
      </div>
    </div>
  );
}
