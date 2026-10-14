import React from "react";
import { Plus, Truck, Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

interface SupplierHeaderProps {
  onAddSupplier: () => void;
  totalSuppliers?: number;
}

export function SupplierHeader({ onAddSupplier, totalSuppliers }: SupplierHeaderProps) {
  return (
    <PageHeader
      title="Suppliers"
      description={`Vendor directory, payment terms, outstanding balances, and delivery reliability${
        totalSuppliers !== undefined
          ? ` · ${totalSuppliers} counterpoint${totalSuppliers === 1 ? "" : "s"}`
          : ""
      }`}
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={onAddSupplier}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Add Supplier
          </Button>
        </div>
      }
    />
  );
}
