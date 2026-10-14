import { createFileRoute } from "@tanstack/react-router";
import { Network } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const Route = createFileRoute("/_app/relationships")({
  head: () => ({
    meta: [
      { title: "Relationship Graph — Ripple" },
      {
        name: "description",
        content:
          "Interactive dependency graph connecting suppliers, inventory, orders, invoices and payments.",
      },
      { property: "og:title", content: "Relationship Graph — Ripple" },
      { property: "og:description", content: "See how every business event connects." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RelationshipsPage,
});

function RelationshipsPage() {
  return (
    <FeaturePlaceholder
      title="Relationship Graph"
      description="The interactive dependency map of your operating cycle."
      icon={Network}
      planned={[
        "Interactive graph of suppliers, purchase orders, inventory, invoices and payments",
        "Click any node to inspect its details and downstream impact",
        "Highlight critical paths that lead to cash shortfalls",
        "Filter by entity type and time window",
      ]}
    />
  );
}
