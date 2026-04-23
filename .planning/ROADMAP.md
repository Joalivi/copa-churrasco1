# Roadmap: Copa Churrasco

## Overview

Preparar a plataforma Copa Churrasco para uso real: centralizar constantes e polish tecnico primeiro, reabilitar Stripe com Pix/Cartao, corrigir inconsistencias de pagamento e estado, criar aba Financeiro publica, e finalizar melhorias de UX (bolao redesign + Google Maps).

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Technical Foundation** - Centralizar constantes e polish tecnico (webhook, empty states, next/image)
- [ ] **Phase 2: Payment Core** - Reabilitar Stripe real e implementar botoes Pix/Cartao separados
- [ ] **Phase 3: Payment Correctness** - Corrigir total a pagar, bloquear checkout apos pagamento, botao confirmar dinamico, e valor churrasco consistente
- [ ] **Phase 4: Financeiro** - Aba Financeiro geral visivel para todos + despesa R$5/pessoa
- [ ] **Phase 5: UX Enhancements** - Bolao redesign UX simplificado e Google Maps da chacara

## Phase Details

### Phase 1: Technical Foundation
**Goal**: Codebase limpo e consistente -- constantes centralizadas e melhorias tecnicas que desbloqueiam trabalho seguro nas fases seguintes
**Depends on**: Nothing (first phase)
**Requirements**: TECH-01, TECH-02
**Success Criteria** (what must be TRUE):
  1. Valores 1650 e 35 importados de constants.ts em todas as rotas -- nenhum hardcode restante
  2. Webhook Stripe processa eventos de forma idempotente (reprocessar mesmo evento nao duplica dados)
  3. Telas de atividades mostram empty state quando nao ha dados (nao tela em branco)
  4. Imagem do attendee-card usa next/image em vez de img tag
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD

### Phase 2: Payment Core
**Goal**: Usuarios conseguem pagar de verdade via Stripe com escolha entre Pix e Cartao
**Depends on**: Phase 1
**Requirements**: PAG-01, PAG-02
**Success Criteria** (what must be TRUE):
  1. Stripe Embedded Checkout processa pagamento real (bypass de teste removido)
  2. Usuario ve dois botoes distintos na UI: "Pagar com Pix" e "Pagar com Cartao"
  3. Cada botao abre checkout Stripe configurado para o metodo de pagamento escolhido
  4. Pagamento confirmado atualiza status do usuario de "pending" para "confirmed" no banco
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD

### Phase 3: Payment Correctness
**Goal**: Pagamento e estado do usuario consistentes em todas as telas -- sem valores divergentes, sem checkout duplicado, sem botoes desatualizados
**Depends on**: Phase 2
**Requirements**: PAG-03, PAG-04, UX-01, UX-02
**Success Criteria** (what must be TRUE):
  1. Total a pagar soma apenas itens habilitados para pagamento (itens aguardando fechamento aparecem listados mas nao somam)
  2. Atividade que ja foi paga mostra badge "Pago" e botao de checkout desabilitado
  3. Botao confirmar na tela inicial muda para estado diferente apos pagamento confirmado (nao mostra "confirmar" para quem ja pagou)
  4. Valor estimado do churrasco eh identico entre tela de pagamento e tela de atividade
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Financeiro
**Goal**: Todos os participantes conseguem ver a situacao financeira geral do evento de forma transparente
**Depends on**: Phase 1
**Requirements**: FIN-01, FIN-02
**Success Criteria** (what must be TRUE):
  1. Aba Financeiro visivel no menu para todos os usuarios (nao so admin)
  2. Aba mostra resumo financeiro: total arrecadado, total despesas, saldo
  3. Despesa R$5/pessoa (produtos basicos) aparece na lista de despesas quando habilitada
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 04-01: TBD

### Phase 5: UX Enhancements
**Goal**: Experiencia do usuario finalizada -- bolao intuitivo com dados claros e localizacao da chacara acessivel no site
**Depends on**: Phase 1
**Requirements**: UX-03, UX-04
**Success Criteria** (what must be TRUE):
  1. Tela do bolao mostra quantidade de apostas feitas e valor total apostado
  2. UX do bolao redesenhada eh intuitiva para usuario leigo (fluxo simplificado)
  3. Google Maps iframe do Sitio Sao Jose Laranjeiras de Caldas visivel no site
**Plans**: TBD
**UI hint**: yes

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5
Note: Phase 4 and Phase 5 depend only on Phase 1 and could theoretically run in parallel after Phase 1.

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Technical Foundation | 0/? | Not started | - |
| 2. Payment Core | 0/? | Not started | - |
| 3. Payment Correctness | 0/? | Not started | - |
| 4. Financeiro | 0/? | Not started | - |
| 5. UX Enhancements | 0/? | Not started | - |
