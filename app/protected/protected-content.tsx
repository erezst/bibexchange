import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type BibRow = {
  id: number;
  kind: "buying" | "selling";
  raceName: string;
  distanceLabel: string;
  status: string;
  createdAt: string;
};

function statusLabel(status: string) {
  switch (status) {
    case "waiting":
      return "Waiting";
    case "matched":
      return "Matched";
    case "confirmed":
      return "Completed";
    case "expired":
      return "Expired";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function statusHint(kind: BibRow["kind"], status: string) {
  if (status === "waiting") {
    return kind === "buying" ? "Waiting for seller" : "Waiting for buyer";
  }
  if (status === "matched") return "Matched — check email";
  if (status === "confirmed") return "Completed";
  if (status === "expired") return "Expired";
  if (status === "cancelled") return "Cancelled";
  return statusLabel(status);
}

function KindBadge({ kind }: { kind: BibRow["kind"] }) {
  const isBuying = kind === "buying";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        isBuying
          ? "bg-blue-600/10 text-blue-700 border border-blue-600/20"
          : "bg-red-600/10 text-red-700 border border-red-600/20",
      ].join(" ")}
    >
      {isBuying ? "Buying" : "Selling"}
    </span>
  );
}

function StatusBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full border bg-muted/30 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      {text}
    </span>
  );
}

export default async function ProtectedContent() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
  }

  async function cancelIntent(formData: FormData) {
    "use server";
    const kind = String(formData.get("kind") || "");
    const id = Number(formData.get("id") || 0);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) redirect("/auth/login");
    if (!id || (kind !== "buying" && kind !== "selling")) redirect("/protected");

    if (kind === "buying") {
      await supabase
        .from("buyer_queue")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("status", "waiting");
    } else {
      await supabase
        .from("sellers")
        .update({ status: "cancelled" })
        .eq("id", id)
        .eq("status", "waiting");
    }

    redirect("/protected");
  }

  const { data: buying, error: buyingErr } = await supabase
    .from("buyer_queue")
    .select("id,status,joined_at,events(name,distance_label)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const { data: selling, error: sellingErr } = await supabase
    .from("sellers")
    .select("id,status,created_at,events(name,distance_label)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (buyingErr) console.error(buyingErr);
  if (sellingErr) console.error(sellingErr);

  const rows: BibRow[] = [
    ...(buying ?? []).map((r: any) => ({
      id: r.id,
      kind: "buying" as const,
      raceName: r.events?.name ?? "Unknown race",
      distanceLabel: r.events?.distance_label ?? "",
      status: r.status,
      createdAt: r.joined_at,
    })),
    ...(selling ?? []).map((r: any) => ({
      id: r.id,
      kind: "selling" as const,
      raceName: r.events?.name ?? "Unknown race",
      distanceLabel: r.events?.distance_label ?? "",
      status: r.status,
      createdAt: r.created_at,
    })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">My Bibs</h1>
          <p className="text-muted-foreground">
            Your buying and selling requests and their status.
          </p>
        </div>

        <section className="mt-8">
          {rows.length === 0 ? (
            <Card className="rounded-2xl">
              <CardContent className="p-8">
                <div className="text-lg font-semibold">No active bibs yet</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start by joining a buyer queue or listing your bib to transfer.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link href="/buy">
                    <Button>Buy</Button>
                  </Link>
                  <Link href="/sell">
                    <Button variant="outline">Sell</Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="hidden md:block">
                <Card className="rounded-2xl">
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Race</TableHead>
                          <TableHead className="w-[110px]">Distance</TableHead>
                          <TableHead className="w-[120px]">Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-[60px] text-right"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={`${row.kind}-${row.id}`}>
                            <TableCell className="font-medium">
                              {row.raceName}
                            </TableCell>
                            <TableCell>{row.distanceLabel}</TableCell>
                            <TableCell>
                              <KindBadge kind={row.kind} />
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <StatusBadge
                                  text={statusHint(row.kind, row.status)}
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <RowMenu row={row} cancelAction={cancelIntent} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>

              <div className="md:hidden space-y-3">
                {rows.map((row) => (
                  <Card key={`${row.kind}-${row.id}`} className="rounded-2xl">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-semibold">
                            {row.raceName}
                            {row.distanceLabel ? ` • ${row.distanceLabel}` : ""}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <KindBadge kind={row.kind} />
                            <StatusBadge
                              text={statusHint(row.kind, row.status)}
                            />
                          </div>
                        </div>

                        <RowMenu row={row} cancelAction={cancelIntent} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="mt-10 grid gap-6 md:grid-cols-2">
          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="text-3xl">🛒</div>
              <div className="mt-3 text-xl font-semibold">Buy</div>
              <p className="mt-2 text-sm text-muted-foreground">
                Join the queue for a race and get matched fairly — first come,
                first served.
              </p>
              <div className="mt-5">
                <Link href="/buy">
                  <Button>Join buyer queue</Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-6">
              <div className="text-3xl">🎟️</div>
              <div className="mt-3 text-xl font-semibold">Sell</div>
              <p className="mt-2 text-sm text-muted-foreground">
                List your transfer intent and we’ll match you with the next
                buyer automatically.
              </p>
              <div className="mt-5">
                <Link href="/sell">
                  <Button variant="outline">List my bib to transfer</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

function RowMenu({
  row,
  cancelAction,
}: {
  row: BibRow;
  cancelAction: (formData: FormData) => Promise<void>;
}) {
  const canCancel = row.status === "waiting";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Row actions">
          <span className="text-xl leading-none">⋯</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <form action={cancelAction}>
          <input type="hidden" name="kind" value={row.kind} />
          <input type="hidden" name="id" value={row.id} />
          <DropdownMenuItem asChild>
            <button
              type="submit"
              className="w-full text-left"
              disabled={!canCancel}
              title={canCancel ? "Cancel this request" : "Can only cancel while Waiting (MVP)"}
            >
              Cancel
            </button>
          </DropdownMenuItem>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
