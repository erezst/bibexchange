import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <span className="text-xl">🏁</span>
            <span>BibExchange</span>
          </Link>

          <nav className="flex items-center gap-2">
            <Link href="/auth/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Sign up</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* background */}
          <div className="absolute inset-0 -z-10">
            <div className="absolute -top-24 left-1/2 h-72 w-[48rem] -translate-x-1/2 rounded-full bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-orange-500/20 blur-3xl" />
            <div className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-500/15 to-blue-500/15 blur-3xl" />
          </div>

          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <div className="mx-auto max-w-2xl text-center">

              <h1 className="text-4xl font-bold tracking-tight md:text-6xl">
                The fair way to <span className="text-blue-600">transfer</span>{" "}
                race bibs.
              </h1>

              <p className="mt-6 text-lg text-muted-foreground md:text-xl">
                Join a transparent queue to buy or transfer race bibs — no chaos,
                no spam, no endless scrolling.
              </p>

              <div className="mt-10 flex justify-center">
                <Link href="/auth/sign-up">
                  <Button size="lg" className="px-8">
                    Sign up to trade bibs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                How it works
              </h2>
              <p className="mt-3 text-muted-foreground">
                Simple, transparent, and designed to reduce noise for both
                buyers and sellers.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Feature
                icon="🤝"
                title="One place for buyers and sellers"
                text="No more scattered posts. Everyone joins the same transparent queue."
              />
              <Feature
                icon="🔄"
                title="No more bib hunting"
                text="Stop refreshing feeds and racing other buyers. Your position is fixed and fair."
              />
              <Feature
                icon="📩"
                title="No 200 DMs"
                text="Sellers are automatically matched to the next eligible buyer. No inbox chaos."
              />
              <Feature
                icon="🔐"
                title="Official transfers only"
                text="All transfers happen through the official race website. No risky handovers."
              />
              <Feature
                icon="⚖️"
                title="First come, first served"
                text="Matches happen strictly by queue order. No favoritism. No shortcuts."
              />
              <Card className="rounded-2xl border bg-background">
                <CardContent className="p-6">
                  <div className="text-3xl">🚀</div>
                  <div className="mt-3 text-lg font-semibold">Get started</div>
                  <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li>1) Create an account</li>
                    <li>2) Join the buyer queue (or list your transfer)</li>
                    <li>3) Get matched automatically</li>
                  </ol>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Why */}
        <section className="border-t">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:items-center">
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">
                  Built by runners, for runners.
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Major races sell out fast. Plans change. BibExchange connects
                  runners who can’t attend with runners still hoping to race —
                  in a way that’s fair for everyone.
                </p>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-6">
                <div className="text-sm text-muted-foreground">
                  Key rules
                </div>
                <ul className="mt-4 space-y-3 text-sm">
                  <li className="flex gap-3">
                    <span>✅</span>
                    <span>FIFO queue: oldest waiting buyer matches first</span>
                  </li>
                  <li className="flex gap-3">
                    <span>✅</span>
                    <span>Transfers happen only on official race sites</span>
                  </li>
                  <li className="flex gap-3">
                    <span>✅</span>
                    <span>No payments handled on BibExchange</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t bg-muted/20">
          <div className="mx-auto max-w-6xl px-6 py-16 md:py-20">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">
                Ready to trade your bib the right way?
              </h2>
              <p className="mt-3 text-muted-foreground">
                Join the queue and let the matching happen automatically.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/auth/sign-up">
                  <Button size="lg" className="px-8">
                    Sign up to trade bibs
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between">
            
            <div>© 2026 BibExchange</div>

            <div className="flex gap-6">
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Terms of Service
              </Link>
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacy Policy
              </Link>
            </div>

          </div>
        </footer>

      </main>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <Card className="rounded-2xl border bg-background">
      <CardContent className="p-6">
        <div className="text-3xl">{icon}</div>
        <div className="mt-3 text-lg font-semibold">{title}</div>
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      </CardContent>
    </Card>
  );
}
