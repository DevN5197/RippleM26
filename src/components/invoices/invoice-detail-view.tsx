import React from "react";
import { Link } from "@tanstack/react-router";
import { MetricCard } from "@/components/shared/metric-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { PaymentReliabilityBadge } from "@/components/shared/payment-reliability-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, formatDate } from "@/lib/formatters";
import {
  Wallet,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building,
  CreditCard,
  Package,
} from "lucide-react";
import type { InvoiceDetailData } from "@/types";
import { calculateCustomerPaymentReliability } from "@/lib/reliability";
import { db } from "@/mocks/store";

interface InvoiceDetailViewProps {
  data: InvoiceDetailData;
  onRecordPayment: () => void;
}

export function InvoiceDetailView({ data, onRecordPayment }: InvoiceDetailViewProps) {
  const { invoice, customer, supplier, customerOrder, purchaseOrder, payments } = data;
  const isReceivable = invoice.type === "receivable" || !invoice.type;

  // Calculate customer reliability rating if customer exists
  const customerReliability = customer
    ? calculateCustomerPaymentReliability(customer, db.invoices, db.payments)
    : undefined;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Amount"
          value={formatMoney(invoice.amountPaise)}
          subtext={`Issued on ${formatDate(invoice.issueDate)}`}
          icon={Wallet}
        />

        <MetricCard
          label="Amount Paid"
          value={formatMoney(invoice.amountPaidPaise || 0)}
          subtext={`${payments.length} settlement transaction(s)`}
          icon={CheckCircle2}
          intent="success"
        />

        <MetricCard
          label="Outstanding Balance"
          value={formatMoney(invoice.outstandingPaise)}
          subtext={
            invoice.outstandingPaise === 0
              ? "Fully settled"
              : invoice.isOverdue
                ? `${invoice.daysOverdue} days past due`
                : "Payment pending"
          }
          icon={AlertTriangle}
          intent={
            invoice.outstandingPaise > 0 ? (invoice.isOverdue ? "danger" : "info") : "success"
          }
        />

        <MetricCard
          label="Payment Due Date"
          value={formatDate(invoice.dueDate)}
          subtext={
            invoice.isOverdue ? `Overdue by ${invoice.daysOverdue} days` : "Net terms active"
          }
          icon={Calendar}
          intent={invoice.isOverdue ? "danger" : "default"}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Counterparty Information Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">
                {isReceivable ? "Customer Information" : "Supplier Information"}
              </CardTitle>
            </div>
            <CardDescription>Commercial relationship profile and credit rating</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <span className="text-xs text-muted-foreground block">Counterparty Name</span>
              {isReceivable && customer ? (
                <Link
                  to="/customers/$customerId"
                  params={{ customerId: customer.id }}
                  className="font-semibold text-foreground hover:text-primary hover:underline"
                >
                  {customer.name}
                </Link>
              ) : !isReceivable && supplier ? (
                <Link
                  to="/suppliers/$supplierId"
                  params={{ supplierId: supplier.id }}
                  className="font-semibold text-foreground hover:text-primary hover:underline"
                >
                  {supplier.name}
                </Link>
              ) : (
                <span className="font-semibold">{invoice.counterpartyName}</span>
              )}
            </div>

            {customer && (
              <>
                <div>
                  <span className="text-xs text-muted-foreground block">Primary Contact</span>
                  <span>{customer.contactName || "None assigned"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Email & Phone</span>
                  <span>
                    {customer.email || "No email"} · {customer.phone || "No phone"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Credit Terms</span>
                  <span className="font-medium">Net {customer.creditTermsDays} days</span>
                </div>
                {customerReliability && (
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">
                      Payment Reliability
                    </span>
                    <PaymentReliabilityBadge reliability={customerReliability} size="sm" />
                  </div>
                )}
              </>
            )}

            {supplier && (
              <>
                <div>
                  <span className="text-xs text-muted-foreground block">Primary Contact</span>
                  <span>{supplier.contactName || "None assigned"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Payment Terms</span>
                  <span className="font-medium">Net {supplier.paymentTermsDays} days</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Delivery Reliability</span>
                  <span className="font-medium">{supplier.reliabilityScore}%</span>
                </div>
              </>
            )}

            {invoice.notes && (
              <div className="pt-2 border-t">
                <span className="text-xs text-muted-foreground block">Invoice Notes</span>
                <p className="text-xs text-muted-foreground italic mt-0.5">{invoice.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payments Ledger Card */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">Settlement & Payment Ledger</CardTitle>
              </div>
              <CardDescription>
                Chronological record of settlements applied against this invoice
              </CardDescription>
            </div>
            {invoice.outstandingPaise > 0 && invoice.status !== "void" && (
              <Button size="sm" onClick={onRecordPayment}>
                Record Payment
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <EmptyState
                title="No payments recorded"
                description="This invoice has no settlement records yet."
                icon={CreditCard}
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Payment ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
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
                      <TableCell className="text-right font-medium text-success">
                        {formatMoney(p.amountPaise)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={p.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {/* Linked Order Info if any */}
            {(customerOrder || purchaseOrder) && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Package className="h-3.5 w-3.5" />
                  Linked Commercial Order
                </h4>
                {customerOrder && (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm flex items-center justify-between">
                    <div>
                      <span className="font-medium text-foreground">
                        Customer Order #{customerOrder.id}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        Ordered on {formatDate(customerOrder.orderDate)} · {customerOrder.quantity}{" "}
                        units
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{formatMoney(customerOrder.totalPaise)}</span>
                      <div>
                        <StatusBadge status={customerOrder.status} />
                      </div>
                    </div>
                  </div>
                )}
                {purchaseOrder && (
                  <div className="rounded-md border bg-muted/30 p-3 text-sm flex items-center justify-between">
                    <div>
                      <span className="font-medium text-foreground">
                        Purchase Order {purchaseOrder.poNumber || purchaseOrder.id}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        Ordered on {formatDate(purchaseOrder.orderDate)} · Expected{" "}
                        {formatDate(purchaseOrder.expectedDeliveryDate)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold">{formatMoney(purchaseOrder.totalPaise)}</span>
                      <div>
                        <StatusBadge status={purchaseOrder.status} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
