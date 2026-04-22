# 11 — Fases de Desenvolvimento

## Estratégia

Cada fase entrega valor utilizável. O Brain é introduzido na Fase 2 — antes disso o app é um registrador de gastos. Telegram vem na Fase 3 após a API estar estável.

---

## Fase 1 — MVP

**Objetivo:** registrar gastos e ver o que foi gasto no mês.

### Backend
- [ ] Setup do monorepo (Turborepo + packages)
- [ ] Fastify + Prisma + SQLite local
- [ ] Migration inicial (User, Account, Category, Transaction, InstallmentGroup)
- [ ] Seed de categorias padrão
- [ ] Endpoints: `/user`, `/accounts`, `/categories`, `/transactions`
- [ ] Lógica de geração automática de parcelas
- [ ] Cancelamento com `?cancelFuture=true`
- [ ] `PATCH /transactions/:id/pay`
- [ ] `GET /reports/monthly`

### Frontend
- [ ] Setup Next.js 14 + Tailwind + shadcn/ui
- [ ] Layout global (sidebar + topbar)
- [ ] Dashboard simplificado (gastos do mês, sem Brain)
- [ ] Lista de transações com filtros por mês/categoria/banco
- [ ] Formulário de novo lançamento (único + parcelado)
- [ ] Gestão de contas/bancos
- [ ] Relatório mensal (por categoria, por banco, essencial vs não-essencial)

### Critério de conclusão
Usuário consegue: criar conta, lançar gasto parcelado em 10x, ver relatório do mês, marcar parcela como paga.

---

## Fase 2 — Brain + Objetivos

**Objetivo:** o app passa a recomendar e ajustar o orçamento automaticamente.

### Backend
- [ ] Migration: Goal, Recommendation, BudgetSnapshot, CategoryLimit
- [ ] `GoalService` completo (CRUD + deposit)
- [ ] Brain: `calculator.ts`, `goal-allocator.ts`, `alert-generator.ts`, `suggestion-engine.ts`
- [ ] Integração do Brain em todos os serviços de mutação
- [ ] Endpoints: `/goals`, `/recommendations`, `/settings/category-limits`
- [ ] `GET /reports/cashflow`
- [ ] `GET /reports/comparison`
- [ ] `GET /reports/installment-timeline`

### Frontend
- [ ] Dashboard com BudgetOverview (orçamento livre, essencial, investimento)
- [ ] AlertBanner com alertas do Brain
- [ ] Página de Objetivos com GoalCard + progress bar
- [ ] Formulário de criação de objetivo
- [ ] Timeline de parcelas (calendário horizontal)
- [ ] Relatório comparativo (mês vs anterior vs média)
- [ ] Configurações: renda mensal, limites por categoria

### Critério de conclusão
Brain calcula e exibe orçamento livre após cada lançamento. Objetivo criado reduz orçamento livre. Alerta exibido quando limite ultrapassado.

---

## Fase 3 — Telegram Bot

**Objetivo:** entrada rápida de gastos via celular sem abrir o app.

### Bot
- [ ] Setup Grammy + webhook
- [ ] Middleware de autenticação por `telegramChatId`
- [ ] Fluxo de vinculação de conta (`/start` + link único)
- [ ] Comandos: `/gasto`, `/parcelado`, `/resumo`, `/saldo`, `/parcelas`
- [ ] Comandos de objetivo: `/objetivo add`, `/objetivo lista`
- [ ] Wizard conversacional para gastos complexos
- [ ] Formatador de mensagens com emoji e valores BRL

### Backend
- [ ] Endpoint `POST /telegram/link` (vincula chatId ao usuário)
- [ ] Webhook receiver `POST /telegram/webhook`

### Critério de conclusão
Usuário envia `/gasto 25.90 Uber transporte` no Telegram e o gasto aparece no app web em tempo real.

---

## Fase 4 — Dashboard Avançado

**Objetivo:** visualizações ricas e automações.

### Features
- [ ] Gráfico de linha: evolução do gasto mês a mês (últimos 12 meses)
- [ ] Gráfico de donut: distribuição por categoria
- [ ] Projeção visual do fluxo de caixa (12 meses à frente)
- [ ] Saldo calculado automaticamente por conta (soma das transações pagas)
- [ ] Cache Redis para relatórios pesados
- [ ] Notificação proativa via Telegram quando orçamento livre < 20%
- [ ] Export de relatório mensal em CSV/PDF

---

## Ordem de implementação recomendada para vibe coding

```
1. Schema Prisma + migrations
2. API: /transactions (CRUD + parcelas)
3. Frontend: formulário + lista de transações
4. API: /accounts + /categories
5. Frontend: gestão de contas e categorias
6. API: /reports/monthly
7. Frontend: relatório mensal + dashboard básico
   ↓ MVP funcional aqui ↓
8. API: Brain + /goals + /recommendations
9. Frontend: objetivos + dashboard com Brain
10. API: /reports/cashflow + /reports/comparison + /reports/installment-timeline
11. Frontend: relatórios avançados + timeline
    ↓ Fase 2 completa aqui ↓
12. Bot: setup + /start + /gasto + /resumo
13. Bot: wizard + /parcelado + /objetivo
    ↓ Fase 3 completa aqui ↓
```

---

## Variáveis de Ambiente por Serviço

```env
# packages/api/.env
DATABASE_URL=file:./dev.db       # SQLite local
API_KEY=dev-secret-key
PORT=3001

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_KEY=dev-secret-key

# apps/bot/.env
TELEGRAM_BOT_TOKEN=
API_URL=http://localhost:3001
API_KEY=dev-secret-key
```

---

## Scripts do Turbo

```json
// turbo.json
{
  "pipeline": {
    "dev": { "cache": false, "persistent": true },
    "build": { "dependsOn": ["^build"] },
    "db:migrate": { "cache": false },
    "db:seed": { "cache": false }
  }
}
```

```bash
# Rodar tudo em dev
pnpm turbo dev

# Rodar migration
pnpm turbo db:migrate

# Build para produção
pnpm turbo build
```
