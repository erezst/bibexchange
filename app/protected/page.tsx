import { Suspense } from "react";
import { Card, CardContent } from "@/components/ui/card";

import ProtectedContent from "./protected-content";

export default function ProtectedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background">
          <div className="mx-auto max-w-6xl px-6 py-10">
            <Card className="rounded-2xl">
              <CardContent className="p-8">
                <div className="text-lg font-semibold">Loading…</div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Preparing your dashboard.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <ProtectedContent />
    </Suspense>
  );
}
