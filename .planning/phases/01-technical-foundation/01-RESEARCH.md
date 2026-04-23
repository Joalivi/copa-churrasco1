# Phase 1: Technical Foundation - Research

**Researched:** 2026-04-22
**Domain:** Constants centralization + Stripe webhook idempotency (Next.js 16 / Supabase / Stripe)
**Confidence:** HIGH

## Summary

Phase 1 has two concrete deliverables: (1) replace hardcoded values 1650 and 35 with imports from `src/lib/constants.ts` across four API routes, and (2) add idempotency checking to the Stripe webhook so replayed events do not create duplicate payment records.

Both tasks are well-scoped refactors with minimal risk. The constants file already exists and exports `TOTAL_RENTAL` and `AVISO_PRICE`. The four target routes are fully identified with exact line numbers. The webhook idempotency gap is clearly located in the fallback insert block (lines 64-96 of `src/app/api/webhooks/stripe/route.ts`). Two items from TECH-02 (empty states and next/image) are already resolved per the scout and CONTEXT.md (D-06, D-07).

**Primary recommendation:** Check-before-insert idempotency (query `stripe_session_id` before fallback insert), combined with straightforward import replacements for constants. No new libraries needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Import `TOTAL_RENTAL` and `AVISO_PRICE` from `src/lib/constants.ts` in all routes that hardcode 1650 and 35
- **D-02:** Files to refactor: `src/app/api/user-summary/route.ts`, `src/app/api/payments/create-session/route.ts`, `src/app/api/admin/summary/route.ts`, `src/app/api/payments/stats/route.ts`
- **D-04:** Add idempotency check in Stripe webhook before inserting payment_items -- query by `stripe_session_id` before processing
- **D-05:** Webhook at `src/app/api/webhooks/stripe/route.ts` currently does fallback insert if update fails (lines 66-80), without checking if payment already exists
- **D-06:** Empty states in activities already implemented (no action needed)
- **D-07:** attendee-card.tsx already uses next/image (no action needed)

### Claude's Discretion
- **D-03:** Whether `event-details.tsx` should format the constant value or keep hardcoded display text "R$ 1.650,00"
- Idempotency strategy (check-before-insert vs upsert vs lock) -- Claude decides the best technical approach

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TECH-01 | Centralizar constantes (1650, 35) -- importar de constants.ts em todas as rotas que hardcodam esses valores | Constants file already exists at `src/lib/constants.ts` exporting `TOTAL_RENTAL=1650` and `AVISO_PRICE=35`. Four routes identified with exact hardcode locations. Straightforward import+replace. |
| TECH-02 | Polish geral -- webhook idempotency, empty states em atividades, next/image em attendee-card | Webhook idempotency: clear gap in fallback insert logic. Empty states: already resolved (D-06). next/image: already resolved (D-07). Only webhook work remains. |
</phase_requirements>

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Constants centralization | API / Backend | -- | All four target files are Next.js API route handlers; constants are used in server-side financial calculations |
| Webhook idempotency | API / Backend | Database / Storage | Logic lives in the route handler, but relies on querying `payments` table for duplicate detection |
| Display value in event-details.tsx | Browser / Client | -- | Purely presentational component rendered on the client |

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | 16.2.3 | App framework | Already installed [VERIFIED: package.json] |
| @supabase/supabase-js | ^2.103.0 | Database client | Already installed, used in all routes [VERIFIED: package.json] |
| stripe | ^22.0.1 | Stripe server SDK | Already installed, used in webhook [VERIFIED: package.json] |

### No New Libraries Needed

This phase requires zero new dependencies. All work is refactoring existing code using existing imports.

## Architecture Patterns

### System Architecture (relevant to this phase)

```
Stripe Event
    |
    v
POST /api/webhooks/stripe/route.ts
    |
    +--> constructEvent(body, sig, secret)  [signature verification]
    |
    +--> checkout.session.completed?
         |
         +--> supabase.from("payments").update(...)  [find existing pending record]
         |         |
         |         +--> SUCCESS --> criarPaymentItems(supabase, payment.id, items)
         |         |
         |         +--> FAIL --> [IDEMPOTENCY GAP] fallback insert WITHOUT checking duplicates
         |                       +--> criarPaymentItems(supabase, inserted.id, items)
         |
         +--> items include "aviso"? --> update user status to "confirmed"
    |
    v
Response { received: true }
```

