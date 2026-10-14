import { createFileRoute } from "@tanstack/react-router";
import { Users } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const Route = createFileRoute("/_app/customers")({
  head: () => ({
    meta: [
      { title: "Customers — Ripple" },
      { name: "description", content: "Customer directory with credit terms and outstanding receivables." },
      { property: "og:title", content: "Customers — Ripple" },
      { property: "og:description", content: "Manage customers and their balances." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  return (
    <FeaturePlaceholder
      title="Customers"
      description="Every customer, their credit terms, and what they owe you."
      icon={Users}
      planned={[
        "Searchable customer table with outstanding receivables",
        "Create, edit and remove customers with validated forms",
        "Order history and payment behaviour per customer",
        "Overdue indicators and reminder actions",
      ]}
    />
  );
}
