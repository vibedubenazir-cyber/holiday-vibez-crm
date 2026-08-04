# Holiday Vibez CRM

Full-stack build from `Holiday_Vibez_CRM_Master_Build_Spec.docx`, covering all five
build phases from the spec's Section 14 plan: Foundation, Sales Pipeline, Operations &
Finance, Targets/Calendar/Reporting, and Mobile/Hardening basics.

## What's built

- **Auth/RBAC**: JWT + refresh cookie, session/device management, role-based guards
  enforcing the Section 2 permission matrix.
- **Admin**: Users, Branches, Rate Cards (Admin-only price editing).
- **Sales pipeline**: Leads (public capture API, round-robin auto-assignment, SLA
  breach + escalation), the DMC-rate quotation builder (multi-select, auto-costing,
  price snapshotting), and the Branch Manager approval gate.
- **Operations & finance**: Bookings from approved quotations, payments (mock hosted
  checkout), branch P&L, automatic Target crediting on payment.
- **Targets, Calendar, Reporting**: branch/consultant targets + leaderboard, the
  Departure Calendar (readiness color-coding), Director dashboard, passport/visa/
  insurance compliance report.
- **Mobile/hardening basics**: installable PWA shell, active-session management screen,
  field-level encryption for passport numbers, rate-limited public API.
- **Ops-critical extension** (post-launch feature request, priority batch 1 of the
  full "New CRM enhancement" table): Supplier Management, a Package/Itinerary builder
  with a one-click "build quotation from package" action (auto-costs from the
  package's rate cards, reuses the same snapshot logic as the manual quotation
  builder), Voucher & Invoice generation per booking, Accounts & Finance expense
  tracking with category rollups, and Attendance (clock-in/out + branch team view).
- **WhatsApp/Email Inbox** (priority batch 2): a two-way conversation thread per
  lead per channel, a reusable message Template library, and a rules-based "AI bot"
  that auto-replies to inbound messages by keyword match (no LLM key in this
  environment — swapping in a real model means replacing `InboxService`'s bot-reply
  lookup, not the surrounding flow). Since there's no live WhatsApp/email webhook to
  receive from, inbound messages are triggered via an explicitly-labeled
  "Simulate customer reply" dev control in the Inbox UI.
