import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Search,
  ArrowUpDown,
  MoreHorizontal,
  ExternalLink,
  Edit2,
  Archive,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Calendar,
  Building,
  Mail,
  Phone,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MoneyAmount } from "@/components/shared/money-amount";
import { DateLabel } from "@/components/shared/date-label";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/formatters";
import type { EnrichedSupplier } from "@/types";

interface SupplierTableProps {
  suppliers: EnrichedSupplier[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: "all" | "active" | "archived";
  onStatusFilterChange: (status: "all" | "active" | "archived") => void;
  riskFilter: "all" | "at_risk" | "healthy";
  onRiskFilterChange: (risk: "all" | "at_risk" | "healthy") => void;
  sortBy: "name" | "outstanding" | "nextPayment" | "reliability";
  onSortChange: (sort: "name" | "outstanding" | "nextPayment" | "reliability") => void;
  sortDir: "asc" | "desc";
  onSortDirToggle: () => void;
  onEdit: (supplier: EnrichedSupplier) => void;
  onArchive: (supplier: EnrichedSupplier) => void;
  onUnarchive: (supplier: EnrichedSupplier) => void;
  onDelete: (supplier: EnrichedSupplier) => void;
  onAddSupplier: () => void;
}

export function SupplierTable({
  suppliers,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  riskFilter,
  onRiskFilterChange,
  sortBy,
  onSortChange,
  sortDir,
  onSortDirToggle,
  onEdit,
  onArchive,
  onUnarchive,
  onDelete,
  onAddSupplier,
}: SupplierTableProps) {
  const [currentPage, setCurrentPage] = React.useState(1);
  const [localSearch, setLocalSearch] = React.useState(searchQuery);
  const pageSize = 10;

  React.useEffect(() => {
    setLocalSearch(searchQuery);
  }, [searchQuery]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== searchQuery) {
        onSearchChange(localSearch);
      }
    }, 200);
    return () => clearTimeout(handler);
  }, [localSearch, searchQuery, onSearchChange]);

  // Reset pagination on search/filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, riskFilter, sortBy, sortDir]);

  const totalPages = Math.ceil(suppliers.length / pageSize) || 1;
  const paginatedSuppliers = suppliers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden />
          <Input
            placeholder="Search suppliers, contacts, GSTIN..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => onStatusFilterChange(val as "all" | "active" | "archived")}
          >
            <SelectTrigger className="w-[130px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="archived">Archived Only</SelectItem>
            </SelectContent>
          </Select>

          {/* Risk Filter */}
          <Select
            value={riskFilter}
            onValueChange={(val) => onRiskFilterChange(val as "all" | "at_risk" | "healthy")}
          >
            <SelectTrigger className="w-[130px] text-xs">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
              <SelectItem value="healthy">Healthy</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort Selector */}
          <Select
            value={sortBy}
            onValueChange={(val) =>
              onSortChange(val as "name" | "outstanding" | "nextPayment" | "reliability")
            }
          >
            <SelectTrigger className="w-[150px] text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort by Name</SelectItem>
              <SelectItem value="outstanding">Sort by Outstanding</SelectItem>
              <SelectItem value="nextPayment">Sort by Next Due</SelectItem>
              <SelectItem value="reliability">Sort by Reliability</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={onSortDirToggle}
            title={sortDir === "asc" ? "Ascending order" : "Descending order"}
            className="h-9 w-9 shrink-0"
          >
            <ArrowUpDown className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Table Container */}
      {paginatedSuppliers.length === 0 ? (
        <EmptyState
          icon={Building}
          title={
            searchQuery || statusFilter !== "all" || riskFilter !== "all"
              ? "No suppliers match your filters"
              : "No suppliers found"
          }
          description={
            searchQuery || statusFilter !== "all" || riskFilter !== "all"
              ? "Try adjusting your search criteria, status, or risk filters."
              : "Register your first supplier to track purchase orders, bills, and payment terms."
          }
          actionLabel={
            searchQuery || statusFilter !== "all" || riskFilter !== "all"
              ? "Reset filters"
              : "Add Supplier"
          }
          onAction={() => {
            if (searchQuery || statusFilter !== "all" || riskFilter !== "all") {
              onSearchChange("");
              onStatusFilterChange("all");
              onRiskFilterChange("all");
            } else {
              onAddSupplier();
            }
          }}
        />
      ) : (
        <div className="rounded-lg border bg-card shadow-xs">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[240px]">Supplier</TableHead>
                <TableHead className="min-w-[170px]">Contact Details</TableHead>
                <TableHead className="text-right">Outstanding Balance</TableHead>
                <TableHead className="text-center">Open POs</TableHead>
                <TableHead className="min-w-[140px]">Next Due Payment</TableHead>
                <TableHead>Payment Terms</TableHead>
                <TableHead className="text-center">Reliability & Risk</TableHead>
                <TableHead className="text-right w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedSuppliers.map((supplier) => {
                const isArchived = supplier.status === "archived";

                return (
                  <TableRow
                    key={supplier.id}
                    className={isArchived ? "bg-muted/30 opacity-75" : undefined}
                  >
                    {/* Supplier Name */}
                    <TableCell>
                      <div className="flex flex-col">
                        <Link
                          to="/suppliers/$supplierId"
                          params={{ supplierId: supplier.id }}
                          className="font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {supplier.name}
                        </Link>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                          {supplier.taxId && <span>{supplier.taxId}</span>}
                          {isArchived && (
                            <Badge
                              variant="outline"
                              className="px-1.5 py-0 text-[10px] text-muted-foreground"
                            >
                              Archived
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    {/* Contact Details */}
                    <TableCell>
                      <div className="text-xs space-y-0.5">
                        {supplier.contactName && (
                          <div className="font-medium text-foreground">{supplier.contactName}</div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[150px]">{supplier.email}</span>
                          </div>
                        )}
                        {supplier.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {!supplier.contactName && !supplier.email && !supplier.phone && (
                          <span className="text-muted-foreground italic">No contact details</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Outstanding Balance */}
                    <TableCell className="text-right tabular-nums whitespace-nowrap">
                      <div className="flex flex-col items-end">
                        <MoneyAmount paise={supplier.outstandingPaise} className="font-medium" />
                        {supplier.overdueAmountPaise > 0 && (
                          <span className="text-[11px] font-medium text-destructive">
                            {formatMoney(supplier.overdueAmountPaise)} overdue
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Open Purchase Orders */}
                    <TableCell className="text-center">
                      {supplier.openPoCount > 0 ? (
                        <Badge variant="secondary" className="px-2 py-0.5 font-medium">
                          {supplier.openPoCount} open
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>

                    {/* Next Expected Payment */}
                    <TableCell>
                      {supplier.nextPaymentDate ? (
                        <div className="flex flex-col text-xs">
                          <DateLabel iso={supplier.nextPaymentDate} />
                          {supplier.nextPaymentAmountPaise !== undefined && (
                            <span className="text-[11px] text-muted-foreground tabular-nums">
                              {formatMoney(supplier.nextPaymentAmountPaise)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* Payment Terms */}
                    <TableCell>
                      <span className="text-xs font-medium text-foreground">
                        Net {supplier.paymentTermsDays}d
                      </span>
                      {supplier.leadTimeDays && (
                        <span className="block text-[11px] text-muted-foreground">
                          {supplier.leadTimeDays}d lead
                        </span>
                      )}
                    </TableCell>

                    {/* Reliability & Risk */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <span
                            className={`inline-block h-2 w-2 rounded-full ${
                              supplier.reliabilityScore >= 85
                                ? "bg-success"
                                : supplier.reliabilityScore >= 75
                                  ? "bg-warning"
                                  : "bg-destructive"
                            }`}
                          />
                          <span className="text-xs font-semibold tabular-nums">
                            {supplier.reliabilityScore}%
                          </span>
                        </div>
                        {supplier.isAtRisk && (
                          <Badge
                            variant="outline"
                            className="border-destructive/30 bg-destructive/10 text-[10px] text-destructive py-0 px-1.5"
                          >
                            At risk
                          </Badge>
                        )}
                      </div>
                    </TableCell>

                    {/* Actions Menu */}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel>Supplier Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link
                              to="/suppliers/$supplierId"
                              params={{ supplierId: supplier.id }}
                            >
                              <ExternalLink className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onEdit(supplier)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {isArchived ? (
                            <DropdownMenuItem onClick={() => onUnarchive(supplier)}>
                              <RefreshCw className="mr-2 h-4 w-4 text-success" />
                              Reactivate Supplier
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => onArchive(supplier)}>
                              <Archive className="mr-2 h-4 w-4 text-warning" />
                              Archive Supplier
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => onDelete(supplier)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Supplier
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
              <div>
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, suppliers.length)} of {suppliers.length} suppliers
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="h-8 px-2.5 text-xs"
                >
                  Previous
                </Button>
                <span className="px-2 text-xs font-medium text-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 px-2.5 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
