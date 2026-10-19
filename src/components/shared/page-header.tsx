import React, { type ReactNode } from "react";

interface PageHeaderProps {
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
}

const ACCENT_WORDS = new Set([
  "Overview",
  "Contagion",
  "Invoices",
  "Network",
  "Planning",
  "Inventory",
  "Settings",
  "Relationships",
  "Simulator",
  "Flow",
  "Intelligence",
  "Disbursements",
  "Customers",
  "Suppliers",
  "Cockpit",
  "Ledger",
  "Forecast",
  "Business",
]);

function renderEditorialTitle(title: ReactNode): ReactNode {
  if (typeof title !== "string") return title;
  const words = title.split(" ");
  return words.map((word, i) => {
    const clean = word.replace(/[^a-zA-Z]/g, "");
    if (ACCENT_WORDS.has(clean)) {
      return (
        <React.Fragment key={i}>
          {i > 0 && " "}
          <em className="font-serif-italic text-[1.08em]">{word}</em>
        </React.Fragment>
      );
    }
    return (
      <React.Fragment key={i}>
        {i > 0 && " "}
        {word}
      </React.Fragment>
    );
  });
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 pb-1">
      <div className="min-w-0">
        <h1 className="font-medium tracking-[-0.04em] text-2xl sm:text-3xl text-white">
          {renderEditorialTitle(title)}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-xs sm:text-sm leading-relaxed text-[#9a9a9a]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