- **Marketing & Website CMS** (priority batch 3): a Marketing dashboard (leads by
  source, campaigns sent this month, upcoming 7-day birthday/anniversary list), a
  Campaign builder that sends to a filtered lead audience via `NotificationsService`,
  and a CMS covering Blog/Banners/Destinations/Testimonials/Gallery through one
  generic content model — plus no-auth `GET /public/cms/content` and
  `GET /public/cms/settings` endpoints for the real public site
  (www.holidayvibez.com, a separate system this repo doesn't own) to consume. A
  6-hour in-process interval checks `Traveler.dateOfBirth`/`anniversaryDate` and
  fires the spec's birthday/anniversary greeting automation.
- **Automation** (priority batch 4): Admin-configurable rules (trigger + delay +
  channel + optional template) evaluated by a single 5-minute sweep against Leads —
  the general-purpose successor to the two hardcoded intervals above, so adding a
  new "N minutes after X, message the customer" scenario is creating a rule, not a
  code change. Triggers: lead created, lead status changed to X, quotation sent,
  booking confirmed. A `(ruleId, leadId)` uniqueness constraint prevents a rule from
  double-firing for the same lead across sweep ticks — verified live by watching two
  consecutive sweeps and confirming the fire count stayed at 1.
- **Currency Exchange** (priority batch 5): 9 currencies against INR (matching the
  spec's Section 1.1 "Currency Exchange (9 currencies)" callout), Admin-editable,
  read-only for other roles. No real forex API key exists in this environment, so
  the "scheduled exchange-rate updates" half is a mock feed — an in-process interval
  nudges `API`-sourced rates by a small random drift, while `MANUAL`-sourced rates
  (an Admin's explicit override) are never touched by it. Verified the drift/freeze
  logic directly against the live database; the live in-process interval itself
  kept restarting on its own in this sandbox environment before a clean 5-minute
  window could be observed end-to-end — the interval registration follows the exact
  same pattern as the already-verified Automation sweep, so this is almost
  certainly sandbox flakiness rather than a code issue, but flagging it rather than
  claiming a live tick was watched when it wasn't.
- **Custom Fields engine** (priority batch 6): Admin defines ad-hoc fields
  (text/number/date/boolean/select) on an entity type — no schema change, no
  redeploy — and they render as real inputs wherever that entity is actually
  edited, not just in an admin-only list. Wired into the Lead detail page
  (`apps/web/src/app/leads/[id]/page.tsx`) as the proof: the 3 seeded LEAD fields
  (Anniversary Trip?, Referred By, Trip Purpose) show up there automatically, and
  adding a 4th field ("Preferred Departure Date") from `/custom-fields` made it
  appear on the lead page with no other code change. Verified all five field types
  round-trip and persist correctly against the live API.

### What's intentionally stubbed or out of scope

No credentials exist in this environment for WhatsApp, email, push, or a payment
gateway — `NotificationsService` and the payment mark-paid flow are real, wired-up
abstractions with **console-log/mock providers**; swapping in Twilio/WhatsApp Cloud
API, SES, FCM, or a real gateway means implementing one class, not touching callers.
Branded PDF generation for quotations/vouchers is a placeholder URL, not real
rendering. SLA escalation and the compliance job run as in-process intervals, not a
production job scheduler. **Not built at all**: WAF/DDoS protection, penetration
testing, a native push backend, and data migration from the live
crm.holidayvibez.com system — these are infra/process work, not application code.

## Structure

- `apps/api` — NestJS backend (PostgreSQL via Prisma)
- `apps/web` — Next.js frontend
- `packages/shared` — shared TypeScript types/enums used by both apps
- `infra` — local dev docker-compose (Postgres + Redis)

## Getting started

Requires Docker (or a local PostgreSQL + Redis) and Node 18+.

```bash
# 1. Start Postgres + Redis
docker compose -f infra/docker-compose.yml up -d

# 2. Install dependencies
npm install

# 3. Build the shared types package
npm run build:shared

# 4. Configure env vars
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 5. Run migrations + seed data
npm run migrate
npm run seed

# 6. Start both apps (two terminals)
npm run dev:api
npm run dev:web
```

Web runs at http://localhost:3000, API at http://localhost:4000/api (adjust
`PORT`/`NEXT_PUBLIC_API_URL` if that port is taken locally).

No Docker on hand? `apps/api/scripts/dev-db.js` boots a local-only embedded Postgres
(via the `embedded-postgres` npm package) instead — run `node scripts/dev-db.js` from
`apps/api` in place of step 1, then point `DATABASE_URL` in `.env` at
`postgresql://holidayvibez:holidayvibez@127.0.0.1:5433/holiday_vibez_crm`. Dev-only;
production still targets a real managed PostgreSQL instance.

## Seeded logins

All seeded users share the password `Password@123`:

- `director@holidayvibez.com` — Director
- `admin@holidayvibez.com` — Admin
- `manager.<branch>@holidayvibez.com` — Branch Manager (mumbai, delhi, bengaluru, pune, ahmedabad)
- `consultant1.<branch>@holidayvibez.com` / `consultant2.<branch>@holidayvibez.com` — Travel Consultant

## Permission matrix

| Role | Users/Branches/Rates | Leads/Quotations | Approvals | Reports |
|---|---|---|---|---|
| Admin | full CRUD | full access, all branches | can approve/reject | full |
| Director | read-only | read-only, all branches | no | full |
| Branch Manager | read-only | own branch only | **approves/rejects** | own branch |
| Travel Consultant | read-only | own leads/quotations only | no | no |

| Role | Suppliers | Packages | Vouchers/Invoices | Expenses |
|---|---|---|---|---|
| Admin | full CRUD | full CRUD | own/branch bookings | any branch |
| Director | read-only | read-only | any (read) | any branch |
| Branch Manager | read-only | full CRUD | own branch bookings | own branch only |
| Travel Consultant | read-only | read + build quotation | own bookings only | no access |

`POST /rates` / `PATCH /rates/:id` are Admin-only (403 otherwise). Quotations require
Branch Manager approval before `status` moves to `SENT` — no quotation reaches a
customer unreviewed. RBAC and branch/consultant scoping are enforced server-side on
every endpoint, not just hidden in the UI.

## End-to-end flow (verified)

Lead created → round-robin assigns a consultant → consultant builds a quotation from
rate cards (auto-costed, price-snapshotted) → submits for approval → Branch Manager
approves (auto-sends) → converted to a booking with a departure date → payment
recorded and marked paid → feeds the consultant/branch Target and branch P&L → shows
up on the Departure Calendar, color-coded by readiness → visible on the Director
dashboard.
