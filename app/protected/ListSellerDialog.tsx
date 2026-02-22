"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useActionState } from "react";

type EventOption = {
  id: string;
  name: string;
  distance_label: string | null;
};

type ActionState = { ok: boolean; message?: string };

function SubmitButton({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled}>
      {pending ? "Saving..." : children}
    </Button>
  );
}

export default function ListSellerDialog({
  events,
  listSellerAction,
  triggerText = "List my bib to transfer",
}: {
  events: EventOption[];
  listSellerAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  triggerText?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [eventId, setEventId] = React.useState("");
  const [confirmed, setConfirmed] = React.useState(false);

  const [state, formAction] = useActionState<ActionState, FormData>(listSellerAction, {
    ok: true,
  });

  React.useEffect(() => {
    if (open && state?.ok && state?.message === "success") setOpen(false);
  }, [open, state]);

  const error = state && !state.ok ? state.message : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{triggerText}</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>List a bib for transfer</DialogTitle>
          <DialogDescription>
            Select the event and confirm you own the bib. We’ll match you automatically.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="event_id" value={eventId} />
          <input type="hidden" name="owner_confirmed" value={confirmed ? "yes" : ""} />

          <div className="space-y-2">
            <div className="text-sm font-medium">Event</div>
            <Select value={eventId} onValueChange={setEventId}>
              <SelectTrigger className="rounded-xl">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                    {e.distance_label ? ` • ${e.distance_label}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-start gap-3 rounded-xl border bg-muted/20 p-3">
            <Checkbox
              checked={confirmed}
              onCheckedChange={(v) => setConfirmed(Boolean(v))}
              className="mt-0.5"
            />
            <span className="text-sm">
              I confirm I own this bib and I’m willing to transfer it to whoever the system matches.
            </span>
          </label>

          {error ? (
            <div className="rounded-xl border bg-muted/30 p-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <SubmitButton disabled={!confirmed}>List my Bib</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
