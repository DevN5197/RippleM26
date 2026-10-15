import { createFileRoute } from "@tanstack/react-router";
import { Sparkles, Send, Bot, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";

export const Route = createFileRoute("/_app/insights")({
  head: () => ({
    meta: [
      { title: "Insights & AI — Ripple" },
      {
        name: "description",
        content: "AI-generated recommendations to protect your cash position.",
      },
      { property: "og:title", content: "Insights & AI — Ripple" },
      { property: "og:description", content: "Recommendations ranked by cash impact." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: InsightsPage,
});

type Message = { role: "user" | "bot"; text: string };

const SUGGESTIONS = [
  "How can I improve my cash flow?",
  "Which invoices are overdue?",
  "Am I at risk of a cash crunch?",
  "How's my supplier payment health?",
];

const BOT_RESPONSES: Record<string, string> = {
  default:
    "I'm your Ripple AI assistant. I can help you understand your cash flow, receivables, payables, and financial risk. Ask me anything about your business finances!",
  cash: "💡 Your cash flow could be improved by following up on 3 overdue invoices totalling ₹1,24,500. Accelerating collections by even 7 days would add ~₹18,000 to your average daily balance.",
  invoice:
    "📋 You have 4 overdue invoices. The oldest is 23 days past due from a key customer. Sending a reminder today could recover ₹54,000 within the week.",
  risk: "⚠️ Based on your current runway and upcoming payables, you may face a cash gap in ~18 days. Consider delaying a non-critical supplier payment or accelerating a pending receipt to bridge the gap.",
  supplier:
    "🤝 Your supplier payment health looks good — 92% on-time rate this quarter. However, one supplier is close to their credit limit. Paying ₹30,000 now would prevent a potential supply disruption.",
};

const DEFAULT_BOT_REPLY =
  BOT_RESPONSES["default"] ?? "I'm here to help with your business finances.";

function getBotReply(input: string): string {
  const lower = input.toLowerCase();
  if (lower.includes("cash") || lower.includes("flow"))
    return BOT_RESPONSES["cash"] ?? DEFAULT_BOT_REPLY;
  if (lower.includes("invoice") || lower.includes("overdue"))
    return BOT_RESPONSES["invoice"] ?? DEFAULT_BOT_REPLY;
  if (lower.includes("risk") || lower.includes("crunch") || lower.includes("gap"))
    return BOT_RESPONSES["risk"] ?? DEFAULT_BOT_REPLY;
  if (lower.includes("supplier") || lower.includes("payment") || lower.includes("health"))
    return BOT_RESPONSES["supplier"] ?? DEFAULT_BOT_REPLY;
  return DEFAULT_BOT_REPLY;
}

function InsightsPage() {
  const [messages, setMessages] = useState<Message[]>([{ role: "bot", text: DEFAULT_BOT_REPLY }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { role: "bot", text: getBotReply(trimmed) }]);
      setLoading(false);
    }, 800);
  }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto px-4 py-6 gap-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Sparkles className="text-primary w-5 h-5" />
        <h1 className="text-xl font-semibold text-foreground">Insights & AI</h1>
      </div>

      {/* Chat window */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-3 bg-card rounded-2xl border border-border p-4 min-h-0 max-h-[calc(100vh-260px)]">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "bot" && (
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              {msg.text}
            </div>
            {msg.role === "user" && (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-2 justify-start">
            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            className="text-xs border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/40 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input row */}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about cash flow, invoices, risk…"
          className="flex-1 rounded-xl border border-border bg-card px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="rounded-xl bg-primary text-primary-foreground px-4 py-2 flex items-center gap-1.5 text-sm font-medium disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
