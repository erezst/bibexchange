import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

async function HeaderAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/");
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="text-xl">🏁</span>
          <span>BibExchange</span>
        </Link>

        <div className="flex items-center gap-3">
          {user ? (
            <form action={signOut}>
              <Button variant="ghost" type="submit">
                Sign out
              </Button>
            </form>
          ) : (
            <>
              <Link href="/auth/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
              <Link href="/auth/sign-up">
                <Button>Sign up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <div className="flex min-h-screen flex-col">
          {/* Auth header must be under Suspense */}
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
            <HeaderAuth />
          </Suspense>

          <main className="flex-1">{children}</main>

          <footer className="border-t">
            <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-10 text-sm text-muted-foreground">
              © 2026 BibExchange
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
