import React from "react";
import { Link } from "@tanstack/react-router";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaymentReliabilityBadge } from "@/components/shared/payment-reliability-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney } from "@/lib/formatters";
import {
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Archive,
  RotateCcw,
  Users,
  AlertCircle,
} from "lucide-react";
import type { EnrichedCustomer } from "@/types";

interface CustomerTableProps {
  customers: EnrichedCustomer[];
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: "all" | "active" | "archived";
  onStatusFilterChange: (val: "all" | "active" | "archived") => void;
  overdueFilter: "all" | "has_overdue" | "healthy";
  onOverdueFilterChange: (val: "all" | "has_overdue" | "healthy") => void;
  sortBy: "name" | "outstanding" | "reliability";
  onSortByChange: (val: "name" | "outstanding" | "reliability") => void;
  onEdit: (customer: EnrichedCustomer) => void;
  onArchiveToggle: (customer: EnrichedCustomer) => void;
}

export function CustomerTable({
  customers,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  overdueFilter,
  onOverdueFilterChange,
  sortBy,
  onSortByChange,
  onEdit,
  onArchiveToggle,
}: CustomerTableProps) {
  const [localSearch, setLocalSearch] = React.useState(search);

  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 200);
    return () => clearTimeout(handler);
  }, [localSearch, search, onSearchChange]);

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search customers, contacts, tax ID..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) => onStatusFilterChange(val as "all" | "active" | "archived")}
          >
            <SelectTrigger className="w-[130px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          {/* Overdue Filter */}
          <Select
            value={overdueFilter}
            onValueChange={(val) => onOverdueFilterChange(val as "all" | "has_overdue" | "healthy")}
          >
            <SelectTrigger className="w-[145px] h-9">
              <SelectValue placeholder="Overdue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Balances</SelectItem>
              <SelectItem value="has_overdue">Has Overdue</SelectItem>
              <SelectItem value="healthy">No Overdue</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select
            value={sortBy}
            onValueChange={(val) => onSortByChange(val as "name" | "outstanding" | "reliability")}
          >
            <SelectTrigger className="w-[155px] h-9">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A-Z)</SelectItem>
              <SelectItem value="outstanding">Outstanding (High)</SelectItem>
              <SelectItem value="reliability">Reliability Score</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        {customers.length === 0 ? (
          <EmptyState
            title="No customers found"
            description="Try adjusting your search criteria or filter options."
            icon={Users}
            action={
              search || statusFilter !== "all" || overdueFilter !== "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSearchChange("");
                    onStatusFilterChange("all");
                    onOverdueFilterChange("all");
                  }}
                >
                  Reset filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Credit Terms</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead className="text-right">Overdue Balance</TableHead>
                <TableHead>Payment Reliability</TableHead>
                <TableHead className="w-[70px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <Link
                        to="/customers/$customerId"
                        params={{ customerId: customer.id }}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {customer.name}
                      </Link>
                      <span className="text-xs text-muted-foreground">
                        {customer.contactName || "No contact"} · {customer.email || "No email"}
                      </span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <StatusBadge status={customer.status} />
                  </TableCell>

                  <TableCell>
                    <span className="text-sm font-medium">Net {customer.creditTermsDays}</span>
                  </TableCell>

                  <TableCell className="text-right font-medium">
                    {formatMoney(customer.calculatedOutstandingPaise)}
                  </TableCell>

                  <TableCell className="text-right">
                    {customer.overdueAmountPaise > 0 ? (
                      <div className="flex items-center justify-end gap-1 font-medium text-destructive">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{formatMoney(customer.overdueAmountPaise)}</span>
                        <span className="text-xs text-muted-foreground">
                          ({customer.overdueInvoicesCount})
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <PaymentReliabilityBadge reliability={customer.reliability} size="sm" />
                  </TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link
                            to="/customers/$customerId"
                            params={{ customerId: customer.id }}
                            className="flex items-center cursor-pointer"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Profile
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onEdit(customer)}
                          className="cursor-pointer"
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onArchiveToggle(customer)}
                          className="cursor-pointer"
                        >
                          {customer.status === "archived" ? (
                            <>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Reactivate Customer
                            </>
                          ) : (
                            <>
                              <Archive className="mr-2 h-4 w-4 text-amber-600" />
                              Archive Customer
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
