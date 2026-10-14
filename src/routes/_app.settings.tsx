import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Ripple" },
      { name: "description", content: "Business profile, currency and workspace preferences." },
      { property: "og:title", content: "Settings — Ripple" },
      { property: "og:description", content: "Configure your Ripple workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  return (
    <FeaturePlaceholder
      title="Settings"
      description="Business profile, currency and workspace preferences."
      icon={Settings}
      planned={[
        "Business profile and currency configuration (INR default)",
        "Switch between demo data and the live backend",
        "Notification preferences for risk alerts",
        "Team members and access control",
      ]}
    />
  );
}
