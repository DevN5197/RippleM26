import { Bell } from "lucide-react";
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

export function AppHeader() {
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
            aria-label="Notifications"
            className="relative rounded-full text-muted-foreground hover:text-foreground"
          >
            <Bell className="h-4.5 w-4.5" />
            <span
              className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card"
              aria-hidden
            />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 shadow-elevated">
          <DropdownMenuLabel>Notifications</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium">Cash shortfall projected around Day 5</span>
            <span className="text-xs text-muted-foreground">Critical · today</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium">INV-1999 is 5 days overdue</span>
            <span className="text-xs text-muted-foreground">Warning · today</span>
          </DropdownMenuItem>
          <DropdownMenuItem className="flex flex-col items-start gap-0.5">
            <span className="text-sm font-medium">Cotton Kurti below reorder point</span>
            <span className="text-xs text-muted-foreground">Warning · today</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
