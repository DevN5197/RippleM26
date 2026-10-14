import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Copy, Check, Bell, Mail } from "lucide-react";
import { toast } from "sonner";
import type { OverdueReminderPayload } from "@/lib/api/invoiceApi";

interface OverdueReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminderData: OverdueReminderPayload | null;
}

export function OverdueReminderDialog({
  open,
  onOpenChange,
  reminderData,
}: OverdueReminderDialogProps) {
  const [copied, setCopied] = useState(false);
  const [editedBody, setEditedBody] = useState("");

  React.useEffect(() => {
    if (reminderData) {
      setEditedBody(reminderData.body);
      setCopied(false);
    }
  }, [reminderData, open]);

  if (!reminderData) return null;

  const handleCopy = async () => {
    try {
      const fullText = `Subject: ${reminderData.subject}\n\n${editedBody}`;
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success("Reminder message copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy reminder to clipboard.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-amber-600" />
            <DialogTitle>Overdue Payment Reminder Preview</DialogTitle>
          </div>
          <DialogDescription>
            Preview and copy a formalized payment notice for invoice {reminderData.invoiceNumber} (
            {reminderData.daysOverdue} days overdue).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3.5 py-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <Label className="text-xs text-muted-foreground">To</Label>
              <Input
                value={`${reminderData.recipientName} <${reminderData.recipientEmail}>`}
                readOnly
                className="mt-1 h-8 text-xs bg-muted/40 font-mono"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Due Date</Label>
              <Input
                value={`${reminderData.dueDate} (${reminderData.daysOverdue}d overdue)`}
                readOnly
                className="mt-1 h-8 text-xs bg-muted/40 font-semibold text-destructive"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Subject Line</Label>
            <Input
              value={reminderData.subject}
              readOnly
              className="mt-1 h-8 text-xs bg-muted/40 font-medium"
            />
          </div>

          <div>
            <Label htmlFor="reminder-body" className="text-xs text-muted-foreground">
              Message Body (Editable)
            </Label>
            <Textarea
              id="reminder-body"
              value={editedBody}
              onChange={(e) => setEditedBody(e.target.value)}
              rows={10}
              className="mt-1 text-xs font-mono leading-relaxed resize-y"
            />
          </div>
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              asChild
            >
              <a
                href={`mailto:${reminderData.recipientEmail}?subject=${encodeURIComponent(
                  reminderData.subject,
                )}&body=${encodeURIComponent(editedBody)}`}
              >
                <Mail className="mr-1.5 h-3.5 w-3.5" />
                Open Email Client
              </a>
            </Button>
            <Button type="button" size="sm" onClick={handleCopy}>
              {copied ? (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy Reminder
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
