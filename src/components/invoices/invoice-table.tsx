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
import { Badge } from "@/components/ui/badge";
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
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney, formatDate } from "@/lib/formatters";
import {
  Search,
  MoreHorizontal,
  Eye,
  CreditCard,
  Bell,
  Ban,
  FileText,
  ArrowDownLeft,
  ArrowUpRight,
} from "lucide-react";
import type { EnrichedInvoice, AgingBucket } from "@/types";

interface InvoiceTableProps {
  invoices: EnrichedInvoice[];
  search: string;
  onSearchChange: (val: string) => void;
  typeFilter: "all" | "receivable" | "payable";
  onTypeFilterChange: (val: "all" | "receivable" | "payable") => void;
  statusFilter: "all" | "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled";
  onStatusFilterChange: (
    val: "all" | "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled",
  ) => void;
  agingFilter: "all" | AgingBucket;
  onAgingFilterChange: (val: "all" | AgingBucket) => void;
  sortBy: "dueDate" | "amount" | "status" | "invoiceNumber" | "overdue";
  onSortByChange: (val: "dueDate" | "amount" | "status" | "invoiceNumber" | "overdue") => void;
  onRecordPayment: (invoice: EnrichedInvoice) => void;
  onSendReminder: (invoice: EnrichedInvoice) => void;
  onCancelInvoice: (invoice: EnrichedInvoice) => void;
}

