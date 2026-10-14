import { createFileRoute } from "@tanstack/react-router";
import { Waves } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const Route = createFileRoute("/_app/cash-flow")({
  head: () => ({
    meta: [
      { title: "Cash Flow — Ripple" },
      {
        name: "description",
        content: "Detailed cash-flow forecast with inflows, outflows and shortfall warnings.",
      },
      { property: "og:title", content: "Cash Flow — Ripple" },
      { property: "og:description", content: "Projected cash balance and events timeline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CashFlowPage,
});

function CashFlowPage() {
  return (
    <FeaturePlaceholder
      title="Cash Flow"
      description="Your full cash timeline — every inflow and outflow, actual and projected."
      icon={Waves}
      planned={[
        "Day-by-day forecast table with running balance",
        "Date range and forecast period selector",
        "Filter events by type, direction and related entity",
        "Shortfall bands and zero-crossing markers on the chart",
      ]}
    />
  );
}
