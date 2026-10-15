import { useState, useEffect } from "react";
import {
  Sliders,
  Sun,
  Moon,
  Laptop,
  Save,
  Undo2,
  LayoutGrid,
  Info,
  Sparkles,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Wifi,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { AppPreferences } from "@/types";
import { applyTheme, applyCompactTables, type ThemeMode } from "@/lib/theme";
import {
  getGeminiApiKey,
  setGeminiApiKey,
  getGeminiApiKeySource,
  callGeminiAPI,
} from "@/lib/gemini";

interface AppSettingsSectionProps {
  appPreferences: AppPreferences;
  onSave: (data: Partial<AppPreferences>) => Promise<void>;
  isSaving: boolean;
}

export function AppSettingsSection({ appPreferences, onSave, isSaving }: AppSettingsSectionProps) {
  const [theme, setTheme] = useState<ThemeMode>(appPreferences.theme ?? "system");
  const [compactTables, setCompactTables] = useState<boolean>(
    appPreferences.compactTables ?? false,
  );

  // Gemini API Key State
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>("");
  const [showKey, setShowKey] = useState<boolean>(false);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [keySource, setKeySource] = useState<"localStorage" | "env" | "none">("none");

  useEffect(() => {
    setTheme(appPreferences.theme ?? "system");
    setCompactTables(appPreferences.compactTables ?? false);

    // Load active Gemini key & source
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("rupi_gemini_api_key") || "";
      setGeminiKeyInput(stored);
      setKeySource(getGeminiApiKeySource());
    }
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

  const handleSaveGeminiKey = () => {
    setGeminiApiKey(geminiKeyInput.trim());
    setKeySource(getGeminiApiKeySource());
    if (geminiKeyInput.trim()) {
      toast.success("Gemini API key saved to localStorage", {
        description: "Active override will be used for all Insights & AI queries.",
      });
    } else {
      toast.info("Gemini API key cleared from localStorage", {
        description: "Insights & AI will fall back to environment variable or safety net.",
      });
    }
  };

  const handleClearGeminiKey = () => {
    setGeminiKeyInput("");
    setGeminiApiKey("");
    setKeySource(getGeminiApiKeySource());
    toast.info("Custom API key cleared");
  };

  const handleTestGeminiKey = async () => {
    const keyToTest = geminiKeyInput.trim() || getGeminiApiKey();
    if (!keyToTest) {
      toast.error("Please enter a Gemini API Key to test.", {
        description: "Get one at https://aistudio.google.com/app/apikey",
      });
      return;
    }

    setIsTestingKey(true);
    try {
      const res = await callGeminiAPI({
        prompt: "Respond with exactly: Connection successful.",
        systemInstruction: "You are a test agent. Keep responses to 2 words.",
        apiKeyOverride: keyToTest,
      });
      toast.success("Google AI Studio Connected Successfully!", {
        description: `Model: ${res.model} responded: "${res.text}"`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      toast.error("Gemini Connection Test Failed", {
        description: msg,
      });
    } finally {
      setIsTestingKey(false);
    }
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
                Customize theme styling, table density, AI integrations, and inspect the platform version.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google AI Studio (Gemini API) Integration */}
          <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <Label className="text-sm font-semibold text-foreground flex items-center gap-2">
                    Google AI Studio (Gemini 2.5 Flash)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Connects Insights & AI to Gemini with automatic Hackathon Safety Net fallback.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {keySource === "localStorage" && (
                  <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Custom Override Active
                  </Badge>
                )}
                {keySource === "env" && (
                  <Badge variant="outline" className="border-blue-500/40 bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Env Key Active
                  </Badge>
                )}
                {keySource === "none" && (
                  <Badge variant="outline" className="border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs gap-1">
                    <Wifi className="h-3 w-3" />
                    Safety Net Ready
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <Label htmlFor="gemini-key" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <KeyRound className="h-3 w-3" />
                Gemini API Key (<code className="text-[11px] font-mono">rupi_gemini_api_key</code>)
              </Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="gemini-key"
                    type={showKey ? "text" : "password"}
                    placeholder="AQ... or AIzaSy... (Paste Google AI Studio API key)"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    className="pr-10 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    title={showKey ? "Hide key" : "Show key"}
                  >
                    {showKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestGeminiKey}
                  disabled={isTestingKey}
                  className="text-xs h-9"
                >
                  {isTestingKey ? "Testing…" : "Test Key"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSaveGeminiKey}
                  className="text-xs h-9 font-medium"
                >
                  Save Key
                </Button>
                {geminiKeyInput && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearGeminiKey}
                    className="text-xs h-9 text-muted-foreground hover:text-destructive"
                  >
                    Clear
                  </Button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Get an API key free at{" "}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline hover:opacity-80"
                >
                  Google AI Studio
                </a>
                . If offline or no key is set, the copilot will automatically generate deterministic responses using live data.
              </p>
            </div>
          </div>
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
                <Label
                  htmlFor="compact-tables"
                  className="cursor-pointer text-sm font-medium text-foreground"
                >
                  Compact Table Mode
                </Label>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Reduces row padding across suppliers, customers, invoices, and cash flow ledgers
                  to view more data on screen.
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
