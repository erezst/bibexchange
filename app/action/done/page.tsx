import { Suspense } from "react";
import DoneClient from "./DoneClient";

export default function ActionDonePage() {
  return (
    <main style={{ maxWidth: 560, margin: "40px auto", padding: 16, fontFamily: "system-ui" }}>
      <Suspense fallback={<h1>Processing...</h1>}>
        <DoneClient />
      </Suspense>
      <p style={{ marginTop: 8, opacity: 0.8 }}>You can close this tab and return to your email.</p>
    </main>
  );
}