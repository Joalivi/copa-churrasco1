# Phase 1: Technical Foundation - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning

<domain>
## Phase Boundary

Centralizar constantes hardcoded e melhorar a robustez tecnica do codebase — webhook idempotency.
Empty states e next/image ja estao resolvidos (verificado no scout).

</domain>

<decisions>
## Implementation Decisions

### Centralizar Constantes
- **D-01:** Importar `TOTAL_RENTAL` e `AVISO_PRICE` de `src/lib/constants.ts` em todas as rotas que hardcodam 1650 e 35
- **D-02:** Arquivos a refatorar: `src/app/api/user-summary/route.ts`, `src/app/api/payments/create-session/route.ts`, `src/app/api/admin/summary/route.ts`, `src/app/api/payments/stats/route.ts`
- **D-03:** `event-details.tsx` tem "R$ 1.650,00" como texto de display (nao calculo) — Claude decide se importar ou manter como texto

### Webhook Idempotency
- **D-04:** Adicionar check de idempotency no webhook Stripe antes de inserir payment_items — query por `stripe_session_id` antes de processar
- **D-05:** Webhook em `src/app/api/webhooks/stripe/route.ts` atualmente faz fallback insert se update falha (linhas 66-80), sem verificar se payment ja existe

### Itens Ja Resolvidos (nao precisam de acao)
- **D-06:** Empty states em atividades ja implementados (`src/app/atividades/page.tsx` linhas 132-142)
- **D-07:** attendee-card.tsx ja usa next/image com onError handler

### Claude's Discretion
- Estrategia de idempotency (check-before-insert vs upsert vs lock) — Claude decide a melhor abordagem tecnica
- Se `event-details.tsx` deve formatar o valor da constante ou manter texto hardcoded

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Constants
- `src/lib/constants.ts` — Fonte central de TOTAL_RENTAL e AVISO_PRICE

### Routes to Refactor
- `src/app/api/user-summary/route.ts` — Hardcoda 1650 e 35 (linha 144)
- `src/app/api/payments/create-session/route.ts` — Hardcoda 35.0 (linha 28) e 1650/35 (linha 103)
- `src/app/api/admin/summary/route.ts` — Define local TOTAL_RENTAL e AVISO (linhas 4-5)
- `src/app/api/payments/stats/route.ts` — Define local TOTAL_RENTAL e AVISO (linhas 4-5)

### Webhook
- `src/app/api/webhooks/stripe/route.ts` — Webhook sem idempotency check
- `src/lib/payment-helpers.ts` — Helper compartilhado para inserir payment_items

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/constants.ts` — Ja exporta TOTAL_RENTAL (1650) e AVISO_PRICE (35)
- `src/lib/payment-helpers.ts` — criarPaymentItems() compartilhado entre webhook e create-session

### Established Patterns
- Route handlers usam `createServiceClient()` para bypass RLS
- Constantes locais definidas no topo do arquivo (padrao a substituir por import)

### Integration Points
- Webhook processa `checkout.session.completed` e atualiza payments + payment_items
- create-session tem bypass de teste que tambem usa as constantes

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-technical-foundation*
*Context gathered: 2026-04-22*
