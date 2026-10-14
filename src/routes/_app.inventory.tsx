import { createFileRoute } from "@tanstack/react-router";
import { Package } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const Route = createFileRoute("/_app/inventory")({
  head: () => ({
    meta: [
      { title: "Inventory — Ripple" },
      { name: "description", content: "Stock levels, reorder points and incoming replenishment." },
      { property: "og:title", content: "Inventory — Ripple" },
      { property: "og:description", content: "Stock levels and reorder tracking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InventoryPage,
});

function InventoryPage() {
  return (
    <FeaturePlaceholder
      title="Inventory"
      description="Stock levels, reorder points and incoming purchase orders."
      icon={Package}
      planned={[
        "Stock table with on-hand, on-order and reorder-point status",
        "Low-stock and stockout-risk badges tied to upcoming sales",
        "Adjust quantities and create purchase orders",
        "Expected restock dates linked to supplier deliveries",
      ]}
    />
  );
}