### Pattern 1: Import Constants (TECH-01)
**What:** Replace local `const TOTAL_RENTAL = 1650` and `const AVISO = 35` (or hardcoded numeric literals) with imports from the centralized constants module.
**When to use:** Every route that performs financial calculations with these values.
**Example:**
```typescript
// Source: verified in src/lib/constants.ts
import { TOTAL_RENTAL, AVISO_PRICE } from "@/lib/constants";

// Replace: const TOTAL_RENTAL = 1650; const AVISO = 35;
// Replace: hardcoded 1650 / confirmedCount - 35
// With:    TOTAL_RENTAL / confirmedCount - AVISO_PRICE
```

### Pattern 2: Check-Before-Insert Idempotency (TECH-02 -- recommended)
**What:** Before the fallback insert in the webhook, query `payments` table by `stripe_session_id` to check if the record already exists. If it does, skip the insert and use the existing payment ID.
**When to use:** Whenever the webhook receives a `checkout.session.completed` event and the initial update fails.
**Example:**
```typescript
// Source: recommended pattern based on codebase analysis [VERIFIED: webhook code + schema.sql]
if (updateError || !payment) {
  // IDEMPOTENCY: Check if this session was already processed
  const { data: existing } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_session_id", session.id)
    .eq("status", "succeeded")
    .maybeSingle();

  if (existing) {
    // Already processed -- return success without duplicating
    return Response.json({ received: true });
  }

  // Genuinely new -- insert the fallback record
  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
  const { data: inserted, error: insertError } = await supabase
    .from("payments")
    .insert({ /* ... existing fields ... */ })
    .select("id")
    .single();
  // ... rest of logic
}
```

### Anti-Patterns to Avoid
- **Duplicating constant definitions:** Do NOT define `const TOTAL_RENTAL = 1650` locally in any route file. Always import from `@/lib/constants`.
- **Using `.single()` for idempotency checks:** Use `.maybeSingle()` instead -- `.single()` throws an error when zero rows are returned, which defeats the purpose of a "does it exist?" check.
- **Changing the constant names:** `admin/summary/route.ts` and `payments/stats/route.ts` use `AVISO` (not `AVISO_PRICE`). When replacing, use the canonical export name `AVISO_PRICE` from constants.ts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC verification | `stripe.webhooks.constructEvent()` | Already correctly implemented; handles timing attacks and encoding edge cases |
| Supabase service client for webhook | Manual auth header setup | `createServiceClient()` | Already established pattern in the codebase, properly bypasses RLS |

**Key insight:** This phase has zero hand-roll risks. All work is refactoring existing patterns, not introducing new capabilities.

## Common Pitfalls

### Pitfall 1: Inconsistent Constant Naming
**What goes wrong:** `admin/summary/route.ts` and `payments/stats/route.ts` use `AVISO` as the local variable name, but `constants.ts` exports `AVISO_PRICE`. A find-and-replace of `AVISO` could break references if not careful (e.g., `aviso` in string literals, `temAviso`, `avisoPaid`).
**Why it happens:** Different developers chose different names for the same concept.
**How to avoid:** Replace the local `const AVISO = 35` with `import { AVISO_PRICE } from "@/lib/constants"`, then replace only the calculation usages of `AVISO` with `AVISO_PRICE`. Do NOT globally search-replace the string "AVISO" -- target only the constant declarations and their direct usages in math expressions.
**Warning signs:** After refactor, `AVISO` still appears in the file (as variable name in non-constant context like `temAviso`). That is correct -- only the numerical constant needs replacement.

### Pitfall 2: user-summary Uses Inline Literals, Not Named Constants
**What goes wrong:** `user-summary/route.ts` line 144 uses `1650 / confirmedCount - 35` as inline numeric literals -- no local constant declaration. A developer might search only for `const TOTAL_RENTAL` and miss this file.
**Why it happens:** Route was written without local constant variables, using raw numbers directly in the calculation.
**How to avoid:** The CONTEXT.md explicitly lists this file. Add the import and replace the inline `1650` and `35` in the calculation expression.
**Warning signs:** After refactor, grep for `/1650/` and `/\b35\b/` (in calculation context) should return zero matches in API route files.

