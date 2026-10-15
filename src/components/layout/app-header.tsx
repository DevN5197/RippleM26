import { Bell, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api/dashboardApi";
import { getStoredBusiness } from "@/lib/api/authApi";
import { isDemoAccount } from "@/lib/crossPageState";

export function AppHeader() {
  const storedBiz = typeof window !== "undefined" ? getStoredBusiness() : null;
  const isDemo = isDemoAccount(storedBiz);

  const { data: summary } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.getSummary(),
    staleTime: 30_000,
  });

  const alerts = summary?.alerts ?? [];
  const hasAlerts = alerts.length > 0;

  return (
    <header className="glass-surface sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-border/60 px-3 sm:px-5">
      <SidebarTrigger aria-label="Toggle sidebar" className="-ml-1 text-muted-foreground" />
      <Separator orientation="vertical" className="mx-1 h-5" />
      <div className="flex-1" />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Notifications (${alerts.length})`}
            className="relative rounded-full text-muted-foreground hover:text-foreground"
          >
            <Bell
              className={cn(
                "h-4.5 w-4.5 transition-colors",
                hasAlerts && "bell-ring text-destructive",
              )}
            />
            {hasAlerts && (
              <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-destructive ring-2 ring-card" />
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 shadow-elevated">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            <span className="text-[11px] font-mono text-muted-foreground font-normal">
              {alerts.length} alert{alerts.length !== 1 ? "s" : ""}
            </span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {alerts.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground flex flex-col items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="font-medium text-foreground">
                No active alerts for your business yet
              </span>
              <span>All cash balances and invoice schedules are healthy.</span>
            </div>
          ) : (
            alerts.map((alert) => (
              <DropdownMenuItem
                key={alert.id}
                className="flex flex-col items-start gap-0.5 cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-medium text-foreground">{alert.title}</span>
                  <span
                    className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded ${
                      alert.severity === "critical"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-warning/10 text-warning-foreground"
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {alert.description}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
