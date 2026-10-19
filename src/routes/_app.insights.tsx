import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Send,
  Bot,
  User,
  ShieldCheck,
  ExternalLink,
  Layers,
  Lock,
  ArrowRight,
  TrendingDown,
  Info,
  CheckCircle2,
  Sliders,
  DollarSign,
  AlertTriangle,
  Building2,
} from "lucide-react";
import React, { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/formatters";
import { callGeminiAPI } from "@/lib/gemini";
import { getLiveCrossPageState, type FullCrossPageState } from "@/lib/crossPageState";
import {
  generateSmartLocalResponse,
  type ActionPill,
} from "@/lib/aiFallback";
import { simulatorStore } from "@/lib/simulatorStore";
import { simulatorApi } from "@/lib/api/simulationApi";
import { dashboardApi } from "@/lib/api/dashboardApi";
import { invoiceApi } from "@/lib/api/invoiceApi";
import { supplierApi } from "@/lib/api/supplierApi";
import { customerApi } from "@/lib/api/customerApi";
import { getStoredBusiness } from "@/lib/api/authApi";
import { isDemoAccount } from "@/lib/crossPageState";

export const Route = createFileRoute("/_app/insights")({
  head: () => ({
    meta: [
      { title: "Ask Ripple — AI Copilot" },
      {
        name: "description",
        content: "Ask Ripple: Live business intelligence copilot and autonomous loop rescues.",
      },
      { property: "og:title", content: "Ask Ripple — AI Copilot" },
      { property: "og:description", content: "Live cross-page financial intelligence and autonomous rescues." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InsightsPage,
});

interface ChatCashTrajectoryData {
  cashOnHandFormatted: string;
  minBalanceFormatted: string;
  safetyReserveFormatted: string;
  hasShortfall: boolean;
  dipDate: string;
}

interface ChatMarginCompressionData {
  paperMarginPercent: string;
  trueMarginPercent: string;
  revenueFormatted: string;
  cogsFormatted: string;
  contagionDragFormatted: string;
  lostDiscount: string;
  haltFees: string;
  slaPenalties: string;
  floatDrag: string;
}

interface CounterpartyItem {
  id: string;
  name: string;
  role: "Customer" | "Supplier";
  amountFormatted: string;
  reliability: number;
  status: "Overdue" | "At Risk" | "Healthy";
}

interface ChatCounterpartyData {
  counterparties: CounterpartyItem[];
}

interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  actionPills?: ActionPill[] | undefined;
  isFallback?: boolean | undefined;
  timestamp?: string | undefined;
  widgetType?: "cash_trajectory" | "margin_compression" | "counterparty_table" | undefined;
  widgetData?: ChatCashTrajectoryData | ChatMarginCompressionData | ChatCounterpartyData | undefined;
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
  widgetType?: "cash_trajectory" | "margin_compression" | "counterparty_table";
  widgetData?: any;
} {
  const { overview, simulator } = liveState;
  const storedBiz = typeof window !== "undefined" ? getStoredBusiness() : null;
  const isDemo = isDemoAccount(storedBiz);

  if (!isDemo) {
    return {
      text: `### Welcome to Ask Ripple for **${overview.businessName}**

I have **real-time visibility** into your business accounts, treasury balances, and the Ripple Simulator:
• **Available Treasury**: **${overview.availableCashOnHandFormatted}** (Safety buffer: **${overview.safetyReserveFormatted}** | Status: *${overview.cashStatus}*)
• **Incoming Receivables**: **₹0** (0 open invoices) vs. **Committed Payables**: **₹0**
• **Cash Forecast**: Healthy initial reserve balance. Zero projected cash deficit.
• **Simulation State**: Baseline scenario ready. Model what-if delays once invoices or commitments are added.

Ask me anything about cash flow, or start by recording your suppliers and customers to activate real-time timing alerts.`,
      actionPills: [
        { id: "open_simulator", label: "Open in Ripple Simulator →" },
      ],
      widgetType: "cash_trajectory",
      widgetData: {
        cashOnHandFormatted: overview.availableCashOnHandFormatted,
        minBalanceFormatted: overview.availableCashOnHandFormatted,
        safetyReserveFormatted: overview.safetyReserveFormatted,
        hasShortfall: false,
        dipDate: "None projected",
      },
    };
  }

  return {
    text: `### Welcome to Ask Ripple for **${overview.businessName}**

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
    widgetType: "cash_trajectory",
    widgetData: {
      cashOnHandFormatted: overview.availableCashOnHandFormatted,
      minBalanceFormatted: overview.projectedDipAmountFormatted,
      safetyReserveFormatted: overview.safetyReserveFormatted,
      hasShortfall: true,
      dipDate: overview.projectedDipDate,
    },
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

        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={idx} className="text-base font-bold text-foreground pt-1 first:pt-0">
              {renderInlineStyles(trimmed.slice(4))}
            </h3>
          );
        }

        if (trimmed.startsWith("#### ")) {
          return (
            <h4 key={idx} className="text-sm font-semibold text-foreground pt-1">
              {renderInlineStyles(trimmed.slice(5))}
            </h4>
          );
        }

        if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const content = trimmed.slice(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="text-primary font-bold select-none leading-5">•</span>
              <span className="flex-1">{renderInlineStyles(content)}</span>
            </div>
          );
        }

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

// ── Embedded Visual Chat Widgets ──────────────────────────────────────────────

function ChatCashTrajectoryWidget({
  data,
  onOpenSimulator,
}: {
  data: ChatCashTrajectoryData;
  onOpenSimulator: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-border/80 bg-background/90 p-3 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <TrendingDown className={cn("h-4 w-4", data.hasShortfall ? "text-destructive" : "text-emerald-500")} />
          30-Day Projected Cash Trajectory
        </span>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-semibold",
            data.hasShortfall
              ? "bg-destructive/10 text-destructive border-destructive/30"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
          )}
        >
          {data.hasShortfall ? "Deficit Projected" : "Healthy Buffer"}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="rounded-lg bg-muted/30 p-2 border border-border/40">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Current Cash</span>
          <span className="text-sm font-bold font-mono text-foreground">{data.cashOnHandFormatted}</span>
        </div>
        <div className="rounded-lg bg-muted/30 p-2 border border-border/40">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Lowest Point</span>
          <span className={cn("text-sm font-bold font-mono", data.hasShortfall ? "text-destructive" : "text-foreground")}>
            {data.minBalanceFormatted}
          </span>
        </div>
        <div className="rounded-lg bg-muted/30 p-2 border border-border/40">
          <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Safety Buffer</span>
          <span className="text-sm font-bold font-mono text-muted-foreground">{data.safetyReserveFormatted}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <span className="text-[11px] text-muted-foreground">
          {data.hasShortfall ? `Breach timing: around ${data.dipDate}` : "Zero deficit projected across 30 days"}
        </span>
        <Button
          size="sm"
          onClick={onOpenSimulator}
          className="h-7 text-xs font-semibold gap-1 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
        >
          Open in Ripple Simulator <ArrowRight className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

function ChatMarginCompressionWidget({
  data,
  onAutoPhase,
  onSplitEscrow,
}: {
  data: ChatMarginCompressionData;
  onAutoPhase: () => void;
  onSplitEscrow: () => void;
}) {
  return (
    <div className="mt-3 rounded-xl border border-border/80 bg-background/90 p-3 shadow-xs space-y-2.5">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <Layers className="h-4 w-4 text-warning" />
          Margin Compression & Contagion Breakdown
        </span>
        <Badge variant="outline" className="text-[10px] bg-warning/10 text-warning-foreground border-warning/30 font-semibold">
          Contagion Drag: {data.contagionDragFormatted}
        </Badge>
      </div>

      {/* Visual Bar Comparison */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs font-mono">
          <span className="text-muted-foreground">Paper Margin: <strong className="text-foreground">{data.paperMarginPercent}</strong></span>
          <span className="text-destructive font-bold">True Margin: {data.trueMarginPercent}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden flex">
          <div className="bg-emerald-500 h-full" style={{ width: "35%" }} />
          <div className="bg-destructive h-full" style={{ width: "65%" }} />
        </div>
      </div>

      {/* 4 Contagion Costs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] pt-1">
        <div className="flex justify-between p-1.5 rounded bg-muted/20 border border-border/40">
          <span className="text-muted-foreground">Lost Early Discount:</span>
          <span className="font-mono font-semibold text-foreground">{data.lostDiscount}</span>
        </div>
        <div className="flex justify-between p-1.5 rounded bg-muted/20 border border-border/40">
          <span className="text-muted-foreground">Supplier Halt Fees:</span>
          <span className="font-mono font-semibold text-destructive">{data.haltFees}</span>
        </div>
        <div className="flex justify-between p-1.5 rounded bg-muted/20 border border-border/40">
          <span className="text-muted-foreground">Secondary Customer SLA:</span>
          <span className="font-mono font-semibold text-destructive">{data.slaPenalties}</span>
        </div>
        <div className="flex justify-between p-1.5 rounded bg-muted/20 border border-border/40">
          <span className="text-muted-foreground">Float Drag:</span>
          <span className="font-mono font-semibold text-foreground">{data.floatDrag}</span>
        </div>
      </div>

      {/* Quick Action Triggers */}
      <div className="pt-2 border-t border-border/50 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={onAutoPhase}
          className="h-7 text-xs font-semibold gap-1.5 border-primary/30 text-primary hover:bg-primary/5 cursor-pointer"
        >
          <Layers className="h-3.5 w-3.5" />
          Auto-Phase Inventory
        </Button>
        <Button
          size="sm"
          onClick={onSplitEscrow}
          className="h-7 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs cursor-pointer"
        >
          <Lock className="h-3.5 w-3.5" />
          Lock Tri-Party Split-Escrow
        </Button>
      </div>
    </div>
  );
}

function ChatCounterpartyTableWidget({
  data,
}: {
  data: ChatCounterpartyData;
}) {
  return (
    <div className="mt-3 rounded-xl border border-border/80 bg-background/90 p-3 shadow-xs space-y-2">
      <div className="flex items-center justify-between border-b border-border/50 pb-2">
        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Counterparty Reliability & Commitment Health
        </span>
        <span className="text-[10px] text-muted-foreground font-mono">Live Ledger</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-border/50 text-muted-foreground text-[10px] uppercase font-semibold">
              <th className="pb-1.5 font-medium">Counterparty</th>
              <th className="pb-1.5 font-medium">Role</th>
              <th className="pb-1.5 font-medium">Amount</th>
              <th className="pb-1.5 font-medium">Reliability</th>
              <th className="pb-1.5 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            {data.counterparties.map((cp) => (
              <tr key={cp.id} className="text-[11px]">
                <td className="py-1.5 font-medium text-foreground">{cp.name}</td>
                <td className="py-1.5 text-muted-foreground">{cp.role}</td>
                <td className="py-1.5 font-mono font-semibold text-foreground">{cp.amountFormatted}</td>
                <td className="py-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="h-1.5 w-14 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          cp.reliability >= 85 ? "bg-emerald-500" : cp.reliability >= 60 ? "bg-amber-500" : "bg-destructive",
                        )}
                        style={{ width: `${cp.reliability}%` }}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-muted-foreground">{cp.reliability}%</span>
                  </div>
                </td>
                <td className="py-1.5 text-right">
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-full inline-block",
                      cp.status === "Overdue"
                        ? "bg-destructive/10 text-destructive"
                        : cp.status === "At Risk"
                          ? "bg-warning/15 text-warning-foreground"
                          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                    )}
                  >
                    {cp.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Main Page Component ───────────────────────────────────────────────────────

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
        widgetType: welcome.widgetType,
        widgetData: welcome.widgetData,
      },
    ];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [simpleMode, setSimpleMode] = useState<boolean>(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Sync dynamic welcome on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
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
              widgetType: welcome.widgetType,
              widgetData: welcome.widgetData,
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
            widgetType: "margin_compression",
            widgetData: {
              paperMarginPercent: "25.0%",
              trueMarginPercent: "6.34%",
              revenueFormatted: "₹5,00,000",
              cogsFormatted: "₹3,75,000",
              contagionDragFormatted: "-₹93,300",
              lostDiscount: "₹3,600",
              haltFees: "₹40,000",
              slaPenalties: "₹48,000",
              floatDrag: "₹22,400",
            },
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

  // Send a message trained on live server state
  async function sendMessage(textToSend: string) {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      role: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // 1. Fetch live server state for active authenticated business
    const storedBiz = typeof window !== "undefined" ? getStoredBusiness() : null;
    const isDemo = isDemoAccount(storedBiz);

    const [summary, invoicesRes, suppliersRes, customersRes] = await Promise.all([
      dashboardApi.getSummary().catch(() => null),
      invoiceApi.list({ pageSize: 50 }).catch(() => ({ data: [] })),
      supplierApi.list({ pageSize: 50 }).catch(() => ({ data: [] })),
      customerApi.list({ pageSize: 50 }).catch(() => ({ data: [] })),
    ]);

    const liveState = getLiveCrossPageState();

    // Determine relevant visual widget based on query topic
    const lower = trimmed.toLowerCase();
    let widgetType: ChatMessage["widgetType"] = undefined;
    let widgetData: ChatMessage["widgetData"] = undefined;

    if (
      lower.includes("cash") ||
      lower.includes("crunch") ||
      lower.includes("liquidity") ||
      lower.includes("shortfall") ||
      lower.includes("deficit") ||
      lower.includes("forecast") ||
      lower.includes("buffer")
    ) {
      widgetType = "cash_trajectory";
      widgetData = {
        cashOnHandFormatted: formatMoney(summary?.cashOnHandPaise ?? liveState.overview.availableCashOnHandPaise),
        minBalanceFormatted: formatMoney(summary?.forecast?.[0]?.projectedBalancePaise ?? liveState.overview.safetyReservePaise),
        safetyReserveFormatted: formatMoney(storedBiz?.safetyThresholdPaise ?? 500_000),
        hasShortfall: (summary?.alerts?.length ?? 0) > 0,
        dipDate: summary?.alerts?.[0]?.title?.includes("around")
          ? summary.alerts[0].title.split("around ")[1] ?? "upcoming cycle"
          : "25 Oct 2026",
      };
    } else if (
      lower.includes("margin") ||
      lower.includes("profit") ||
      lower.includes("drag") ||
      lower.includes("delay") ||
      lower.includes("halt") ||
      lower.includes("penalty") ||
      lower.includes("escrow") ||
      lower.includes("phase")
    ) {
      widgetType = "margin_compression";
      widgetData = {
        paperMarginPercent: liveState.simulator.paperMarginPercent || "25.0%",
        trueMarginPercent: liveState.simulator.trueRippleMarginPercent || "6.34%",
        revenueFormatted: liveState.simulator.revenueFormatted || "₹5,00,000",
        cogsFormatted: liveState.simulator.cogsFormatted || "₹3,75,000",
        contagionDragFormatted: liveState.simulator.rippleContagionDragFormatted || "-₹93,300",
        lostDiscount: liveState.simulator.lostSupplierEarlyDiscountFormatted || "₹3,600",
        haltFees: liveState.simulator.supplierHaltFeesFormatted || "₹40,000",
        slaPenalties: liveState.simulator.secondarySlaPenaltiesFormatted || "₹48,000",
        floatDrag: liveState.simulator.workingCapitalFloatDragFormatted || "₹22,400",
      };
    } else if (
      lower.includes("invoice") ||
      lower.includes("supplier") ||
      lower.includes("customer") ||
      lower.includes("overdue") ||
      lower.includes("bill") ||
      lower.includes("health") ||
      lower.includes("counterparty")
    ) {
      widgetType = "counterparty_table";
      const counterparties: CounterpartyItem[] = isDemo ? [
        {
          id: "cp-1",
          name: "Apex Corp",
          role: "Customer",
          amountFormatted: "₹5,00,000",
          reliability: 58,
          status: "At Risk",
        },
        {
          id: "cp-2",
          name: "Kaveri Timber",
          role: "Supplier",
          amountFormatted: "₹1,20,000",
          reliability: 92,
          status: "Healthy",
        },
        {
          id: "cp-3",
          name: "Metro Retail",
          role: "Customer",
          amountFormatted: "₹1,65,000",
          reliability: 88,
          status: "Healthy",
        },
        {
          id: "cp-4",
          name: "Shree Textiles",
          role: "Supplier",
          amountFormatted: "₹50,000",
          reliability: 45,
          status: "Overdue",
        },
      ] : [
          ...((suppliersRes && "data" in suppliersRes && Array.isArray(suppliersRes.data)) ? suppliersRes.data : []),
          ...((customersRes && "data" in customersRes && Array.isArray(customersRes.data)) ? customersRes.data : []),
        ].slice(0, 4).map((item: any) => ({
        id: item.id,
        name: item.name,
        role: item.contactName ? "Supplier" : "Customer",
        amountFormatted: "₹0",
        reliability: item.reliabilityScore ?? 90,
        status: (item.reliabilityScore ?? 90) < 60 ? "At Risk" : "Healthy",
      }));

      widgetData = { counterparties };
    }

    // Build system prompt strictly grounded in active business state
    const liveServerContext = `
ACTIVE BUSINESS CONTEXT:
Business Name: ${storedBiz?.name || "Rupi Clothing"}
Is Demo Account: ${isDemo}
Available Cash: ${formatMoney(summary?.cashOnHandPaise ?? liveState.overview.availableCashOnHandPaise)}
Safety Reserve: ${formatMoney(storedBiz?.safetyThresholdPaise ?? 500_000)}
Receivables: ${formatMoney(summary?.receivablesPaise ?? 0)}
Payables: ${formatMoney(summary?.payablesPaise ?? 0)}
Active Risk Alerts: ${JSON.stringify(summary?.alerts || [])}
Invoices Count: ${invoicesRes?.data?.length ?? 0}
Suppliers Count: ${suppliersRes?.data?.length ?? 0}
Customers Count: ${customersRes?.data?.length ?? 0}
`;

    const systemInstruction = `${liveServerContext}\n\n${liveState.systemPromptString}\n\n[STRICT DIRECTIVE]: You are "Ask Ripple", the AI Financial Copilot. Answer ONLY what the user asked in a direct, crisp, concise manner (2-4 bullet points max or a brief paragraph). Do NOT repeat boilerplate background lectures or explain concepts unprompted. Use exact rupee numbers from the active context and give only the specific answer requested.`;

    try {
      const geminiResponse = await callGeminiAPI({
        prompt: trimmed,
        systemInstruction,
        history: messages.slice(-4).map((m) => ({ role: m.role, text: m.text })),
      });

      const pills: ActionPill[] = [];
      if (lower.includes("simulat") || lower.includes("apex") || lower.includes("delay")) {
        if (isDemo) pills.push({ id: "load_apex", label: "Load Apex Flagship (+16d) Scenario" });
        pills.push({ id: "open_simulator", label: "Open in Ripple Simulator →" });
      }
      if (lower.includes("phase") || lower.includes("supplier")) {
        pills.push({ id: "apply_auto_phase", label: "Execute Auto-Phase Inventory" });
      }
      if (lower.includes("escrow") || lower.includes("cash")) {
        pills.push({ id: "apply_split_escrow", label: "Lock Tri-Party Split-Escrow" });
      }
      if (pills.length === 0) {
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
          widgetType,
          widgetData,
        },
      ]);
    } catch (err) {
      console.warn("Generating deterministic Ask Ripple response:", err);
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
          widgetType,
          widgetData,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  const currentLive = getLiveCrossPageState();

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] gap-4">
      {/* Header with Title and Mode Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-foreground">Ask Ripple</h1>
              <Badge
                variant="outline"
                className="bg-primary/5 text-primary border-primary/20 text-[11px] font-semibold"
              >
                Ripple AI Copilot
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time financial intelligence linked to your live loop and ledger
            </p>
          </div>
        </div>

        {/* Action Toggle */}
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
                  ? "Plain English Mode Enabled"
                  : "Detailed Analysis Mode Enabled",
              );
            }}
            className="h-8 text-xs gap-1.5"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{simpleMode ? "Plain English: ON" : "Plain English: OFF"}</span>
          </Button>
        </div>
      </div>

      {/* Cross-Page Live State Linking Ribbon */}
      <div className="rounded-xl border border-border/70 bg-card/60 p-3 text-xs text-muted-foreground shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
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
            <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 font-semibold">
              Auto-Phase Active
            </Badge>
          )}
          {currentLive.simulator.activeRescues.splitEscrowLocked && (
            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/20 font-semibold">
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

                  {/* Embedded Visual Widgets */}
                  {msg.widgetType === "cash_trajectory" && msg.widgetData && (
                    <ChatCashTrajectoryWidget
                      data={msg.widgetData as ChatCashTrajectoryData}
                      onOpenSimulator={() => navigate({ to: "/simulator" })}
                    />
                  )}

                  {msg.widgetType === "margin_compression" && msg.widgetData && (
                    <ChatMarginCompressionWidget
                      data={msg.widgetData as ChatMarginCompressionData}
                      onAutoPhase={() => handleActionPill("apply_auto_phase")}
                      onSplitEscrow={() => handleActionPill("apply_split_escrow")}
                    />
                  )}

                  {msg.widgetType === "counterparty_table" && msg.widgetData && (
                    <ChatCounterpartyTableWidget
                      data={msg.widgetData as ChatCounterpartyData}
                    />
                  )}

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
                      <span>Answered via Live Deterministic Financial Engine (Zero Downtime)</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
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
          placeholder="Ask Ripple about your cash flow, overdue bills, or profit margins…"
          disabled={loading}
          className="flex-1 rounded-xl border border-border bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-xs"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="rounded-xl bg-primary text-primary-foreground px-5 py-2.5 flex items-center gap-1.5 text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-all shadow-xs cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Ask Ripple</span>
        </button>
      </form>
    </div>
  );
}
