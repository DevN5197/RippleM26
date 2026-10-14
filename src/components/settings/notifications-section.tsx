import { useState, useEffect } from "react";
import { Bell, Save, Undo2, AlertTriangle, Clock, FileWarning, Wallet, Truck, Network } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { NotificationPreferences } from "@/types";

interface NotificationsSectionProps {
  notifications: NotificationPreferences;
  onSave: (data: NotificationPreferences) => Promise<void>;
  isSaving: boolean;
}

interface NotificationItemConfig {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
  icon: typeof Bell;
}

const NOTIFICATION_ITEMS: NotificationItemConfig[] = [
  {
    key: "overduePayments",
    label: "Overdue Payments",
    description: "Alert when scheduled outgoing payments or vendor disbursements exceed payment terms.",
    icon: AlertTriangle,
  },
  {
    key: "upcomingSupplierPayments",
    label: "Upcoming Supplier Payments",
    description: "Reminders for vendor bills and purchase order balances due within 7 days.",
    icon: Clock,
  },
  {
    key: "overdueInvoices",
    label: "Overdue Customer Invoices",
    description: "Immediate notifications when customer receivable invoices pass their due date.",
    icon: FileWarning,
  },
  {
    key: "lowCash",
    label: "Low Cash & Shortfalls",
    description: "Warning when projected cash falls below your configured safety threshold.",
    icon: Wallet,
  },
  {
    key: "delayedDeliveries",
    label: "Delayed Deliveries & Stockout Risks",
    description: "Notifications when vendor shipments run late or inventory threatens customer fulfillment.",
    icon: Truck,
  },
  {
    key: "highRippleImpact",
    label: "High Ripple Impact Score",
    description: "Alert when a single change triggers cascading disruptions across downstream orders and cash.",
    icon: Network,
  },
];

export function NotificationsSection({
  notifications,
  onSave,
  isSaving,
}: NotificationsSectionProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>({ ...notifications });

  useEffect(() => {
    setPreferences({ ...notifications });
  }, [notifications]);

  const handleToggle = (key: keyof NotificationPreferences, checked: boolean) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: checked,
    }));
  };

  const handleReset = () => {
    setPreferences({ ...notifications });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(preferences);
  };

  const hasChanges = (Object.keys(preferences) as (keyof NotificationPreferences)[]).some(
    (k) => preferences[k] !== notifications[k],
  );

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Notifications & Risk Alerts</CardTitle>
              <CardDescription>
                Choose which events and operational risks surface banners and activity alerts across Ripple.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="divide-y">
          {NOTIFICATION_ITEMS.map((item) => {
            const Icon = item.icon;
            const isChecked = !!preferences[item.key];

            return (
              <div
                key={item.key}
                className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <Label
                      htmlFor={`notif-${item.key}`}
                      className="cursor-pointer text-sm font-medium text-foreground"
                    >
                      {item.label}
                    </Label>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <Switch
                  id={`notif-${item.key}`}
                  checked={isChecked}
                  onCheckedChange={(checked) => handleToggle(item.key, checked)}
                  disabled={isSaving}
                  aria-label={item.label}
                />
              </div>
            );
          })}
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {hasChanges ? "Unsaved notification changes" : "Notification settings current"}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!hasChanges || isSaving}
            >
              <Undo2 className="mr-1.5 h-3.5 w-3.5" />
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={!hasChanges || isSaving}>
              <Save className="mr-1.5 h-3.5 w-3.5" />
              {isSaving ? "Saving..." : "Save Notifications"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
