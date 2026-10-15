import React from "react";
import { Link } from "@tanstack/react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatMoney, formatDate } from "@/lib/formatters";
import {
  FileText,
  ShoppingBag,
  CreditCard,
  Building,
  Eye,
  AlertCircle,
  PlusCircle,
  Bell,
} from "lucide-react";
import type { CustomerDetailData, Invoice } from "@/types";

interface CustomerDetailTabsProps {
  data: CustomerDetailData;
  onRecordPayment: (invoice: Invoice) => void;
  onSendReminder: (invoice: Invoice) => void;
  onCreateInvoice: () => void;
}

export function CustomerDetailTabs({
  data,
  onRecordPayment,
  onSendReminder,
  onCreateInvoice,
}: CustomerDetailTabsProps) {
  const { customer, invoices, orders, payments } = data;
  const todayStr = new Date().toISOString().slice(0, 10);

  return (
    <Tabs defaultValue="invoices" className="space-y-4">
      <TabsList className="grid w-full grid-cols-4 lg:w-[480px]">
        <TabsTrigger value="invoices" className="gap-1.5">
          <FileText className="h-4 w-4" />
          Invoices ({invoices.length})
        </TabsTrigger>
        <TabsTrigger value="orders" className="gap-1.5">
          <ShoppingBag className="h-4 w-4" />
          Orders ({orders.length})
        </TabsTrigger>
        <TabsTrigger value="payments" className="gap-1.5">
          <CreditCard className="h-4 w-4" />
          Payments ({payments.length})
        </TabsTrigger>
        <TabsTrigger value="profile" className="gap-1.5">
          <Building className="h-4 w-4" />
          Profile
        </TabsTrigger>
      </TabsList>

      {/* Invoices Tab */}
      <TabsContent value="invoices" className="space-y-4">
        <div className="rounded-lg border bg-card">
          {invoices.length === 0 ? (
            <EmptyState
              title="No invoices issued"
              description="No accounts receivable invoices have been issued to this customer."
              icon={FileText}
              action={
                <Button size="sm" onClick={onCreateInvoice}>
                  <PlusCircle className="mr-1.5 h-3.5 w-3.5" />
                  Create First Invoice
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance Due</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const balancePaise = Math.max(0, inv.amountPaise - (inv.amountPaidPaise || 0));
                  const isOverdue =
                    balancePaise > 0 &&
                    inv.status !== "void" &&
                    (inv.status === "overdue" || inv.dueDate < todayStr);

                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/invoices/$invoiceId"
                          params={{ invoiceId: inv.id }}
                          className="text-foreground hover:text-primary hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={isOverdue ? "overdue" : inv.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatDate(inv.issueDate)}
                      </TableCell>
                      <TableCell
                        className={
                          isOverdue ? "font-medium text-destructive" : "text-muted-foreground"
                        }
                      >
                        {formatDate(inv.dueDate)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatMoney(inv.amountPaise)}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600 dark:text-emerald-400">
                        {formatMoney(inv.amountPaidPaise || 0)}
                      </TableCell>
                      <TableCell
                        className={`text-right font-semibold ${
                          isOverdue ? "text-destructive" : ""
                        }`}
                      >
                        {formatMoney(balancePaise)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isOverdue && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs text-amber-700 hover:text-amber-800 dark:text-amber-400"
                              onClick={() => onSendReminder(inv)}
                              title="Reminder Preview"
                            >
                              <Bell className="mr-1 h-3.5 w-3.5" />
                              Reminder
                            </Button>
                          )}
                          {balancePaise > 0 && inv.status !== "void" && (
                            <Button
                              variant="default"
                              size="sm"
                              className="h-8 text-xs"
                              onClick={() => onRecordPayment(inv)}
                            >
                              Pay
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
                            <Link to="/invoices/$invoiceId" params={{ invoiceId: inv.id }}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </TabsContent>

      {/* Orders Tab */}
      <TabsContent value="orders" className="space-y-4">
        <div className="rounded-lg border bg-card">
          {orders.length === 0 ? (
            <EmptyState
              title="No customer orders"
              description="No sales orders have been placed by this customer."
              icon={ShoppingBag}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Delivery Date</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead className="text-right">Total Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((ord) => (
                  <TableRow key={ord.id}>
                    <TableCell className="font-medium">{ord.id}</TableCell>
                    <TableCell>{formatDate(ord.orderDate)}</TableCell>
                    <TableCell>{ord.deliveryDate ? formatDate(ord.deliveryDate) : "TBD"}</TableCell>
                    <TableCell>{ord.quantity} units</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(ord.totalPaise)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={ord.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </TabsContent>

      {/* Payments Tab */}
      <TabsContent value="payments" className="space-y-4">
        <div className="rounded-lg border bg-card">
          {payments.length === 0 ? (
            <EmptyState
              title="No payment history"
              description="No incoming payments have been recorded for this customer yet."
              icon={CreditCard}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Linked Invoice</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id}</TableCell>
                    <TableCell>
                      {p.completedDate
                        ? formatDate(p.completedDate)
                        : p.scheduledDate
                          ? formatDate(p.scheduledDate)
                          : "—"}
                    </TableCell>
                    <TableCell>{p.method || "Bank Transfer"}</TableCell>
                    <TableCell>
                      {p.invoiceId ? (
                        <Link
                          to="/invoices/$invoiceId"
                          params={{ invoiceId: p.invoiceId }}
                          className="font-medium text-foreground hover:underline"
                        >
                          {p.invoiceId}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                      +{formatMoney(p.amountPaise)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </TabsContent>

      {/* Profile Tab */}
      <TabsContent value="profile" className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Billing & Tax Credentials</CardTitle>
              <CardDescription>Verified counterparty commercial identification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">GSTIN / Tax ID</span>
                <span className="font-mono font-medium">{customer.taxId || "Not provided"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Billing Address</span>
                <span>{customer.address || "No address on file"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Standard Credit Terms</span>
                <span className="font-medium">Net {customer.creditTermsDays} days</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact & Account Notes</CardTitle>
              <CardDescription>Primary account representative and operational memo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">Primary Contact</span>
                <span className="font-medium">{customer.contactName || "None assigned"}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Email & Phone</span>
                <span>
                  {customer.email || "No email"} · {customer.phone || "No phone"}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Internal Notes</span>
                <p className="text-muted-foreground italic">
                  {customer.notes || "No additional notes recorded for this customer."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
