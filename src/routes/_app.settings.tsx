import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { settingsApi } from "@/lib/api/settingsApi";
import { BusinessProfileSection } from "@/components/settings/business-profile-section";
import { FinancialPreferencesSection } from "@/components/settings/financial-preferences-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { DataPrivacySection } from "@/components/settings/data-privacy-section";
import { AppSettingsSection } from "@/components/settings/app-settings-section";
import type { AppSettings, UpdateSettingsInput } from "@/types";

const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: () => settingsApi.getSettings(),
});

export const Route = createFileRoute("/_app/settings")({
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery),
  head: () => ({
    meta: [
      { title: "Settings — Ripple" },
      {
        name: "description",
        content: "Business profile, financial preferences, alerts, and system configuration.",
      },
      { property: "og:title", content: "Settings — Ripple" },
      { property: "og:description", content: "Configure your Ripple workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SettingsPage,
  errorComponent: ({ error, reset }) => (
    <ErrorState
      title="Could not load settings"
      message={error instanceof Error ? error.message : "Failed to load application settings."}
      onRetry={reset}
    />
  ),
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings } = useSuspenseQuery(settingsQuery);

  const updateMutation = useMutation({
    mutationFn: (input: UpdateSettingsInput) => settingsApi.updateSettings(input),
    onSuccess: (updated: AppSettings) => {
      queryClient.setQueryData(["settings"], updated);
      // Invalidate dependent queries so dashboard forecasts and thresholds update synchronously
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["forecast"] });
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Settings updated successfully.");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to update settings.");
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => settingsApi.resetDemoData(),
    onSuccess: (res) => {
      // Invalidate all queries across the entire app
      queryClient.invalidateQueries();
      toast.success(res.message);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to reset demo data.");
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your business profile, liquidity alerts, notification rules, and workspace preferences."
      />

      <Tabs defaultValue="financial" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto p-1 gap-1">
          <TabsTrigger value="financial" className="py-2 text-xs sm:text-sm">
            Cash & Thresholds
          </TabsTrigger>
          <TabsTrigger value="notifications" className="py-2 text-xs sm:text-sm">
            Notifications
          </TabsTrigger>
          <TabsTrigger value="data-privacy" className="py-2 text-xs sm:text-sm">
            Reset Demo Data
          </TabsTrigger>
          <TabsTrigger value="business" className="py-2 text-xs sm:text-sm">
            Business Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business" className="space-y-4">
          <BusinessProfileSection
            business={settings.business}
            onSave={async (businessData) => {
              await updateMutation.mutateAsync({ business: businessData });
            }}
            isSaving={updateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <FinancialPreferencesSection
            business={settings.business}
            onSave={async (financialData) => {
              await updateMutation.mutateAsync({ business: financialData });
            }}
            isSaving={updateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationsSection
            notifications={settings.notifications}
            onSave={async (notificationsData) => {
              await updateMutation.mutateAsync({ notifications: notificationsData });
            }}
            isSaving={updateMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="data-privacy" className="space-y-4">
          <DataPrivacySection
            business={settings.business}
            dataMode={settings.dataMode}
            onResetDemoData={async () => {
              await resetMutation.mutateAsync();
            }}
            isResetting={resetMutation.isPending}
          />
        </TabsContent>

        <TabsContent value="app" className="space-y-4">
          <AppSettingsSection
            appPreferences={settings.app}
            onSave={async (appData) => {
              await updateMutation.mutateAsync({ app: appData });
            }}
            isSaving={updateMutation.isPending}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
