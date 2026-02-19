import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <div className="flex min-h-screen flex-col">

          {/* Header */}
          <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
              <Link
                href="/"
                className="flex items-center gap-2 font-semibold"
              >
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

          {/* Page Content */}
          <main className="flex-1">{children}</main>

          {/* Footer */}
          <footer className="border-t">
            <div className="mx-auto flex max-w-6xl items-center justify-center px-6 py-10 text-sm text-muted-foreground">
              © {new Date().getFullYear()} BibExchange
            </div>
          </footer>

        </div>
      </body>
    </html>
  );
}
