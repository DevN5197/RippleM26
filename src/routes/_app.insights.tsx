import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Send,
  Bot,
  User,
  KeyRound,
  ShieldCheck,
  Wifi,
  ExternalLink,
  Layers,
  Lock,
  ArrowRight,
  TrendingDown,
  Info,
  CheckCircle2,
  RefreshCw,
  Sliders,
} from "lucide-react";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  getGeminiApiKey,
  setGeminiApiKey,
  getGeminiApiKeySource,
  callGeminiAPI,
} from "@/lib/gemini";
import { getLiveCrossPageState, type FullCrossPageState } from "@/lib/crossPageState";
import {
  generateSmartLocalResponse,
  type ActionPill,
} from "@/lib/aiFallback";
import { simulatorStore } from "@/lib/simulatorStore";
import { simulatorApi } from "@/lib/api/simulationApi";

export const Route = createFileRoute("/_app/insights")({
  head: () => ({
    meta: [
      { title: "Insights & AI — Ripple" },
      {
        name: "description",
        content: "AI Financial Copilot powered by Google Gemini 2.5 Flash with live cross-page state.",
      },
      { property: "og:title", content: "Insights & AI — Ripple" },
      { property: "og:description", content: "Live cross-page financial intelligence and autonomous rescues." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InsightsPage,
});

interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  actionPills?: ActionPill[] | undefined;
  isFallback?: boolean | undefined;
  timestamp?: string | undefined;
}

const STARTER_CHIPS = [
  "How can I improve my cash flow?",
  "Which invoices are overdue?",
  "Am I at risk of a cash crunch?",
  "How's my supplier payment health?",
];

export function getInitialWelcome(liveState: FullCrossPageState): {
  text: string;
  actionPills: ActionPill[];
} {
  const { overview, simulator } = liveState;
  const isDemo =
    !overview.businessName || overview.businessName === "Rupi Clothing";

  if (!isDemo) {
    return {
      text: `### Welcome to Ripple AI Copilot for **${overview.businessName}**

I have **real-time visibility** into your business accounts, treasury balances, and the Ripple Simulator:
• **Available Treasury**: **${overview.availableCashOnHandFormatted}** (Safety buffer: **${overview.safetyReserveFormatted}** | Status: *${overview.cashStatus}*)
• **Incoming Receivables**: **₹0** (0 open invoices) vs. **Committed Payables**: **₹0**
• **Cash Forecast**: Healthy reserve balance. Zero projected cash deficit.
• **Simulation State**: Baseline scenario ready. Model what-if delays once invoices or commitments are added.

Ask me how to protect your cash flow, or test a what-if payment delay in the simulator below.`,
      actionPills: [
        { id: "open_simulator", label: "Open in Ripple Simulator →" },
        { id: "load_apex", label: "Load Demo Flagship (+16d) Scenario" },
      ],
    };
  }

  return {
    text: `### Welcome to Ripple AI Copilot for **${overview.businessName}**

I have **real-time visibility** into your Supplier-Business-Customer loop, cash forecasts, and the Ripple Simulator:
• **Available Treasury**: **${overview.availableCashOnHandFormatted}** (Safety buffer: **${overview.safetyReserveFormatted}** | Status: *${overview.cashStatus}*)
• **Incoming Receivables**: **+${overview.incomingReceivablesFormatted}** (${overview.openInvoiceCount} open invoices) vs. **Committed Payables**: **-${overview.committedPayablesFormatted}**
• **Imminent Deficit**: Cash shortfall expected around **${overview.projectedDipDate}** (dips to **${overview.projectedDipAmountFormatted}**)
• **Simulation State**: Active scenario models **Apex Corp (#INV-APEX)** carrying a **20.0x Keystone Fragility Multiplier**

Ask me anything about your cash position, true margins, or click any starter prompt below.`,
    actionPills: [
      { id: "load_apex", label: "Load Apex Flagship (+16d) Scenario" },
      { id: "apply_split_escrow", label: "Lock Tri-Party Split-Escrow" },
      { id: "open_simulator", label: "Open in Ripple Simulator →" },
    ],
  };
}

/**
 * Clean markdown-to-JSX renderer supporting bold, headers, bullet points, and code spans
 */
function FormattedMessage({ text }: { text: string }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Heading 3: ###
        if (trimmed.startsWith("### ")) {
          return (
            <h3
              key={idx}
              className="text-base font-semibold text-foreground pt-1.5 pb-0.5 border-b border-border/40"
            >
              {renderInlineStyles(trimmed.slice(4))}
            </h3>
          );
        }

        // Heading 4 or bold title
        if (trimmed.startsWith("#### ")) {
          return (
            <h4 key={idx} className="text-sm font-semibold text-foreground pt-1">
              {renderInlineStyles(trimmed.slice(5))}
            </h4>
          );
        }

        // Bullet point: • or - or *
        if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const content = trimmed.slice(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-primary font-bold select-none leading-5">•</span>
              <span className="flex-1">{renderInlineStyles(content)}</span>
            </div>
          );
        }

        // Numbered list: e.g. 1.
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch && numMatch[1] && numMatch[2]) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-primary font-semibold text-xs tabular-nums select-none mt-0.5">
                {numMatch[1]}.
              </span>
              <span className="flex-1">{renderInlineStyles(numMatch[2])}</span>
            </div>
          );
        }

        // Standard paragraph
        return (
          <p key={idx} className="text-foreground/90">
            {renderInlineStyles(trimmed)}
          </p>
        );
      })}
    </div>
  );
}

