import Link from "next/link";
import { Suspense } from "react";

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">🏁</span>
          <span>BibExchange</span>
        </Link>

        {/* No auth buttons */}
        <div className="h-9 w-24" />
      </div>
    </header>
  );
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Suspense
        fallback={
          <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
              <div className="flex items-center gap-2 font-semibold">
                <span className="text-xl">🏁</span>
                <span>BibExchange</span>
              </div>
              <div className="h-9 w-24" />
            </div>
          </header>
        }
      >
        <Header />
      </Suspense>

      <main className="flex-1">{children}</main>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-10 text-sm text-muted-foreground">
          © 2026 BibExchange
        </div>
      </footer>
    </div>
  );
}
