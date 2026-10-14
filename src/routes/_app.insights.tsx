import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const Route = createFileRoute("/_app/insights")({
  head: () => ({
    meta: [
      { title: "Insights & AI — Ripple" },
      { name: "description", content: "AI-generated recommendations to protect your cash position." },
      { property: "og:title", content: "Insights & AI — Ripple" },
      { property: "og:description", content: "Recommendations ranked by cash impact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  return (
    <FeaturePlaceholder
      title="Insights & AI"
      description="Recommendations that protect your cash position, ranked by impact."
      icon={Sparkles}
      planned={[
        "Ranked recommendation feed with quantified cash impact",
        "Natural-language explanations of forecast changes",
        "One-click 'simulate this' handoff into the Ripple Simulator",
        "Acknowledge, dismiss and track acted-on advice",
      ]}
    />
  );
}
