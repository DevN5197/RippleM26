import { useState, useEffect } from "react";
import { Sliders, Sun, Moon, Laptop, Save, Undo2, LayoutGrid, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AppPreferences } from "@/types";
import { applyTheme, applyCompactTables, type ThemeMode } from "@/lib/theme";

interface AppSettingsSectionProps {
  appPreferences: AppPreferences;
  onSave: (data: Partial<AppPreferences>) => Promise<void>;
  isSaving: boolean;
}

export function AppSettingsSection({
  appPreferences,
  onSave,
  isSaving,
}: AppSettingsSectionProps) {
  const [theme, setTheme] = useState<ThemeMode>(appPreferences.theme ?? "system");
  const [compactTables, setCompactTables] = useState<boolean>(
    appPreferences.compactTables ?? false,
  );

  useEffect(() => {
    setTheme(appPreferences.theme ?? "system");
    setCompactTables(appPreferences.compactTables ?? false);
  }, [appPreferences]);

  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    // Instant live preview
    applyTheme(newTheme);
  };

  const handleCompactChange = (checked: boolean) => {
    setCompactTables(checked);
    // Instant live preview
    applyCompactTables(checked);
  };

  const handleReset = () => {
    setTheme(appPreferences.theme ?? "system");
    setCompactTables(appPreferences.compactTables ?? false);
    applyTheme(appPreferences.theme ?? "system");
    applyCompactTables(appPreferences.compactTables ?? false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave({
      theme,
      compactTables,
      version: appPreferences.version ?? "1.0.0",
    });
  };

  const hasChanges =
    theme !== (appPreferences.theme ?? "system") ||
    compactTables !== (appPreferences.compactTables ?? false);

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Sliders className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">App Settings & Appearance</CardTitle>
              <CardDescription>
                Customize theme styling, table density, and inspect the installed platform version.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">Theme Preference</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleThemeChange("light")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                  theme === "light"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-input bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                <Sun className="h-4 w-4" />
                <span>Light</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange("dark")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                  theme === "dark"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-input bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                <Moon className="h-4 w-4" />
                <span>Dark</span>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange("system")}
                className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium transition-colors ${
                  theme === "system"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-input bg-card text-muted-foreground hover:bg-accent"
                }`}
              >
                <Laptop className="h-4 w-4" />
                <span>System</span>
              </button>
            </div>
          </div>

          {/* Compact Tables Mode */}
          <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <LayoutGrid className="h-3.5 w-3.5" />
              </div>
              <div>
                <Label htmlFor="compact-tables" className="cursor-pointer text-sm font-medium text-foreground">
                  Compact Table Mode
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Reduces row padding across suppliers, customers, invoices, and cash flow ledgers to view more data on screen.
                </p>
              </div>
            </div>
            <Switch
              id="compact-tables"
              checked={compactTables}
              onCheckedChange={handleCompactChange}
              disabled={isSaving}
              aria-label="Compact tables"
            />
          </div>

          {/* Version Info */}
          <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/20">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">Platform Release</span>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              Ripple v{appPreferences.version ?? "1.0.0"}
            </Badge>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between border-t px-6 py-4">
          <p className="text-xs text-muted-foreground">
            {hasChanges ? "Unsaved appearance changes" : "Appearance preferences current"}
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
              {isSaving ? "Saving..." : "Save App Settings"}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  );
}
