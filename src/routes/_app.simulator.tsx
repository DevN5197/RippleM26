import { createFileRoute } from "@tanstack/react-router";
import { FlaskConical } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const Route = createFileRoute("/_app/simulator")({
  head: () => ({
    meta: [
      { title: "Ripple Simulator — Ripple" },
      {
        name: "description",
        content:
          "What-if simulation engine: change one event and watch the impact ripple through your operating cycle.",
      },
      { property: "og:title", content: "Ripple Simulator — Ripple" },
      { property: "og:description", content: "See the impact before it happens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SimulatorPage,
});

function SimulatorPage() {
  return (
    <FeaturePlaceholder
      title="Ripple Simulator"
      description="Change one event and watch the impact ripple through the whole cycle."
      icon={FlaskConical}
      planned={[
        "Pick an event (invoice, order, payment) and apply a change — delay, advance, cancel",
        "Side-by-side baseline vs scenario forecast chart",
        "List of every downstream event affected, with day-level deltas",
        "Save and compare multiple scenarios",
      ]}
    />
  );
}
