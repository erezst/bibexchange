import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | BibExchange",
  description: "Terms of Service for BibExchange.",
};

const LAST_UPDATED = "February 19, 2026";

const sections = [
  { id: "introduction", title: "Introduction" },
  { id: "service", title: "Nature of the service" },
  { id: "no-affiliation", title: "No affiliation" },
  { id: "responsibilities", title: "User responsibilities" },
  { id: "payments", title: "Payments & pricing" },
  { id: "prohibited", title: "Prohibited conduct" },
  { id: "warranty", title: "No warranty" },
  { id: "liability", title: "Limitation of liability" },
  { id: "indemnification", title: "Indemnification" },
  { id: "termination", title: "Termination" },
  { id: "changes", title: "Changes to these terms" },
  { id: "law", title: "Governing law" },
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

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            Home
          </Link>
          <span>/</span>
          <span>Terms</span>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              BibExchange is a free matching tool. We don’t take payments, we don’t run transfers —
              we simply connect users.
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
              Questions? Contact{" "}
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
            <SectionTitle id="introduction">1. Introduction</SectionTitle>
            <p>
              Welcome to BibExchange ("BibExchange", "we", "us", "our"). By using the platform,
              you agree to these Terms of Service. If you do not agree, do not use the platform.
            </p>

            <SectionTitle id="service">2. Nature of the service</SectionTitle>
            <p>BibExchange is a neutral matching platform.</p>
            <p>We:</p>
            <ul>
              <li>Connect potential buyers and sellers of race bibs</li>
              <li>Facilitate queue-based matching</li>
              <li>Provide email-based introductions</li>
            </ul>
            <p>We do not:</p>
            <ul>
              <li>Process payments or hold funds</li>
              <li>Verify user identity, bib ownership, or bib validity</li>
              <li>Guarantee successful transfers or match outcomes</li>
              <li>Enforce race organizer policies</li>
              <li>Act as a broker, agent, or intermediary</li>
            </ul>
            <p>BibExchange is not a party to any transaction between users.</p>

            <SectionTitle id="no-affiliation">3. No affiliation</SectionTitle>
            <p>
              BibExchange is not affiliated with, endorsed by, or connected to any race organizer,
              marathon event, sports federation, or governing body. Any race names used on the
              platform are for descriptive purposes only.
            </p>

            <SectionTitle id="responsibilities">4. User responsibilities</SectionTitle>
            <ul>
              <li>You will provide truthful and accurate information</li>
              <li>You will only list a bib that you legally own and are eligible to transfer</li>
              <li>You are solely responsible for complying with race organizer rules</li>
              <li>You understand transfer approval depends entirely on the race organizer</li>
              <li>You assume full responsibility for any agreement you enter into</li>
            </ul>

            <SectionTitle id="payments">5. Payments & pricing</SectionTitle>
            <p>
              BibExchange does not set prices, recommend prices, process payments, or monitor
              financial transactions. All financial arrangements are handled privately between users.
            </p>
            <p>
              Users are solely responsible for ensuring that any resale complies with applicable race
              rules and local laws. BibExchange is not responsible for disputes, overpricing, fraud,
              chargebacks, or financial losses.
            </p>

            <SectionTitle id="prohibited">6. Prohibited conduct</SectionTitle>
            <ul>
              <li>Publishing false or misleading information</li>
              <li>Listing bibs you do not own</li>
              <li>Attempting to sell the same bib multiple times</li>
              <li>Impersonation</li>
              <li>Using bots, scraping tools, or automated systems</li>
              <li>Interfering with platform functionality</li>
              <li>Harassment or spam</li>
            </ul>
            <p>We may suspend or remove users at our sole discretion.</p>

            <SectionTitle id="warranty">7. No warranty</SectionTitle>
            <p>
              The platform is provided “as is” and “as available”. We do not guarantee that you will
              receive a match, that a bib is valid, that a transfer will be approved, or continuous
              availability of the service.
            </p>

            <SectionTitle id="liability">8. Limitation of liability</SectionTitle>
            <p>
              To the maximum extent permitted by law, BibExchange shall not be liable for fraud,
              failed transfers, financial losses, invalid registrations, race organizer refusal, or
              indirect or consequential damages. Because the service is provided free of charge,
              liability is strictly limited.
            </p>

            <SectionTitle id="indemnification">9. Indemnification</SectionTitle>
            <p>
              You agree to indemnify and hold BibExchange harmless from any claims, disputes,
              damages, or expenses arising from your use of the platform, your transactions with
              other users, or your violation of race rules or applicable laws.
            </p>

            <SectionTitle id="termination">10. Termination</SectionTitle>
            <p>
              We may suspend or terminate access to the platform at any time, without notice, for any
              reason.
            </p>

            <SectionTitle id="changes">11. Changes to these terms</SectionTitle>
            <p>
              We may update these Terms at any time. Continued use of the platform constitutes
              acceptance of updated Terms.
            </p>

            <SectionTitle id="law">12. Governing law</SectionTitle>
            <p>
              These Terms are governed by the laws of the State of Israel. Any disputes shall be
              subject to the competent courts of Israel.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
