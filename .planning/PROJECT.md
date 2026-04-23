# Copa Churrasco

## What This Is

Plataforma web para organizar o churrasco da Copa do Mundo 2026 entre amigos. Gerencia inscritos, pagamentos (aviso + atividades + rateio de despesas), bolao de jogos, galeria de fotos, e financeiro. Deployado em copa-churrasco1.vercel.app.

## Core Value

Cada participante consegue se inscrever, pagar sua parte, e acompanhar tudo (financeiro, bolao, galera) de forma transparente pelo celular.

## Requirements

### Validated

- [x] Cadastro com Google OAuth + formulario manual
- [x] Aba Galera mostrando confirmados e pendentes com realtime
- [x] Bolao de jogos com grid de tickets e heatmap
- [x] Atividades com checkins (churrasco, chopp, etc.)
- [x] Pagamento via Stripe Embedded Checkout (bypassed para teste)
- [x] Calculadoras de carne e chopp
- [x] Galeria de fotos com lightbox
- [x] Rateio de despesas + aviso R$35
- [x] Admin summary + payment stats
- [x] Deploy em Vercel

### Active

- [ ] Reabilitar Stripe com botoes separados Pix e Cartao
- [ ] Bolao: redesign UX + mostrar qtd apostas e valor total
- [ ] Botao confirmar muda apos pagamento
- [ ] Total a pagar: nao mostrar itens aguardando fechamento
- [ ] Corrigir valor churrasco divergente entre pagamento e atividade
- [ ] Bloquear checkout na atividade apos pagamento
- [ ] Aba Financeiro geral visivel para todos
- [ ] Despesa R$5/pessoa produtos basicos (aguarda fechamento)
- [ ] Google Maps da chacara (Sitio Sao Jose Laranjeiras de Caldas)
- [ ] Polish tecnico (constantes, webhook idempotency, empty states, next/image)

### Out of Scope

- Chat entre participantes — complexidade alta, WhatsApp ja resolve
- App mobile nativo — web-first, acesso via browser
- Multi-evento — plataforma eh especifica para Copa 2026

## Context

- **Stack:** Next.js App Router + Supabase + Stripe + Tailwind
- **Deploy:** Vercel (copa-churrasco1.vercel.app)
- **Auth:** Supabase Auth com Google OAuth
- **Pagamento:** Stripe Embedded Checkout (atualmente bypassed para teste com insert direto no banco)
- **Status usuario:** "pending" = cadastrado, "confirmed" = pagou aviso R$35
- **Google Maps iframe:** `<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3702.729263606041!2d-46.4335778239139!3d-21.86797627999981!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x94c9ed089060fe95%3A0xc20c96607c87a7e6!2sS%C3%ADtio%20S%C3%A3o%20Jos%C3%A9%20Laranjeiras%20de%20Caldas!5e0!3m2!1spt-BR!2sbr!4v1776905415151!5m2!1spt-BR!2sbr" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`

## Constraints

- **Timeline:** Antes da Copa 2026 (junho/julho 2026)
- **Mobile-first:** Maioria dos usuarios acessa pelo celular
- **Stripe:** Precisa reabilitar pagamento real antes de producao
- **Banco de teste:** Limpar payments/users de teste antes de abrir

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Stripe Embedded Checkout (nao hosted) | Melhor UX mobile, Apple/Google Pay | -- Pending |
| Google OAuth primeiro no cadastro | Menos atrito, mais rapido | ✓ Good |
| Bypass Stripe para teste | Testar fluxo completo sem cobrar | ✓ Good |
| Botoes Pix/Cartao separados | Usuario escolhe metodo antes do checkout | -- Pending |
| Bolao redesign UX simplificado | Precisa ser intuitivo para usuario leigo | -- Pending |
| Aba Financeiro publica | Transparencia — todos veem os numeros | -- Pending |
| Chopp: deficit ate 20% aceitavel | Arredondamento para baixo dentro da margem | ✓ Good |

## Current Milestone: v1.0 Polish + Producao

**Goal:** Preparar a plataforma para uso real — corrigir inconsistencias, melhorar UX, reabilitar pagamento Stripe com Pix/Cartao, e criar aba financeiro.

**Target features:**
- Reabilitar Stripe com botoes separados Pix e Cartao
- Bolao: redesign UX + qtd apostas e valor total
- Botao confirmar dinamico apos pagamento
- Total a pagar sem itens aguardando fechamento
- Corrigir valor churrasco divergente
- Bloquear checkout apos pagamento
- Aba Financeiro geral para todos
- Despesa R$5/pessoa produtos basicos
- Google Maps da chacara
- Polish tecnico

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-22 after milestone v1.0 initialization*
