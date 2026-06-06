# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Next.js 16 — read before writing code

This repo runs **Next.js 16.2.3 + React 19**. A few conventions differ from older Next.js and from most training data. The ones that actually bite:

- **Middleware lives in `src/proxy.ts`, not `middleware.ts`.** The exported function is `proxy()`, not `middleware()`. The `config.matcher` export works as before.
- **`cookies()` is async** — `const cookieStore = await cookies()` (see `src/lib/supabase/server.ts`).
- Supabase keys use the newer naming: **`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`**, not `ANON_KEY`.
- When a Next API behaves unexpectedly, check the bundled docs at `node_modules/next/dist/docs/` (per `AGENTS.md`).

## Commands

```bash
npm run dev      # dev server at http://localhost:3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # eslint (flat config in eslint.config.mjs)
```

No test runner is configured — there are no tests and no `test` script. Don't assume Jest or Vitest exist.

## What this is

"Churras da Copa 2026" — a mobile-first web app for organizing a World Cup 2026 barbecue among friends. People register, pay their share (mandatory R$35 *aviso* + activities + expense split), join a score-prediction pool (*bolão*), check into activities, and watch the money flow. Deployed to Vercel (copa-churrasco1.vercel.app). All UI copy is Brazilian Portuguese.

## Architecture

### Identity — localStorage, not a real session

There's no conventional auth session. Identity is a `users.id` (UUID) kept in **localStorage** under `copa_user_id` / `copa_user_name`:

- `src/hooks/use-current-user.ts` is the client-side source of truth.
- A user "logs in" by typing their **CPF** (`/confirmar` → `/api/users/recover`), which maps back to an existing `users` row. `src/lib/validators.ts` does the CPF check-digit validation.
- `src/components/layout/session-guard.tsx` runs once per browser session, calls `/api/user-summary`, and force-logs-out **only on 404** (stored id no longer exists). 5xx and network errors are treated as transient.
- Supabase Auth (Google OAuth) exists as a secondary path, joined to `users` via `supabase_auth_id`, but the primary flow is CPF + localStorage. `.planning/PROJECT.md` predates this and still describes Google-first — trust the code.

Consequence: most API routes receive `user_id` as a query/body param and trust it. There is no server-side auth gate on user routes.

### Supabase — three client flavors

- `src/lib/supabase/server.ts` → `createClient()` (cookie-bound) and `createServiceClient()` (service-role, **bypasses RLS**, server-only — never import it into client code).
- `src/lib/supabase/client.ts` → browser client.
- `src/lib/supabase/middleware.ts` → `updateSession()`, called from `src/proxy.ts` to refresh the auth cookie.

**RLS is intentionally permissive** — every policy in `supabase/schema.sql` is `USING (true)`. The database is effectively open for read and most writes. The security that matters happens server-side: the service-role client for privileged work, server-side amount recomputation (below), and the admin PIN. Don't assume RLS protects anything.

### Payments — never trust client amounts

Two methods, both validated server-side:

- **Card** → Stripe Embedded Checkout (`/api/payments/create-session`), confirmed by the webhook at `/api/webhooks/stripe`.
- **Pix** → static BR Code (copia-e-cola) built in `src/lib/pix.ts` (EMV/TLV layout + CRC16) via `/api/payments/create-pix`. Static Pix has no PSP callback, so an admin confirms it by hand at `/api/admin/payments/[id]/confirm`.

Invariants worth knowing before editing payment code:

- **`src/lib/payment-helpers.ts` recomputes every line-item amount on the server** (`calculateServerAmount` / `validateAndRecalcAmounts`) and ignores whatever the client sent. A mismatch logs `[SECURITY]` and the server value wins. Change payment math here, not in the routes.
- Payment row + its items are inserted atomically through the `create_pending_payment` Postgres RPC (defined in `schema.sql`) to avoid orphan payments.
- The Stripe webhook is idempotent — it dedupes on the unique `stripe_session_id` index.
- Paying the *aviso* (R$35) flips `users.status` from `pending` to `confirmed`.

Financial constants live in `src/lib/constants.ts` (`TOTAL_RENTAL=1650`, `AVISO_PRICE=35`, `TICKET_COST=2`, …). Import them — hardcoding these values was the bug the first planning phase fixed.

### Admin

`/admin` (hidden from the bottom nav) and the `/api/admin/*` routes gate on a shared **`ADMIN_PIN`** sent in the request. `verify-pin` adds in-memory per-IP rate limiting, but that map is per-lambda on Vercel, so treat it as best-effort.

### Data model

`supabase/schema.sql` is the schema source of truth (run by hand in the Supabase SQL editor — it isn't migrated automatically). Tables: `users`, `activities`, `activity_checkins`, `bolao_tickets`, `expenses`, `payments`, `payment_items`, `admin_config`. Activities carry three `cost_type`s — `fixed`, `per_bottle`, `total_split` — and those drive the per-person math in `payment-helpers.ts` and `src/lib/utils.ts`. Realtime is enabled (manually, in the dashboard) for `users`, `activity_checkins`, `bolao_tickets`, `payments`.

### Routing shape

App Router under `src/app/`. User pages (`/`, `/atividades`, `/bolao`, `/confirmados`, `/financeiro`, `/fotos`, `/pagamento`, …) sit inside a shared `layout.tsx` with `HeaderBar` + `BottomNav` + `SessionGuard`. API handlers live under `src/app/api/`. Path alias `@/*` → `src/*`. Styling is Tailwind v4, configured in CSS (`src/app/globals.css` + `postcss.config.mjs`) — there's no `tailwind.config`.

## Environment variables

No `.env.example` is committed. Required:

**Client (`NEXT_PUBLIC_*`):** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_APP_URL`

**Server-only:** `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `ADMIN_PIN`, `PIX_KEY`, `PIX_MERCHANT_NAME`, `PIX_MERCHANT_CITY`

Set these in Vercel for deploys and in `.env.local` for local dev.

## Planning docs

`.planning/` holds a GSD project (PROJECT.md, ROADMAP.md, STATE.md, phase folders). It records intent and history but **lags the current code in places** (notably the auth pivot to CPF). When the docs and the code disagree, the code wins.
