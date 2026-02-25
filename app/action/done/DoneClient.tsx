"use client";

import { useSearchParams } from "next/navigation";

export default function DoneClient() {
  const sp = useSearchParams();
  const status = sp.get("status");

  const title =
    status === "ok"
      ? "Done ✅"
      : status === "already"
        ? "Already completed ✅"
        : status === "invalid"
          ? "Link not valid"
          : "Done";

  const subtitle =
    status === "ok"
      ? "Your action was recorded."
      : status === "already"
        ? "Nothing to do — this was already handled."
        : status === "invalid"
          ? "This link may have expired or is not applicable anymore."
          : "";

  return (
    <div>
      <h1 style={{ marginBottom: 8 }}>{title}</h1>
      {subtitle ? <p style={{ marginTop: 0, opacity: 0.8 }}>{subtitle}</p> : null}
    </div>
  );
}