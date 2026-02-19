import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | BibExchange",
  description: "Privacy Policy for BibExchange.",
};

const LAST_UPDATED = "February 19, 2026";

const sections = [
  { id: "overview", title: "Overview" },
  { id: "collect", title: "Information we collect" },
  { id: "use", title: "How we use information" },
  { id: "sharing", title: "Data sharing" },
  { id: "retention", title: "Data retention" },
  { id: "deletion", title: "Account deletion" },
  { id: "security", title: "Security" },
  { id: "cookies", title: "Cookies" },
  { id: "rights", title: "Your rights (EU users)" },
  { id: "changes", title: "Changes to this policy" },
];

function SectionTitle({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  return (
    <h2 id={id} className="scroll-mt-24 text-xl font-semibold tracking-tight">
      {children}
    </h2>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span>/</span>
          <span>Privacy</span>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              We collect the minimum needed to run BibExchange: your email, your requests, and basic
              logs for reliability and debugging.
            </p>
          </div>

          <div className="inline-flex items-center rounded-full border px-3 py-1 text-xs text-muted-foreground">
            Last updated: <span className="ml-1 text-foreground">{LAST_UPDATED}</span>
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        {/* Side nav */}
        <aside className="md:sticky md:top-20 h-fit">
          <div className="rounded-xl border bg-background p-4">
            <div className="mb-3 text-sm font-medium">On this page</div>
            <nav className="space-y-1">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block rounded-md px-2 py-1 text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  {s.title}
                </a>
              ))}
            </nav>

            <div className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              Privacy questions? Email{" "}
              <a
                className="underline underline-offset-4 hover:text-foreground"
                href="mailto:contact@bibexchange.xyz"
              >
                contact@bibexchange.xyz
              </a>
              .
            </div>
          </div>
        </aside>

        {/* Main card */}
        <article className="rounded-2xl border bg-background p-6 md:p-8">
          <div className="prose prose-neutral max-w-none">
            <SectionTitle id="overview">1. Overview</SectionTitle>
            <p>
              BibExchange respects your privacy. This policy explains what information we collect
              and how it is used.
            </p>

            <SectionTitle id="collect">2. Information we collect</SectionTitle>
            <p>We collect only limited information necessary to operate the platform:</p>
            <ul>
              <li>Email address</li>
              <li>Buy/Sell request data</li>
              <li>Queue participation data</li>
              <li>Basic technical logs (IP address, browser type, timestamps)</li>
              <li>Authentication-related data (if using Google login or similar)</li>
            </ul>
            <p>We do not collect payment information.</p>

            <SectionTitle id="use">3. How we use information</SectionTitle>
            <ul>
              <li>Create and manage accounts</li>
              <li>Match buyers and sellers</li>
              <li>Send transactional emails</li>
              <li>Prevent abuse</li>
              <li>Maintain and debug the platform</li>
            </ul>

            <SectionTitle id="sharing">4. Data sharing</SectionTitle>
            <p>
              We do not sell personal data. We may share limited data with service providers strictly
              for platform operation (for example: hosting, email delivery, authentication). These
              providers process data only as necessary to operate the service.
            </p>

            <SectionTitle id="retention">5. Data retention</SectionTitle>
            <p>
              We retain personal data as long as your account remains active, as necessary to provide
              the service, and for limited periods in system logs for security and debugging.
            </p>

            <SectionTitle id="deletion">6. Account deletion</SectionTitle>
            <p>
              You may request deletion of your account and associated personal data by emailing{" "}
              <a href="mailto:contact@bibexchange.xyz">contact@bibexchange.xyz</a>. We will process
              deletion requests within a reasonable timeframe (typically within 30 days), unless
              retention is required for legal or security reasons.
            </p>

            <SectionTitle id="security">7. Security</SectionTitle>
            <p>
              We implement reasonable technical safeguards to protect your data. However, no system
              is completely secure.
            </p>

            <SectionTitle id="cookies">8. Cookies</SectionTitle>
            <p>
              The platform may use essential cookies for authentication, session management, and
              security. We do not use advertising cookies.
            </p>

            <SectionTitle id="rights">9. Your rights (EU users)</SectionTitle>
            <p>
              If you are located in the European Union, you have the right to access your personal
              data, request correction, request deletion, and withdraw consent. To exercise these
              rights, contact <a href="mailto:contact@bibexchange.xyz">contact@bibexchange.xyz</a>.
            </p>

            <SectionTitle id="changes">10. Changes to this policy</SectionTitle>
            <p>
              We may update this Privacy Policy periodically. Continued use of the platform
              constitutes acceptance of changes.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
