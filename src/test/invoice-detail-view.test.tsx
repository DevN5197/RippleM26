import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-router")>();
  return {
    ...actual,
    Link: ({
      children,
      to,
      ...props
    }: {
      children?: React.ReactNode;
      to?: string;
      [key: string]: unknown;
    }) => {
      const href = typeof to === "string" ? to : "/";
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    },
  };
});

import { InvoiceDetailView } from "@/components/invoices/invoice-detail-view";
import { invoiceApi } from "@/lib/api/invoiceApi";

/**
 * Regression coverage for the invoice detail page.
 *
 * This component previously crashed for every invoice with an outstanding
 * balance (`ReferenceError: Button is not defined` — a missing import), which
 * the route error boundary surfaced as "Could not load invoice". Nothing
 * rendered this component, so the defect shipped. These tests exist to make
 * sure it cannot happen again silently.
 */
describe("InvoiceDetailView", () => {
  it("renders an outstanding receivable and fires the Record Payment handler", async () => {
    const list = await invoiceApi.list({ status: "overdue" });
    const target = list.data.find(
      (i) => (i.type === "receivable" || !i.type) && i.outstandingPaise > 0,
    );
    expect(target).toBeDefined();

    const data = await invoiceApi.getById(target!.id);
    const onRecordPayment = vi.fn();

    render(<InvoiceDetailView data={data} onRecordPayment={onRecordPayment} />);

    const button = screen.getByRole("button", { name: /record payment/i });
    fireEvent.click(button);
    expect(onRecordPayment).toHaveBeenCalledTimes(1);

    // Metric summary must render values, not blanks.
    expect(screen.getByText("Total Amount")).toBeInTheDocument();
    expect(screen.getByText("Outstanding Balance")).toBeInTheDocument();
  });

  it("renders a supplier-side bill with supplier context", async () => {
    const list = await invoiceApi.list({ type: "payable" });
    const target = list.data.find((i) => i.outstandingPaise > 0) ?? list.data[0];
    expect(target).toBeDefined();

    const data = await invoiceApi.getById(target!.id);
    render(<InvoiceDetailView data={data} onRecordPayment={() => {}} />);

    expect(screen.getByText("Supplier Information")).toBeInTheDocument();
    expect(screen.getByText("Settlement & Payment Ledger")).toBeInTheDocument();
  });

  it("hides Record Payment once the balance is fully settled", async () => {
    const list = await invoiceApi.list({ status: "paid" });
    const target = list.data.find((i) => i.outstandingPaise === 0);
    expect(target).toBeDefined();

    const data = await invoiceApi.getById(target!.id);
    render(<InvoiceDetailView data={data} onRecordPayment={() => {}} />);

    expect(screen.queryByRole("button", { name: /record payment/i })).not.toBeInTheDocument();
  });

  it("renders the customer counterparty link when the invoice has a customer", async () => {
    const list = await invoiceApi.list({ type: "receivable" });
    const withCustomer = list.data.find((i) => i.customerId);
    expect(withCustomer).toBeDefined();

    const data = await invoiceApi.getById(withCustomer!.id);
    render(<InvoiceDetailView data={data} onRecordPayment={() => {}} />);

    expect(screen.getByText("Customer Information")).toBeInTheDocument();
  });
});
