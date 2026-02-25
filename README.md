# BibExchange

BibExchange is a queue-based web platform that enables runners to **fairly exchange race bibs** for sold-out events.

When a seller can no longer participate in a race, the system matches them — in order — with a buyer from a waiting queue. The platform coordinates confirmations, manages expirations, and sends secure action links via email to ensure a transparent and fraud-resistant process.

---

## 🚀 Features

* 🔐 **Authentication** via Supabase (email/password)
* 🧾 **Seller listings** for specific race events
* 🕒 **Buyer queue system** (first-come, first-served)
* 🤝 **Automated matching engine**
* ⏳ **Match expiration logic**
* 🔁 **Pass / requeue functionality**
* 📧 **Transactional email flow (Brevo)**
* 🔒 **Signed action links (HMAC-based)**
* ⏰ **Secure cron endpoints**
* ☁️ Designed for **serverless deployment (Vercel)**

---

## 🏗 Repository Structure

```
app/
  page.tsx                # Home page
  auth/                   # Login, signup, password reset flows
  api/
    action/               # Buyer/Seller action endpoints
    cron/                 # Scheduled backend jobs
  action/                 # Client/server action pages (e.g. /action/done)

components/               # React components
lib/
  match/                  # Matching and expiration logic
  email/                  # Email rendering + sending (Brevo)
  supabase/               # Supabase client helpers
  actionLinks.ts          # Signed action link generation & verification
  cronAuth.ts             # Cron request authentication
  supabaseAdmin.ts        # Service-role Supabase client

.env.example              # Environment variable template
```

---

## ⚙️ Environment Variables

Create a `.env.local` file in the root of the project:

```env
# Update these with your Supabase details from your project settings > API
# https://app.supabase.com/project/_/settings/api
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key

# --- Server (required for backend) ---
SUPABASE_URL=your-supabsae-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# --- Security ---
CRON_SECRET=your-cron-secret
ACTION_LINK_SECRET=your-strong-random-secret

# --- Email ---
BREVO_API_KEY=your-brevo-api-key

# --- App ---
BIBEX_BASE_URL=your-app-url
```

---

### 🔎 Variable Explanation

| Variable                               | Purpose                                      |
| -------------------------------------- | -------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | Public Supabase project URL (browser use)    |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public anon/publishable key                  |
| `SUPABASE_URL`                         | Supabase project URL (server-side)           |
| `SUPABASE_SERVICE_ROLE_KEY`            | Service role key (admin access; server-only) |
| `CRON_SECRET`                          | Required header secret for cron endpoints    |
| `ACTION_LINK_SECRET`                   | HMAC secret used to sign action links        |
| `BREVO_API_KEY`                        | API key for sending transactional emails     |
| `BIBEX_BASE_URL`                       | Base URL for building action links           |

---

## 🛠 Local Development

### 1. Clone repository

```bash
git clone https://github.com/erezst/bibexchange.git
cd bibexchange
```

### 2. Install dependencies

```bash
pnpm install
# or
npm install
```

### 3. Configure environment

Create `.env.local` using the template above.

### 4. Run development server

```bash
pnpm dev
# or
npm run dev
```

App runs at:

```
http://localhost:3000
```

---

## 🗄 Database (Supabase)

You must create the required tables in Supabase:

Typical tables:

* `events`
* `buyer_queue`
* `sellers`
* `matches`
* `outbox` (pending emails)

The matching logic in `lib/match/` expects fields such as:

* `status`
* `match_id`
* timestamps
* expiration times

Ensure:

* Row Level Security (RLS) policies are configured
* Service role key is **never exposed to the client**
* Only backend code uses `SUPABASE_SERVICE_ROLE_KEY`

---

## ⏰ Cron Endpoints

Located under:

```
/api/cron/
```

### Available Jobs

| Endpoint                   | Purpose                   |
| -------------------------- | ------------------------- |
| `/api/cron/matchmaker`     | Creates new matches       |
| `/api/cron/expire-matches` | Expires timed-out matches |
| `/api/cron/send-emails`    | Sends pending emails      |
| `/api/cron/tick`           | Combined periodic job     |

All cron endpoints require:

```
Header: x-cron-secret: <CRON_SECRET>
```

Without it, they return `401 Unauthorized`.

---

## 🔐 Action Links

Action links are:

* HMAC-signed
* Time-limited
* Role-aware (buyer/seller)
* Built using `ACTION_LINK_SECRET`

They prevent tampering and replay attacks.

Example flow:

1. Match created
2. Seller receives signed link
3. Seller confirms transfer
4. Buyer confirms receipt
5. Match finalized

---

## 📧 Email (Brevo)

Emails are sent via:

```
https://api.brevo.com/v3/smtp/email
```

Configured using:

```
BREVO_API_KEY
```

Emails are generated in:

```
lib/email/render.ts
```

Queued via:

```
outbox table
```

Sent by:

```
/api/cron/send-emails
```

---

## 🚀 Deployment (Recommended: Vercel)

### 1. Connect GitHub repo in Vercel

### 2. Add all environment variables in Project Settings

### 3. Configure cron jobs in:

```
Settings → Cron Jobs
```

Example:

* Call `/api/cron/tick` every minute

### 4. Deploy

Push to `main` branch → automatic deployment.

---

## 🔒 Security Notes

* Never expose `SUPABASE_SERVICE_ROLE_KEY` in client code.
* Never prefix sensitive keys with `NEXT_PUBLIC_`.
* Use long, random values for:

  * `CRON_SECRET`
  * `ACTION_LINK_SECRET`
* Ensure email sender domain is verified in Brevo.
* Enable RLS in Supabase.

---

## 🧠 Architecture Summary

* **Frontend:** Next.js (App Router)
* **Auth & DB:** Supabase
* **Email:** Brevo
* **Matching Engine:** Custom logic in `lib/match`
* **Security:** HMAC-signed action tokens
* **Hosting:** Vercel (Serverless)

---

## 📌 Purpose

BibExchange provides a **fair, transparent, queue-based alternative** to chaotic Facebook groups and unsafe direct transfers — helping runners exchange bibs securely and efficiently.
