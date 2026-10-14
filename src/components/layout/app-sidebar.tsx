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
import { IS_DEMO } from "@/lib/config";

const navGroups = [
  {
    label: "Cash & Planning",
    items: [
      { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
      { title: "Cash Flow", url: "/cash-flow", icon: Waves },
      { title: "Ripple Simulator", url: "/simulator", icon: FlaskConical },
    ],
  },
  {
    label: "Operations",
    items: [
      { title: "Invoices & Bills", url: "/invoices", icon: FileText },
      { title: "Customers", url: "/customers", icon: Users },
      { title: "Suppliers", url: "/suppliers", icon: Truck },
      { title: "Inventory", url: "/inventory", icon: Package },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { title: "Relationship Map", url: "/relationships", icon: Network },
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
    <Sidebar collapsible="icon">
      <SidebarHeader className={cn("gap-3 pt-4", collapsed ? "px-2 items-center" : "px-3")}>
        <Link
          to="/dashboard"
          preload="intent"
          className={cn("flex items-center", collapsed ? "w-8 justify-center" : "gap-2.5")}
          aria-label="Ripple home"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary">
            <Waves className="h-4.5 w-4.5 text-primary-foreground" aria-hidden />
          </span>
          {!collapsed && (
            <span className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
                Ripple
              </span>
              <span className="text-[10px] leading-tight text-muted-foreground">
                Financial coordination platform
              </span>
            </span>
          )}
        </Link>

        {!collapsed && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex w-full items-center justify-between rounded-md border bg-card px-2.5 py-2 text-left text-sm hover:bg-accent"
                aria-label="Select business"
              >
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium text-foreground">{businessName}</span>
                  <span className="text-[11px] text-muted-foreground">{settings?.business?.industry || "Apparel retail"} · {settings?.business?.currency || "INR"}</span>
                </span>
                <ChevronsUpDown
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
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

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label} className="py-1">
            {!collapsed && (
              <SidebarGroupLabel className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase px-3 py-1">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      onClick={() => setOpenMobile(false)}
                      className="text-xs h-8"
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

        <SidebarGroup className="pt-2">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={isActive("/settings")} tooltip="Settings" className="text-xs h-8">
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

      <SidebarFooter className={cn("pb-4", collapsed ? "px-2 items-center" : "px-3")}>
        {IS_DEMO && !collapsed && (
          <div className="mb-2 rounded-md border border-warning/40 bg-warning/10 px-2.5 py-2">
            <p className="text-[11px] font-medium text-warning-foreground">Demo workspace</p>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Synthetic data — mock mode active.
            </p>
          </div>
        )}
        <Separator className="mb-2" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                "flex items-center gap-2.5 rounded-md py-1.5 text-left hover:bg-sidebar-accent",
                collapsed ? "justify-center w-8 px-0" : "w-full px-1",
              )}
              aria-label="User menu"
            >
              <CircleUserRound className="h-7 w-7 shrink-0 text-muted-foreground" aria-hidden />
              {!collapsed && (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-sidebar-foreground">
                    {userFullName}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {userEmail}
                  </span>
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-56">
            <DropdownMenuLabel>{userFullName}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/settings">
                <Settings className="mr-2 h-4 w-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => authApi.logout()} className="cursor-pointer text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
