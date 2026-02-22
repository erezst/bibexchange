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
import { useActionState } from "react";

type EventOption = {
  id: string;
  name: string;
  distance_label: string | null;
};

type ActionState = { ok: boolean; message?: string };

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Saving..." : children}
    </Button>
  );
}

export default function JoinBuyerDialog({
  events,
  joinBuyerAction,
  triggerText = "Join buyer queue",
}: {
  events: EventOption[];
  joinBuyerAction: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  triggerText?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [eventId, setEventId] = React.useState("");

  const [state, formAction] = useActionState<ActionState, FormData>(joinBuyerAction, {
    ok: true,
  });

  React.useEffect(() => {
    // redirect() will close page anyway; but if you later switch to revalidatePath(), this helps.
    if (open && state?.ok && state?.message === "success") setOpen(false);
  }, [open, state]);

  const error = state && !state.ok ? state.message : null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{triggerText}</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px] rounded-2xl">
        <DialogHeader>
          <DialogTitle>Join buyer queue</DialogTitle>
          <DialogDescription>
            Select an event. Matching is fair: first come, first served.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="event_id" value={eventId} />

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
            <SubmitButton>Confirm</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