function renderInlineStyles(str: string): React.ReactNode[] {
  // Regex parsing **bold**, *italic*, `code`
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*.*?\*|`.*?`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIndex) {
      parts.push(str.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={match.index} className="italic text-foreground/80">
          {token.slice(1, -1)}
        </em>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-primary font-medium"
        >
          {token.slice(1, -1)}
        </code>,
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < str.length) {
    parts.push(str.substring(lastIndex));
  }

  return parts;
}

function InsightsPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const live = getLiveCrossPageState();
    const welcome = getInitialWelcome(live);
    return [
      {
        id: "initial_welcome",
        role: "bot",
        text: welcome.text,
        actionPills: welcome.actionPills,
        isFallback: false,
      },
    ];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [keySource, setKeySource] = useState<"localStorage" | "env" | "none">("none");
  const [simpleMode, setSimpleMode] = useState<boolean>(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync key source status and dynamic welcome on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      setKeySource(getGeminiApiKeySource());
      setKeyInput(localStorage.getItem("rupi_gemini_api_key") || "");
      const live = getLiveCrossPageState();
      const welcome = getInitialWelcome(live);
      setMessages((prev) => {
        if (prev.length === 1 && prev[0]?.id === "initial_welcome") {
          return [
            {
              id: "initial_welcome",
              role: "bot",
              text: welcome.text,
              actionPills: welcome.actionPills,
              isFallback: false,
            },
          ];
        }
        return prev;
      });
    }
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Execute an action pill right from the chat
  const handleActionPill = useCallback(
    async (pillId: ActionPill["id"]) => {
      if (pillId === "open_simulator") {
        toast.info("Navigating to Ripple Simulator…");
        void navigate({ to: "/simulator" });
        return;
      }

      if (pillId === "load_apex") {
        simulatorStore.loadPreset("flagship");
        toast.success("Apex Flagship (+16d) Scenario Loaded", {
          description: "₹5L receivable delayed +16d; Kaveri Timber payable Day 18.",
        });
        setMessages((prev) => [
          ...prev,
          {
            id: `msg_load_${Date.now()}`,
            role: "bot",
            text: `🎯 **Apex Flagship (+16d) Scenario Loaded**\n\nThe simulator has been configured with **+16d customer payment delay** on **Apex Corp (+₹5,00,000)** and **-₹1,20,000** commitment on **Kaveri Timber**.\n\nContagion drag of **-₹93,300** reduces True Margin from **25%** to **6.34%**. You can inspect the interactive timeline now in the Simulator.`,
            actionPills: [
              { id: "open_simulator", label: "Open in Ripple Simulator →" },
              { id: "apply_auto_phase", label: "Execute Auto-Phase Inventory" },
              { id: "apply_split_escrow", label: "Lock Tri-Party Split-Escrow" },
            ],
          },
        ]);
        return;
      }

      if (pillId === "apply_auto_phase") {
        try {
          await simulatorApi.applyAutoPhase({
            supplierCommitmentPaise: 12_000_000,
            actualAvailableCashPaise: 15_000_000,
            safetyBufferPaise: 5_000_000,
            customerPaymentDate: "Day 31",
          });
          simulatorStore.applyAutoPhase();
          toast.success("Auto-Phase Inventory Executed!", {
            description: "Supplier bill split into Batch 1 (Day 18) and Batch 2 (Day 32).",
          });
          setMessages((prev) => [
            ...prev,
            {
              id: `msg_ap_${Date.now()}`,
              role: "bot",
              text: `✅ **Auto-Phase Inventory Executed Successfully**\n\n• **Supplier**: Kaveri Timber (Raw Materials)\n• **Batch 1 (₹1,00,000)**: Funded immediately on Day 18 within verified usable cash.\n• **Batch 2 (₹20,000)**: Synchronized with incoming collections on Day 32.\n• **Outcome**: ₹50,000 safety buffer preserved. Zero interest. Zero debt liabilities incurred.`,
              actionPills: [
                { id: "open_simulator", label: "Open in Ripple Simulator →" },
                { id: "apply_split_escrow", label: "Lock Tri-Party Split-Escrow" },
              ],
            },
          ]);
        } catch (err) {
          toast.error("Auto-Phase execution failed", {
            description: err instanceof Error ? err.message : "Error",
          });
        }
        return;
      }

      if (pillId === "apply_split_escrow") {
        try {
          await simulatorApi.applySplitEscrow({
            customerInvoicePaise: 50_000_000,
            supplierCommitmentPaise: 12_000_000,
            supplierFundingDate: "Day 18",
            customerSettlementDate: "Day 31",
          });
          simulatorStore.applySplitEscrow();
          toast.success("Tri-Party Split-Escrow Locked!", {
            description: "Metro Retail receivable pledged. Kaveri Timber funded with ₹0 cash.",
          });
          setMessages((prev) => [
            ...prev,
            {
              id: `msg_esc_${Date.now()}`,
              role: "bot",
              text: `🔒 **Tri-Party Split-Escrow Locked Successfully**\n\n• **Pledged Receivable**: Metro Retail Wholesale Order (+₹1,65,000)\n• **Supplier Obligation**: Kaveri Timber (-₹1,20,000)\n• **Cash Outlay Today**: **₹0 (Zero upfront business cash)**\n• **Settlement**: At invoice collection on Day 31, ₹1,20,000 routes automatically to Kaveri Timber, float fee of ₹2,400 (2%) is deducted, and net proceeds of ₹42,600 route to Rupi Treasury.`,
              actionPills: [
                { id: "open_simulator", label: "Open in Ripple Simulator →" },
                { id: "load_apex", label: "Load Apex Flagship (+16d) Scenario" },
              ],
            },
          ]);
        } catch (err) {
          toast.error("Split-Escrow execution failed", {
            description: err instanceof Error ? err.message : "Error",
          });
        }
        return;
      }
    },
    [navigate],
  );

  // Send a message: try Google Gemini API, or deterministically fall back to safety net
  async function sendMessage(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    // Append user message
    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Snapshot live cross-page state
    const liveState = getLiveCrossPageState();

    // Plain English directive if simpleMode is active
    const systemInstruction = simpleMode
      ? `${liveState.systemPromptString}\n\n[PLAIN ENGLISH DIRECTIVE]: Speak in simple, everyday language that a retail clothing shop owner immediately understands. Avoid complex financial jargon. Keep answers punchy and under 130 words, bold key ₹ amounts and dates, use simple bullet points, and conclude with one clear, practical recommended action.`
      : liveState.systemPromptString;

    try {
      // 1. Attempt live Google AI Studio API call (Gemini Flash)
      const geminiResponse = await callGeminiAPI({
        prompt: trimmed,
        systemInstruction,
        history: messages.slice(-6).map((m) => ({ role: m.role, text: m.text })),
      });

      // Derive relevant action pills based on query context
      const pills: ActionPill[] = [];
      const lower = trimmed.toLowerCase();
      if (lower.includes("simulat") || lower.includes("apex") || lower.includes("delay")) {
        pills.push({ id: "load_apex", label: "Load Apex Flagship (+16d) Scenario" });
        pills.push({ id: "open_simulator", label: "Open in Ripple Simulator →" });
      }
      if (lower.includes("supplier") || lower.includes("phase") || lower.includes("batch") || lower.includes("kaveri")) {
        pills.push({ id: "apply_auto_phase", label: "Execute Auto-Phase Inventory" });
      }
      if (lower.includes("escrow") || lower.includes("cash") || lower.includes("crunch") || lower.includes("improve")) {
        pills.push({ id: "apply_split_escrow", label: "Lock Tri-Party Split-Escrow" });
      }
      if (pills.length === 0) {
        pills.push({ id: "apply_split_escrow", label: "Lock Tri-Party Split-Escrow" });
        pills.push({ id: "apply_auto_phase", label: "Execute Auto-Phase Inventory" });
        pills.push({ id: "open_simulator", label: "Open in Ripple Simulator →" });
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          role: "bot",
          text: geminiResponse.text,
          actionPills: pills,
          isFallback: false,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      console.warn("Gemini API call failed or offline, engaging Hackathon Safety Net:", err);

      // 2. Deterministic, smart context-aware local response generator
      const fallbackReply = generateSmartLocalResponse(trimmed, liveState);

      setMessages((prev) => [
        ...prev,
        {
          id: `bot_${Date.now()}`,
          role: "bot",
          text: fallbackReply.text,
          actionPills: fallbackReply.actionPills,
          isFallback: true,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveKeyDialog = () => {
    setGeminiApiKey(keyInput.trim());
    setKeySource(getGeminiApiKeySource());
    setIsKeyDialogOpen(false);
    if (keyInput.trim()) {
      toast.success("Gemini API Key Saved", {
        description: "Google AI Studio API is now active for live queries.",
      });
    } else {
      toast.info("Gemini API Key Cleared", {
        description: "Insights will run using the Hackathon Safety Net.",
      });
    }
  };

  const currentLive = getLiveCrossPageState();

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] max-w-4xl mx-auto px-2 sm:px-4 py-3 gap-3">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">Insights & AI</h1>
              <Badge
                variant="outline"
                className="bg-primary/5 text-primary border-primary/20 text-[11px] font-semibold"
              >
                Google Gemini Flash
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Autonomous Financial Copilot deeply linked to live cross-page state
            </p>
          </div>
        </div>

        {/* Live Context & Status Actions */}
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={simpleMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              const next = !simpleMode;
              setSimpleMode(next);
              toast.info(
                next
                  ? "Plain English Mode Enabled (Simpler & Punchier)"
                  : "Detailed Analysis Mode Enabled",
              );
            }}
            className="h-8 text-xs gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{simpleMode ? "Plain English: ON" : "Plain English: OFF"}</span>
          </Button>

          {keySource !== "none" ? (
            <Badge
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs gap-1.5 py-1 px-2.5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live API Connected
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs gap-1.5 py-1 px-2.5"
            >
              <Wifi className="w-3 h-3" />
              Safety Net Engine Active
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsKeyDialogOpen(true)}
            className="h-8 text-xs gap-1.5 border-border/70"
          >
            <KeyRound className="w-3.5 h-3.5 text-muted-foreground" />
            API Key
          </Button>
        </div>
      </div>

      {/* Cross-Page Live State Linking Ribbon */}
      <div className="rounded-xl border border-border/70 bg-card/60 p-2.5 text-xs text-muted-foreground shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-primary" />
          <span className="font-semibold text-foreground">Live App State Connected:</span>
          <span className="hidden sm:inline">
            Cash: <strong className="text-foreground">{currentLive.overview.availableCashOnHandFormatted}</strong>
            {" · "}
            Active Preset: <strong className="text-foreground">{currentLive.simulator.activePreset}</strong>
            {" · "}
            True Margin: <strong className="text-foreground">{currentLive.simulator.trueRippleMarginPercent}</strong>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {currentLive.simulator.activeRescues.autoPhaseApplied && (
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
              Auto-Phase Active
            </Badge>
          )}
          {currentLive.simulator.activeRescues.splitEscrowLocked && (
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
              Split-Escrow Locked
            </Badge>
          )}
          <button
            onClick={() => navigate({ to: "/simulator" })}
            className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            View Simulator <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Chat Messages Window */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3.5 bg-card rounded-2xl border border-border/80 p-4 min-h-0 shadow-inner">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "bot" && (
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 border border-primary/20">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[85%] rounded-2xl p-4 leading-relaxed shadow-xs ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-xs"
                  : "bg-muted/40 text-foreground border border-border/70 rounded-bl-xs"
              }`}
            >
              {msg.role === "user" ? (
                <div className="text-sm">{msg.text}</div>
              ) : (
                <div className="space-y-3">
                  <FormattedMessage text={msg.text} />

                  {/* Interactive Action Buttons / Pills */}
                  {msg.actionPills && msg.actionPills.length > 0 && (
                    <div className="pt-2 border-t border-border/60 flex flex-wrap gap-1.5">
                      {msg.actionPills.map((pill) => (
                        <button
                          key={pill.id}
                          type="button"
                          onClick={() => handleActionPill(pill.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-2xs cursor-pointer active:scale-95"
                        >
                          {pill.id === "open_simulator" && <ExternalLink className="w-3 h-3" />}
                          {pill.id === "load_apex" && <Sliders className="w-3 h-3" />}
                          {pill.id === "apply_auto_phase" && <Layers className="w-3 h-3" />}
                          {pill.id === "apply_split_escrow" && <Lock className="w-3 h-3" />}
                          <span>{pill.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {msg.isFallback && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-1 opacity-75">
                      <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Answered via Live Deterministic Financial Engine (Hackathon Safety Net)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center shrink-0 mt-0.5 border border-border">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-muted/40 rounded-2xl rounded-bl-xs px-4 py-3 border border-border/70 flex gap-1.5 items-center">
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
              <span className="text-xs text-muted-foreground pl-2 font-medium">
                Analyzing loop contagion & live cash flows…
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Starter Prompt Chips */}
      <div className="flex flex-wrap gap-1.5">
        {STARTER_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => sendMessage(chip)}
            disabled={loading}
            className="text-xs border border-border/80 rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:border-primary/50 transition-all cursor-pointer font-medium disabled:opacity-50"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Row */}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask anything about cash shortages, True Margin, Apex Corp, or rescues…"
          disabled={loading}
          className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 flex items-center gap-1.5 text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-all shadow-xs cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Ask Gemini</span>
        </button>
      </form>

      {/* API Key Modal Dialog */}
      <Dialog open={isKeyDialogOpen} onOpenChange={setIsKeyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <KeyRound className="h-4 w-4" />
              </div>
              <DialogTitle>Google AI Studio API Key</DialogTitle>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <p className="text-xs text-muted-foreground leading-relaxed">
              Paste your Google AI Studio API Key to query <strong>Gemini 2.5 Flash</strong> directly.
              Keys stored in <code className="text-xs font-mono">localStorage</code> take precedence during live presentations.
            </p>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Gemini API Key</Label>
              <Input
                type="password"
                placeholder="AQ... or AIzaSy... (Paste key here)"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1 text-muted-foreground border">
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Hackathon Wi-Fi Safety Net
              </p>
              <p>
                If the key is empty, network drops, or rate limits occur, the assistant will seamlessly generate answers using the local financial engine with zero error alerts.
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsKeyDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveKeyDialog} className="font-semibold">
              Save Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
