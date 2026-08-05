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
- **Hotel/Flight live search** (priority batch 7, final feature-table item): no
  GDS/hotel-supplier API key exists in this environment, so `HotelSearchService`/
  `FlightSearchService` are deterministic mock providers (same destination/route
  always returns the same option set) rather than a real integration. Deliberately
  *doesn't* build a parallel booking system — a search result becomes a `RateCard`
  (`source: API`) with the chosen markup baked into its price, then flows through
  the exact same `QuotationsService.addItem()` every manually-added rate card
  already uses. Wired into the Quotation detail page
  (`apps/web/src/app/quotations/[id]/page.tsx`) as two live-search sections above
  the existing rate-card picker. Verified the entire existing downstream chain
  still works unmodified with search-sourced items mixed in: searched and added a
  hotel room and a flight (each with markup applied), submitted for approval,
  approved, converted to a booking, and generated a voucher — all through
  already-built modules, no changes needed there.
- **Storage/Data Admin, Two-Factor Authentication, real job scheduler** (leftovers
  batch — no external credentials required): a local-disk file upload endpoint
  (`POST /storage/upload`, Admin/Director/Branch Manager, 5MB limit, image/PDF
  only) backing a `/storage` utility page — the dev-mode stand-in for real S3, since
  `OBJECT_STORAGE_KEY` has no credential in this environment; swapping to S3 means
  replacing this one upload method, not any caller. A `/data-admin` page finally
  gives the `AuditLog` table (populated by `AuditLogInterceptor` since Phase 1) a
  UI — filterable audit log + row-count stats for key tables, Admin/Director only.
  TOTP-based 2FA (`otplib` + `qrcode`, no external service — pure crypto against a
  shared secret): enable from `/security` (scan a QR code, confirm with a code),
  and `AuthService.login()` now returns `{ requiresTwoFactor: true, userId }`
  instead of tokens for a 2FA-enabled account, with a new `/auth/2fa/verify`
  endpoint completing the session after the TOTP code checks out — verified live
  end-to-end (enabled 2FA on the Admin account, confirmed plain-password login now
  stops at a code prompt, verified with a server-generated TOTP code, then
  disabled it and confirmed normal login returns).
- **Durable job scheduling (BullMQ + Redis)**: the four background jobs (SLA
  escalation, birthday/anniversary check, automation sweep, currency refresh)
  now run as real BullMQ repeatable jobs against Redis
  (`apps/api/src/jobs/` — `jobs.scheduler.ts` registers each schedule via
  `queue.upsertJobScheduler()`, `jobs.processor.ts` is the worker that calls
  through to the exact same `LeadsService`/`MarketingService`/
  `AutomationService`/`CurrencyService` methods the old node-cron version
  called). `upsertJobScheduler()` is idempotent by scheduler id, so it's safe
  to call unconditionally on every boot — including every `nest start --watch`
  reload — without ever double-registering a job; schedule state now lives in
  Redis instead of the API process's memory, so it survives restarts and
  would coordinate correctly across multiple API instances. Verified live:
  restarted the API mid-run and confirmed `queue.getJobSchedulers()` still
  reported exactly 4 schedulers (no duplicates), then manually enqueued a
  `currency-refresh` job and confirmed the worker picked it up and
  `CurrencyRate.lastUpdatedAt` moved forward in the live database.
- **Monthly P&L**: `GET /reports/pnl/monthly` (`apps/api/src/reports/reports.service.ts`'s
  `getMonthlyPnL()`) buckets client/DMC payments by `Payment.paidAt` and
  expenses by `Expense.expenseDate` into a real month-by-month breakdown —
  distinct from the existing real-time totals on the Director dashboard and
  `/finance/branch-pnl`. Branch Managers are always scoped to their own
  branch server-side; Director/Admin can pick any branch or view org-wide.
  Rendered as a new "Monthly P&L" table on `/reports` with year/branch
  selectors. Verified live: recorded a real client payment, confirmed it
  landed in the correct month's row with the exact same amount, and that
  unrelated months stayed at ₹0.