export function InvoiceTable({
  invoices,
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  agingFilter,
  onAgingFilterChange,
  sortBy,
  onSortByChange,
  onRecordPayment,
  onSendReminder,
  onCancelInvoice,
}: InvoiceTableProps) {
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

  const getAgingBadge = (bucket: AgingBucket, days: number) => {
    switch (bucket) {
      case "1_7":
        return (
          <Badge
            variant="outline"
            className="border-amber-300 bg-amber-50 text-amber-800 text-[10px] dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300"
          >
            1–7d overdue ({days}d)
          </Badge>
        );
      case "8_30":
        return (
          <Badge
            variant="outline"
            className="border-orange-300 bg-orange-50 text-orange-800 text-[10px] dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-300"
          >
            8–30d overdue ({days}d)
          </Badge>
        );
      case "31_60":
        return (
          <Badge
            variant="outline"
            className="border-rose-300 bg-rose-50 text-rose-800 text-[10px] dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300"
          >
            31–60d overdue ({days}d)
          </Badge>
        );
      case "over_60":
        return (
          <Badge
            variant="outline"
            className="border-rose-400 bg-rose-100 text-rose-900 font-bold text-[10px] dark:border-rose-900 dark:bg-rose-900/60 dark:text-rose-200"
          >
            60+d overdue ({days}d)
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by invoice #, counterparty..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Type Filter */}
          <Select
            value={typeFilter}
            onValueChange={(val) => onTypeFilterChange(val as "all" | "receivable" | "payable")}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Invoices</SelectItem>
              <SelectItem value="receivable">Receivables</SelectItem>
              <SelectItem value="payable">Payables</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={statusFilter}
            onValueChange={(val) =>
              onStatusFilterChange(
                val as "all" | "unpaid" | "partially_paid" | "paid" | "overdue" | "cancelled",
              )
            }
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partially_paid">Partially Paid</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>

          {/* Aging Filter */}
          <Select
            value={agingFilter}
            onValueChange={(val) => onAgingFilterChange(val as "all" | AgingBucket)}
          >
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="Aging" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Aging</SelectItem>
              <SelectItem value="1_7">1–7 Days</SelectItem>
              <SelectItem value="8_30">8–30 Days</SelectItem>
              <SelectItem value="31_60">31–60 Days</SelectItem>
              <SelectItem value="over_60">Over 60 Days</SelectItem>
            </SelectContent>
          </Select>

          {/* Sort By */}
          <Select
            value={sortBy}
            onValueChange={(val) =>
              onSortByChange(val as "dueDate" | "amount" | "status" | "invoiceNumber" | "overdue")
            }
          >
            <SelectTrigger className="w-[145px] h-9">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dueDate">Due Date</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="overdue">Days Overdue</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="invoiceNumber">Invoice #</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        {invoices.length === 0 ? (
          <EmptyState
            title="No invoices found"
            description="No invoices match your current search and filter parameters."
            icon={FileText}
            action={
              search || typeFilter !== "all" || statusFilter !== "all" || agingFilter !== "all" ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onSearchChange("");
                    onTypeFilterChange("all");
                    onStatusFilterChange("all");
                    onAgingFilterChange("all");
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
                <TableHead>Invoice #</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Counterparty</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead className="text-right">Outstanding</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[120px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => {
                const isReceivable = inv.type === "receivable" || !inv.type;

                return (
                  <TableRow key={inv.id}>
                    {/* Invoice Number */}
                    <TableCell>
                      <Link
                        to="/invoices/$invoiceId"
                        params={{ invoiceId: inv.id }}
                        className="font-medium text-foreground hover:text-primary hover:underline"
                      >
                        {inv.invoiceNumber}
                      </Link>
                    </TableCell>

                    {/* Type Badge */}
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={`text-[11px] gap-1 font-medium ${
                          isReceivable
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300"
                            : "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300"
                        }`}
                      >
                        {isReceivable ? (
                          <>
                            <ArrowDownLeft className="h-3 w-3" />
                            Receivable
                          </>
                        ) : (
                          <>
                            <ArrowUpRight className="h-3 w-3" />
                            Payable
                          </>
                        )}
                      </Badge>
                    </TableCell>

                    {/* Counterparty */}
                    <TableCell>
                      {isReceivable && inv.customerId ? (
                        <Link
                          to="/customers/$customerId"
                          params={{ customerId: inv.customerId }}
                          className="font-medium text-foreground hover:underline"
                        >
                          {inv.counterpartyName}
                        </Link>
                      ) : !isReceivable && inv.supplierId ? (
                        <Link
                          to="/suppliers/$supplierId"
                          params={{ supplierId: inv.supplierId }}
                          className="font-medium text-foreground hover:underline"
                        >
                          {inv.counterpartyName}
                        </Link>
                      ) : (
                        <span>{inv.counterpartyName}</span>
                      )}
                    </TableCell>

                    {/* Due Date & Aging */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`text-sm ${
                            inv.isOverdue
                              ? "font-semibold text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {formatDate(inv.dueDate)}
                        </span>
                        {inv.isOverdue && getAgingBadge(inv.agingBucket, inv.daysOverdue)}
                      </div>
                    </TableCell>

                    {/* Total Amount */}
                    <TableCell className="text-right font-medium">
                      {formatMoney(inv.amountPaise)}
                    </TableCell>

                    {/* Paid Amount */}
                    <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                      {formatMoney(inv.amountPaidPaise || 0)}
                    </TableCell>

                    {/* Outstanding Balance */}
                    <TableCell
                      className={`text-right font-bold ${
                        inv.isOverdue ? "text-destructive" : "text-foreground"
                      }`}
                    >
                      {formatMoney(inv.outstandingPaise)}
                    </TableCell>

                    {/* Status */}
                    <TableCell>
                      <StatusBadge status={inv.status} />
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {inv.isOverdue && isReceivable && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 px-2 text-xs text-amber-700 hover:text-amber-800 dark:text-amber-400"
                            onClick={() => onSendReminder(inv)}
                            title="Preview Overdue Reminder"
                          >
                            <Bell className="h-3.5 w-3.5" />
                          </Button>
                        )}

                        {inv.outstandingPaise > 0 && inv.status !== "void" && (
                          <Button
                            variant="default"
                            size="sm"
                            className="h-8 px-2.5 text-xs"
                            onClick={() => onRecordPayment(inv)}
                          >
                            Pay
                          </Button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Actions</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link
                                to="/invoices/$invoiceId"
                                params={{ invoiceId: inv.id }}
                                target="_blank"
                                rel="noreferrer"
                                className="cursor-pointer"
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </Link>
                            </DropdownMenuItem>

                            {inv.outstandingPaise > 0 && inv.status !== "void" && (
                              <DropdownMenuItem
                                onClick={() => onRecordPayment(inv)}
                                className="cursor-pointer"
                              >
                                <CreditCard className="mr-2 h-4 w-4" />
                                Record Payment
                              </DropdownMenuItem>
                            )}

                            {inv.isOverdue && (
                              <DropdownMenuItem
                                onClick={() => onSendReminder(inv)}
                                className="cursor-pointer"
                              >
                                <Bell className="mr-2 h-4 w-4 text-amber-600" />
                                Reminder Notice
                              </DropdownMenuItem>
                            )}

                            {inv.status !== "void" && inv.status !== "paid" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => onCancelInvoice(inv)}
                                  className="cursor-pointer text-destructive focus:text-destructive"
                                >
                                  <Ban className="mr-2 h-4 w-4" />
                                  Cancel Invoice
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
