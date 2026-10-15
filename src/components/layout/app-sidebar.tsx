import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Network,
  Waves,
  FlaskConical,
  Package,
  Truck,
  Users,
  FileText,
  Sparkles,
  Settings,
  ChevronsUpDown,
  LogOut,
  CircleUserRound,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const navGroups = [
  {
    label: "Cash & Planning",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
      { title: "Cash Flow", url: "/cash-flow", icon: Waves },
      { title: "Ripple Simulator", url: "/simulator", icon: FlaskConical },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Invoices", url: "/invoices", icon: FileText },
      { title: "Customers", url: "/customers", icon: Users },
      { title: "Suppliers", url: "/suppliers", icon: Truck },
      { title: "Inventory", url: "/inventory", icon: Package },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { title: "Relationships", url: "/relationships", icon: Network },
      { title: "Insights & AI", url: "/insights", icon: Sparkles },
    ],
  },
];

import { authApi, getStoredUser, getStoredBusiness } from "@/lib/api/authApi";
import { useQuery } from "@tanstack/react-query";
import { settingsApi } from "@/lib/api/settingsApi";

export function AppSidebar() {
  const { state, isMobile, setOpenMobile } = useSidebar();
  const collapsed = state === "collapsed" && !isMobile;
  const currentPath = useRouterState({ select: (r) => r.location.pathname });

  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.getSettings(),
  });

  const storedUser = getStoredUser();
  const storedBiz = getStoredBusiness();

  const businessName = storedBiz?.name || settings?.business?.name || "Rupi Clothing";
  const userFullName = storedUser?.fullName || settings?.business?.ownerName || "Demo Owner";
  const userEmail = storedUser?.email || settings?.business?.ownerEmail || "owner@rupiclothing.in";

  const isActive = (path: string) => currentPath === path;

  return (
    <Sidebar collapsible="icon" className="border-sidebar-border/60">
      <SidebarHeader className={cn("gap-3 pt-5 pb-2.5", collapsed ? "items-center px-2" : "px-4")}>
        <Link
          to="/dashboard"
          preload="intent"
          className={cn(
            "flex items-center rounded-lg transition-opacity hover:opacity-90",
            collapsed ? "w-9 justify-center" : "gap-3",
          )}
          aria-label="Ripple home"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary shadow-glow">
            <Waves className="h-[1.15rem] w-[1.15rem] text-primary-foreground" aria-hidden />
          </span>
          {!collapsed && (
            <span className="flex min-w-0 flex-col">
              <span className="text-[15px] leading-tight font-semibold tracking-[-0.01em] text-sidebar-foreground">
                Ripple
              </span>
              <span className="truncate text-[11px] tracking-wide text-muted-foreground">
                Financial coordination platform
              </span>
            </span>
          )}
        </Link>

        {!collapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex w-full items-center justify-between gap-2.5 rounded-xl border border-border/70 bg-card/70 px-3 py-2.5 text-left transition-colors hover:border-primary/30 hover:bg-accent cursor-pointer"
                aria-label="Select business"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-medium text-foreground">
                    {businessName}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {settings?.business?.industry || "Apparel retail"} ·{" "}
                    {settings?.business?.currency || "INR"}
                  </span>
                </span>
                <ChevronsUpDown
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 shadow-elevated">
              <DropdownMenuLabel>Businesses</DropdownMenuLabel>
              <DropdownMenuItem>
                {businessName}
                <Badge variant="secondary" className="ml-auto">
                  Current
                </Badge>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/register">Register another business</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </SidebarHeader>

      <SidebarContent className="gap-1 px-2.5">
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            {!collapsed && (
              <SidebarGroupLabel className="h-auto px-2.5 py-1.5 text-[10px] font-semibold tracking-[0.1em] text-muted-foreground/80 uppercase">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      onClick={() => setOpenMobile(false)}
                      className="h-9.5 rounded-lg text-[13.5px] font-medium px-3"
                    >
                      <Link to={item.url} preload="intent">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <SidebarGroup className="pt-1">
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/settings")}
                  tooltip="Settings"
                  className="h-9.5 rounded-lg text-[13.5px] font-medium px-3"
                >
                  <Link to="/settings" preload="intent">
                    <Settings className="h-4 w-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className={cn("pb-4", collapsed ? "items-center px-2" : "px-3.5")}>
        <Separator className="mb-2" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2.5 rounded-xl py-2 text-left transition-colors hover:bg-sidebar-accent cursor-pointer",
                collapsed ? "w-9 justify-center px-0" : "w-full px-2.5",
              )}
              aria-label="User menu"
            >
              <CircleUserRound className="h-7 w-7 shrink-0 text-muted-foreground" aria-hidden />
              {!collapsed && (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-[13px] font-medium text-sidebar-foreground">
                    {userFullName}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">{userEmail}</span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-64 shadow-elevated">
            <DropdownMenuLabel>{userFullName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => authApi.logout()}
              className="cursor-pointer text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
