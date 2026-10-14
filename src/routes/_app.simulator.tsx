import { createFileRoute, Link } from "@tanstack/react-router";
import { FlaskConical, ArrowLeft, Network, Play, Calendar, AlertTriangle } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SimulatorSearchParams {
  eventId?: string | undefined;
  eventName?: string | undefined;
}

export const Route = createFileRoute("/_app/simulator")({
  validateSearch: (search: Record<string, unknown>): SimulatorSearchParams => ({
    eventId: typeof search["eventId"] === "string" ? search["eventId"] : undefined,
    eventName: typeof search["eventName"] === "string" ? search["eventName"] : undefined,
  }),
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
  const { eventId, eventName } = Route.useSearch();

  return (
    <div className="space-y-6">
      {eventId ? (
        <Card className="border-primary/40 bg-primary/5 shadow-xs">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Active Simulation Target
                </Badge>
                <span className="text-xs text-muted-foreground">ID: {eventId}</span>
              </div>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                <Link to="/relationships">
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Back to Graph
                </Link>
              </Button>
            </div>
            <CardTitle className="text-lg font-bold text-foreground mt-1">
              {eventName || eventId}
            </CardTitle>
            <CardDescription className="text-xs">
              Configure a what-if delay or advance on this event to project the cascading impact on
              your operating cycle and 30-day cash balance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border bg-card p-3 text-xs">
                <span className="font-semibold text-foreground block mb-1">
                  Scenario A: +3 Days
                </span>
                <p className="text-muted-foreground text-[11px] mb-2">
                  Moderate delay in supplier fulfillment
                </p>
                <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1">
                  <Play className="h-3 w-3" /> Run Scenario
                </Button>
              </div>

              <div className="rounded-lg border bg-card p-3 text-xs">
                <span className="font-semibold text-foreground block mb-1">
                  Scenario B: +7 Days
                </span>
                <p className="text-muted-foreground text-[11px] mb-2">
                  Full week delay; shifts customer billing
                </p>
                <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1">
                  <Play className="h-3 w-3" /> Run Scenario
                </Button>
              </div>

              <div className="rounded-lg border bg-card p-3 text-xs">
                <span className="font-semibold text-foreground block mb-1">
                  Scenario C: +14 Days
                </span>
                <p className="text-muted-foreground text-[11px] mb-2">
                  Severe bottleneck; triggers negative cash
                </p>
                <Button size="sm" variant="outline" className="w-full h-7 text-xs gap-1">
                  <Play className="h-3 w-3" /> Run Scenario
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <FeaturePlaceholder
        title="Ripple Simulator Engine"
        description="Change one event and watch the impact ripple through the whole operating cycle."
        icon={FlaskConical}
        planned={[
          "Pick an event (invoice, order, payment) and apply a change — delay, advance, cancel",
          "Side-by-side baseline vs scenario forecast chart with day-level deltas",
          "Calculates exact working capital delta across all downstream dependencies",
          "Export scenario reports for supplier negotiation or credit planning",
        ]}
      />
    </div>
  );
}
