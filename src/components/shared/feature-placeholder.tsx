import type { LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";

interface FeaturePlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  planned: string[];
}

/**
 * Polished placeholder for feature pages scheduled in later phases.
 * Keeps every route functional while the foundation settles.
 */
export function FeaturePlaceholder({
  title,
  description,
  icon: Icon,
  planned,
}: FeaturePlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={<Badge variant="secondary">Coming in the next phase</Badge>}
      />
      <div className="rounded-lg border bg-card p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-5 w-5 text-primary" aria-hidden />
          </div>
          <h2 className="text-base font-semibold text-foreground">What's planned here</h2>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {planned.map((item) => (
            <li
              key={item}
              className="flex items-start gap-2 rounded-md border bg-background px-3 py-2.5 text-sm text-muted-foreground"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
