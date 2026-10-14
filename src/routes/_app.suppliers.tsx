import { createFileRoute } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const Route = createFileRoute("/_app/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers — Ripple" },
      {
        name: "description",
        content: "Supplier directory with payment terms, outstanding balances and reliability.",
      },
      { property: "og:title", content: "Suppliers — Ripple" },
      { property: "og:description", content: "Manage suppliers and purchase orders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuppliersPage,
});

function SuppliersPage() {
  return (
    <FeaturePlaceholder
      title="Suppliers"
      description="Every supplier, their terms, and what you owe them."
      icon={Truck}
      planned={[
        "Searchable supplier table with outstanding balances and reliability scores",
        "Create, edit and remove suppliers with validated forms",
        "Purchase order list per supplier with delivery status",
        "Payment terms and upcoming supplier payments",
      ]}
    />
  );
}