- **Transfer Module**: `RateCardType` gained a `TRANSFER` value (previously
  only `ACTIVITY`/`FLIGHT`/`HOTEL` — `SupplierType`/`VoucherType` already had
  it, this was the one real gap), and a `TransferSearchService`
  (`apps/api/src/travel-search/transfer-search.service.ts`) mirrors the
  existing Hotel/Flight deterministic mock-search pattern. Wired into the
  quotation detail page as a third live-search section, and into
  `/admin/rates` so Admin can also add transfer rate cards manually.
  Transfer items flow through the exact same
  `RateCard(source: API) → QuotationsService.addItem()` pipeline hotel/flight
  searches already use, so they show up in existing bookings/vouchers/reports
  for free — no separate "transfer reports" surface needed. Verified live:
  searched a pickup/drop pair, added a result to a draft quotation, and
  confirmed a real `RateCard` row (`type: TRANSFER`, `source: API`) was
  created.
- **Client & Business Entities**: a new `Client` entity
  (`apps/api/src/clients/`, mirroring the Suppliers module's CRUD pattern)
  covers Individual/Agent/Corporate/Group accounts — agent commission %,
  corporate GST number, and free-text notes per type. `Lead` gained an
  **optional** `clientId` FK alongside its existing free-text `clientName`
  (deliberately not replacing it, so no backfill migration was needed for
  existing leads); the Lead creation form gets an optional "link to existing
  client" picker that auto-fills the name field when selected. New `/clients`
  admin page, Admin/Director-gated write. Verified live: created an Agent
  client, linked a new Lead to it, and confirmed the name auto-filled and the
  link persisted.
- **Light/dark mode**: `next-themes` (`ThemeProvider` in
  `apps/web/src/app/layout.tsx`, `darkMode: 'class'` in
  `tailwind.config.js`) backs a sun/moon toggle in `AppShell`'s header,
  persisted across sessions and defaulting to the OS preference. All 29 page
  files plus the pre-auth login page got `dark:` Tailwind variants for their
  color classes (background/border/text/badge colors) via a scripted
  find-and-append pass rather than hand-editing each file, since there's no
  shared Table/Card component to fix once. Verified live in the browser:
  toggled dark mode and clicked through the dashboard, a table-heavy page,
  the Clients form, and a nested quotation-detail page with no unreadable
  light-on-light or dark-on-dark spots.
- **Real WhatsApp (Meta Cloud API)**: `NotificationsService.deliver()`
  (`apps/api/src/notifications/notifications.service.ts`) sends real WhatsApp
  text messages via `POST https://graph.facebook.com/v20.0/{phone_number_id}/messages`
  when `WHATSAPP_API_KEY` + `WHATSAPP_PHONE_NUMBER_ID` are set — falls back to
  the original console-log behavior when they're not, so nothing breaks
  before real credentials exist. All customer-facing sends (voucher/quotation
  issuance, marketing campaigns, automation rules, Inbox replies) now carry
  real message text, not just a trigger-type log line. A new webhook
  (`apps/api/src/inbox/whatsapp-webhook.controller.ts`, registered at
  `POST /api/webhooks/whatsapp` — enter that URL in Meta's dashboard) handles
  both inbound customer replies (matched to a Lead by phone number, feeding
  the same keyword-match bot the dev-only "Simulate customer reply" control
  already used) and delivery/read/failed status callbacks (correlated back to
  the sending `Notification` row via a new `externalId` column storing Meta's
  WAMID). The webhook's `GET` handshake checks `WHATSAPP_WEBHOOK_VERIFY_TOKEN`;
  every `POST` is checked against Meta's `X-Hub-Signature-256` header (HMAC
  over the raw request body using `WHATSAPP_APP_SECRET` — required
  `rawBody: true` in `main.ts`'s `NestFactory.create()` to access the
  unparsed bytes). Verified live: hand-built a Meta-shaped webhook payload
  with a correctly-computed HMAC signature and confirmed it created a real
  inbound `Message` against the right Lead/Conversation, exactly like the
  simulate control does; confirmed a mismatched signature is rejected;
  confirmed the outbound `fetch` call is correctly shaped against a local
  mock server.
  **Known limitation, not solved here**: Meta requires a pre-approved message
  *template* (not free text) for business-initiated messages outside a 24h
  customer-service window — campaigns/automation rules firing without a
  recent inbound message from that lead will fail via the real API until
  this app's `Template` rows are mapped to actual Meta-approved template
  names, which requires a manual approval step in Meta Business Manager this
  codebase can't do for you.
- **Real Email (SendGrid)**: `NotificationsService.deliver()` sends real
  email via `POST https://api.sendgrid.com/v3/mail/send` when
  `EMAIL_PROVIDER_KEY` + `EMAIL_FROM_ADDRESS` are set and the recipient is
  actually an email address (every EMAIL-channel call site already falls
  back to `lead.phone` when a lead has no email on file — that fallback path
  correctly stays on the console-log mock rather than attempting to email a
  phone number). Falls back to the original console-log behavior otherwise,
  so nothing breaks before real credentials exist. All four EMAIL-channel
  call sites (invoice issuance, quotation sent, marketing campaigns,
  automation rules) now carry a real subject + body, sourced from the
  matching `Template` row where one's configured. No inbound-email/two-way
  path is built — unlike WhatsApp's webhook, that needs a provider inbound-parse
  webhook plus DNS/MX record changes on a real domain, out of scope here.
  Verified live: confirmed console-log fallback is unchanged with no
  credentials configured, and confirmed the outbound request is correctly
  shaped (Bearer auth, `personalizations`/`from`/`subject`/`content` body)
  against a local mock server matching SendGrid's API contract.
- **Real Payment Gateway (Razorpay)**: replaces the trust-based "Mark paid"
  button as the primary path — spec Section 11's "PCI-scope-free payments
  via hosted checkout" means the customer pays on Razorpay's own page, not
  on staff's word. `PaymentsService.createPaymentLink()`
  (`apps/api/src/payments/payments.service.ts`) calls Razorpay's Payment
  Links API (`POST /v1/payment_links`, HTTP Basic Auth with
  `PAYMENT_GATEWAY_KEY_ID`/`PAYMENT_GATEWAY_KEY`) and returns a hosted
  checkout URL — shown with a copy button on `/bookings` so staff can paste
  it into a WhatsApp message or email to the customer (both now real, so
  this closes the loop end-to-end). A new webhook
  (`apps/api/src/payments/razorpay-webhook.controller.ts`, registered at
  `POST /api/webhooks/razorpay`) confirms the payment once Razorpay reports
  it paid, verified via `X-Razorpay-Signature` (HMAC over the raw body using
  `PAYMENT_GATEWAY_WEBHOOK_SECRET`) — same shape as the WhatsApp webhook.
  Both the manual "Mark paid" button and the real webhook now funnel through
  one shared `confirmPaid()` method, so target-crediting can never drift
  between the two paths. With no gateway credentials configured,
  `createPaymentLink` returns a clear error telling staff to use "Mark paid"
  instead, rather than silently no-op'ing — there's no sensible mock hosted
  checkout to fall back to the way there is for WhatsApp/email. Verified
  live: confirmed the no-credentials error path, hand-built and signed a
  Razorpay-shaped `payment_link.paid` webhook payload and confirmed it set
  `paidAt`/a real `gatewayRef` and credited the linked Target's
  `revenueAchieved`, confirmed a bad signature is rejected, and confirmed
  the outbound request is correctly shaped (Basic Auth, amount in paise)
  against a local mock server.

### What's intentionally stubbed or out of scope

No credentials exist in this environment for push (WhatsApp, Email, and the
payment gateway are now real — see above); swapping in FCM means
implementing one method in `NotificationsService`, not touching callers.
Branded PDF generation for quotations/vouchers is a placeholder URL, not
real rendering. **Not built at all**: WAF/DDoS protection, penetration
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
`postgresql://holidayvibez:holidayvibez@127.0.0.1:5433/holiday_vibez_crm`.
`apps/api/scripts/dev-redis.js` does the same for Redis (via `redis-memory-server`,
which downloads and runs a real Redis binary) — run `node scripts/dev-redis.js`
alongside it; it listens on the same port 6379 that `docker-compose` would use, so
`REDIS_URL` doesn't need to change either way. Both are dev-only; production still
targets real managed Postgres and Redis instances.

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