### Pitfall 3: create-session Has TWO Separate Hardcoded Locations
**What goes wrong:** `create-session/route.ts` has `35.0` on line 28 (in `calculateServerAmount` for the aviso case) AND `1650 / totalConfirmed - 35` on line 103 (in the expense_share case). Missing one of the two creates inconsistent pricing.
**Why it happens:** Two different code paths in the same file use these constants independently.
**How to avoid:** Add one import at the top, replace both occurrences.
**Warning signs:** After refactor, search the file for `35` in numeric context -- only the TICKET_COST (2.0) and activity cost references should remain.

### Pitfall 4: Webhook Idempotency Must Handle Both payment AND payment_items
**What goes wrong:** The idempotency check only prevents duplicate `payments` inserts, but `criarPaymentItems` could still be called, creating duplicate `payment_items` rows if the webhook is retried after the payment was inserted but before items were created.
**Why it happens:** The webhook processes two tables in sequence without a transaction.
**How to avoid:** If the `stripe_session_id` already exists in `payments` with status `succeeded`, check if `payment_items` exist for that payment ID. If they do, skip entirely. If the payment exists but items do not, create items using the existing payment ID.
**Warning signs:** Duplicate rows in `payment_items` with the same `payment_id`.

### Pitfall 5: event-details.tsx Display Value
**What goes wrong:** The component shows "R$ 1.650,00" as hardcoded JSX text. Importing the constant and formatting it would require a formatting utility. Changing it may seem like an improvement but adds complexity for a purely cosmetic display value.
**Why it happens:** Display text and calculation constants serve different purposes.
**How to avoid:** This is a discretion item (D-03). Recommendation: keep as display text. The landing page is static marketing content. If the rental value changes, both the constant and this display text would need updating anyway, and the constant change would be the critical one.
**Warning signs:** None -- this is a low-risk decision either way.

## Code Examples

### Example 1: admin/summary/route.ts Refactor
```typescript
// BEFORE (lines 4-5):
const TOTAL_RENTAL = 1650;
const AVISO = 35;

// AFTER:
import { TOTAL_RENTAL, AVISO_PRICE } from "@/lib/constants";
// Delete the two const lines above
// Replace line 60: TOTAL_RENTAL / confirmedCount - AVISO
// With:            TOTAL_RENTAL / confirmedCount - AVISO_PRICE
```
[VERIFIED: src/app/api/admin/summary/route.ts lines 4-5, 60]

### Example 2: user-summary/route.ts Refactor
```typescript
// BEFORE (line 144):
const rentalShare = confirmedCount > 0 ? 1650 / confirmedCount - 35 : 0;

// AFTER (add import at top, replace line 144):
import { TOTAL_RENTAL, AVISO_PRICE } from "@/lib/constants";
// ...
const rentalShare = confirmedCount > 0 ? TOTAL_RENTAL / confirmedCount - AVISO_PRICE : 0;
```
[VERIFIED: src/app/api/user-summary/route.ts line 144]

### Example 3: create-session/route.ts Refactor
```typescript
// BEFORE (line 28 in calculateServerAmount):
case "aviso":
  return 35.0;
// BEFORE (line 103):
const rentalShare = 1650 / totalConfirmed - 35;

// AFTER (add import at top, replace both):
import { TOTAL_RENTAL, AVISO_PRICE } from "@/lib/constants";
// ...
case "aviso":
  return AVISO_PRICE;
// ...
const rentalShare = TOTAL_RENTAL / totalConfirmed - AVISO_PRICE;
```
[VERIFIED: src/app/api/payments/create-session/route.ts lines 28, 103]

