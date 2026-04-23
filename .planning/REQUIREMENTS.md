# Requirements: Copa Churrasco

**Defined:** 2026-04-22
**Core Value:** Cada participante consegue se inscrever, pagar sua parte, e acompanhar tudo de forma transparente pelo celular.

## v1.0 Requirements

Requirements para preparar a plataforma para uso real.

### Pagamento

- [ ] **PAG-01**: Reabilitar Stripe — remover bypass de teste, pagamento real funcional com Embedded Checkout
- [ ] **PAG-02**: Botoes Pix e Cartao separados na UI — usuario escolhe metodo antes de abrir o checkout Stripe
- [ ] **PAG-03**: Total a pagar contabiliza apenas itens habilitados para pagamento (itens aguardando fechamento aparecem na tela mas nao somam no total)
- [ ] **PAG-04**: Checkout bloqueado apos pagamento — atividade mostra "pago" e impede novo checkout

### UX/Interface

- [ ] **UX-01**: Botao confirmar na tela inicial muda estado apos pagamento confirmado
- [ ] **UX-02**: Valor estimado churrasco consistente entre telas de pagamento e atividade
- [ ] **UX-03**: Bolao redesign UX simplificado + mostrar quantidade de apostas e valor total
- [ ] **UX-04**: Google Maps iframe da chacara (Sitio Sao Jose Laranjeiras de Caldas) no site

### Financeiro

- [ ] **FIN-01**: Aba Financeiro geral visivel para todos os usuarios (nao so admin)
- [ ] **FIN-02**: Despesa R$5/pessoa produtos basicos (papel higienico, detergente, etc.) — habilitada apos fechamento

### Tecnico

- [ ] **TECH-01**: Centralizar constantes (1650, 35) — importar de constants.ts em todas as rotas que hardcodam esses valores
- [ ] **TECH-02**: Polish geral — webhook idempotency, empty states em atividades, next/image em attendee-card

## Future Requirements

### Producao

- **PROD-01**: Limpar banco de dados de teste (payments, users) antes de abrir
- **PROD-02**: Registrar dominio Apple Pay no Stripe Dashboard
- **PROD-03**: Atualizar Vercel env vars (NEXT_PUBLIC_APP_URL, Supabase auth redirects)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Chat entre participantes | WhatsApp ja resolve, complexidade alta |
| App mobile nativo | Web-first, acesso via browser |
| Multi-evento | Plataforma especifica para Copa 2026 |
| Ranking bolao em tempo real | Complexidade, jogos nao comecaram |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PAG-01 | TBD | Pending |
| PAG-02 | TBD | Pending |
| PAG-03 | TBD | Pending |
| PAG-04 | TBD | Pending |
| UX-01 | TBD | Pending |
| UX-02 | TBD | Pending |
| UX-03 | TBD | Pending |
| UX-04 | TBD | Pending |
| FIN-01 | TBD | Pending |
| FIN-02 | TBD | Pending |
| TECH-01 | TBD | Pending |
| TECH-02 | TBD | Pending |

**Coverage:**
- v1.0 requirements: 12 total
- Mapped to phases: 0
- Unmapped: 12

---
*Requirements defined: 2026-04-22*
*Last updated: 2026-04-22 after initial definition*
