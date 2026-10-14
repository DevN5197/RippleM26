import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const Route = createFileRoute("/_app/invoices")({
  head: () => ({
    meta: [
      { title: "Invoices & Payments — Ripple" },
      { name: "description", content: "Invoices, payment status and collections timeline." },
      { property: "og:title", content: "Invoices & Payments — Ripple" },
      { property: "og:description", content: "Track invoices and record payments." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InvoicesPage,
});

function InvoicesPage() {
  return (
    <FeaturePlaceholder
      title="Invoices & Payments"
      description="Issue invoices, track status and record payments."
      icon={FileText}
      planned={[
        "Invoice table with status badges, due dates and aging",
        "Create invoices linked to customer orders",
        "Record full or partial payments with automatic status updates",
        "Overdue queue with one-click reminders",
      ]}
    />
  );
}
