import { useEffect, Suspense } from "react";
import { Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { settingsApi } from "@/lib/api/settingsApi";
import { applyTheme, applyCompactTables } from "@/lib/theme";
import { isUserAuthenticated } from "@/lib/api/authApi";

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    // Check if access_token exists in localStorage and session is valid.
    // If token is missing or expired, redirect to /login immediately.
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (!token || !isUserAuthenticated()) {
        throw redirect({ to: "/login" });
      }
    }
  },
  component: AppLayout,
});

function AppLayout() {
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.getSettings(),
  });

  useEffect(() => {
    if (settings?.app) {
      applyTheme(settings.app.theme);
      applyCompactTables(settings.app.compactTables);
    }
  }, [settings?.app]);

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-8">
            <div className="mx-auto w-full max-w-[1600px]">
              <Suspense
                fallback={
                  <div className="flex h-64 w-full items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                }
              >
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
