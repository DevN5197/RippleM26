import React from "react";
import { Inbox, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  action?: React.ReactNode | { label: string; onClick?: () => void };
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
  action,
}: EmptyStateProps) {
  const renderedAction = action ? (
    React.isValidElement(action) ? (
      action
    ) : typeof action === "object" && "label" in action ? (
      <Button size="sm" onClick={(action as { onClick?: () => void }).onClick}>
        {(action as { label: string }).label}
      </Button>
    ) : null
  ) : actionLabel && onAction ? (
    <Button size="sm" onClick={onAction}>
      {actionLabel}
    </Button>
  ) : null;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-16 text-center">
      {Icon && (
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
          <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
        </div>
      )}
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {renderedAction ? <div className="mt-4">{renderedAction}</div> : null}
    </div>
  );
}