### Example 4: Webhook Idempotency Check
```typescript
// Source: recommended pattern [VERIFIED: current webhook code + schema analysis]
// Insert after line 64 (if (updateError || !payment)):

if (updateError || !payment) {
  // Idempotency: check if session was already processed
  const { data: existingPayment } = await supabase
    .from("payments")
    .select("id")
    .eq("stripe_session_id", session.id)
    .maybeSingle();

  if (existingPayment) {
    // Already processed (possibly by a previous webhook delivery)
    // Check if payment_items also exist
    const { count: itemCount } = await supabase
      .from("payment_items")
      .select("id", { count: "exact", head: true })
      .eq("payment_id", existingPayment.id);

    if ((itemCount ?? 0) > 0) {
      // Fully processed -- skip
      return Response.json({ received: true });
    }

    // Payment exists but items missing -- create items only
    await criarPaymentItems(supabase, existingPayment.id, items);
    return Response.json({ received: true });
  }

  // Genuinely new -- proceed with fallback insert (existing logic)
  // ...existing insert code...
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hosted Stripe Checkout | Embedded Checkout (`ui_mode: "embedded_page"`) | Stripe SDK v22+ | Already implemented in create-session -- no change needed |
| `img` tags | `next/image` | Next.js 13+ | Already resolved (D-07) |

**Deprecated/outdated:**
- None relevant to this phase. All libraries in use are current versions.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `event-details.tsx` display text "R$ 1.650,00" should be kept as-is (not formatted from constant) | Common Pitfalls / Pitfall 5 | LOW -- purely cosmetic, easy to change later |
| A2 | No unique constraint exists on `payments.stripe_session_id` in production database | Code Examples / Idempotency | MEDIUM -- if constraint exists, the fallback insert would fail on duplicate instead of creating a duplicate. Research checked schema.sql and found no unique constraint, but production DB may have been modified via dashboard. |
| A3 | `payment_items` table has no unique constraint preventing duplicate rows for the same `payment_id` + `item_type` + `item_id` | Pitfall 4 | MEDIUM -- if constraint exists, idempotency is partially handled at DB level. Schema.sql shows no such constraint. |

## Open Questions

1. **Does production DB have a unique constraint on `payments.stripe_session_id`?**
   - What we know: `schema.sql` does not define one. [VERIFIED: supabase/schema.sql]
   - What is unclear: Whether one was added later via Supabase Dashboard.
   - Recommendation: The check-before-insert pattern works correctly regardless. If a unique constraint exists, it provides an additional safety net. If not, the code-level check is the sole protection.

2. **Should a unique index on `stripe_session_id` be added as part of this phase?**
   - What we know: It would provide DB-level protection against duplicates.
   - What is unclear: Whether altering the production schema is within phase scope.
   - Recommendation: Add it if feasible (`CREATE UNIQUE INDEX ... WHERE stripe_session_id IS NOT NULL`). It is a defensive measure that complements the code-level check. But the code-level check is sufficient on its own.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None -- no test framework installed |
| Config file | none |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TECH-01 | Constants imported from central file, no hardcoded 1650/35 in routes | manual-only | grep -rn "= 1650\|= 35\|/ 35\|1650 /" src/app/api/ | N/A (grep check) |
| TECH-02 | Webhook does not create duplicate payments on replay | manual-only | N/A -- requires Stripe event simulation | N/A |

### Sampling Rate
- **Per task commit:** `grep -rn "= 1650\|= 35" src/app/api/` -- expect zero matches
- **Per wave merge:** Manual review of webhook logic
- **Phase gate:** `npm run build` passes (type checking)

### Wave 0 Gaps
- No test framework installed. For this phase, manual verification via grep and build checks is sufficient given the small scope (4 file edits + 1 webhook fix).
- Installing a test framework is not justified for this phase alone but may be needed for later phases.

## Sources

### Primary (HIGH confidence)
- `src/lib/constants.ts` -- verified exports TOTAL_RENTAL (1650) and AVISO_PRICE (35)
- `src/app/api/user-summary/route.ts` -- verified hardcoded 1650 and 35 at line 144
- `src/app/api/payments/create-session/route.ts` -- verified hardcoded 35.0 at line 28 and 1650/35 at line 103
- `src/app/api/admin/summary/route.ts` -- verified local const TOTAL_RENTAL=1650 and AVISO=35 at lines 4-5
- `src/app/api/payments/stats/route.ts` -- verified local const TOTAL_RENTAL=1650 and AVISO=35 at lines 4-5
- `src/app/api/webhooks/stripe/route.ts` -- verified fallback insert without idempotency check at lines 64-96
- `supabase/schema.sql` -- verified no unique constraint on stripe_session_id
- `package.json` -- verified project dependencies and versions

### Secondary (MEDIUM confidence)
- None needed -- all research was primary source (codebase analysis)

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries needed, all existing packages verified in package.json
- Architecture: HIGH -- all target files read and analyzed line-by-line
- Pitfalls: HIGH -- identified from direct code analysis, not guesswork

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (stable -- refactoring existing code, no external API changes expected)
