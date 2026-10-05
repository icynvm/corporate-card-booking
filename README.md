# Corporate Card Booking

Internal web app for requesting, approving and tracking corporate credit card bookings (ad spend, subscriptions, etc.). Users submit requests, managers/admins approve them (email magic link or in-app), receipts are uploaded per billing month, and PDFs / LINE notifications / payment reminders are generated automatically.

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
- Supabase (Postgres + Storage), accessed server-side with the service role key
- Resend (email), LINE Messaging API (notifications), pdfmake (PDF generation)
- Custom cookie sessions (no Supabase Auth)

## Setup

```bash
cp .env.example .env.local   # fill in the values, see comments in the file
npm ci
npm run dev                  # http://localhost:3000
```

Database: apply the SQL files in `supabase/migrations` (in filename order) through the Supabase SQL editor or the Supabase CLI (`supabase db push`). Make sure the base tables (`profiles`, `requests`, `request_payments`, `app_settings`, `audit_logs`, ...) exist in your project before applying them.

Useful scripts: `npm run typecheck`, `npm run lint`, `npm run build`.

## Roles

- **user** - create and manage their own requests, upload receipts.
- **manager** - approve/reject requests, see all requests.
- **admin** - everything above plus user/role management, master data, settings, audit logs.

## Scheduled jobs

Call the reminder endpoint once a day from any scheduler (cron, GitHub Actions, Supabase pg_cron, ...):

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-host/api/payments/cron/reminders
```

(GET and POST are both accepted.)

## Deployment

`next.config.mjs` uses `output: "standalone"`. Build and run with Docker:

```bash
docker build -t card-booking .
docker run -p 3000:3000 --env-file .env.local card-booking
```

`NEXT_PUBLIC_*` variables are inlined at build time, so pass them as build args / env during `docker build` if they differ from runtime. A sample nginx reverse proxy is in `reverse-proxy/`.

## Security notes

- Sessions are HMAC-signed cookies; rotating `SESSION_SECRET` logs everyone out.
- Legacy password hashes are upgraded to the current scheme automatically on login.
- `createServerSupabase()` uses the service role key and is server-only; it throws if the key is not configured.
- No Content-Security-Policy is set yet (follow-up); other security headers are configured in `next.config.mjs`.
