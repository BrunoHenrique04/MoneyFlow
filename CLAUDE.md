# CLAUDE.md

## Projeto: MoneyFlow

Aplicação web de controle financeiro pessoal (single-user) com motor de recomendações, metas financeiras e integração Telegram.

## Arquitetura

Documentação completa em `/arquitetura/`. Leia antes de implementar qualquer módulo.

### Stack
- **Backend:** Fastify + Prisma + PostgreSQL (SQLite em dev)
- **Frontend:** Next.js 14 (App Router) + Tailwind + shadcn/ui + TanStack Query
- **Bot:** Grammy (Telegram)
- **Monorepo:** Turborepo + pnpm

### Estrutura
```
moneyflow/
├── apps/web/      # Next.js frontend
├── apps/bot/      # Telegram bot
└── packages/api/  # Fastify backend + Prisma
```

## Comandos (a preencher após setup)

```bash
pnpm turbo dev          # inicia todos os serviços
pnpm turbo build        # build para produção
pnpm turbo db:migrate   # roda migrations Prisma
pnpm turbo db:seed      # seed de categorias padrão
```

## Regras Críticas de Negócio

1. **Brain sempre consistente:** qualquer mutação de Transaction, Goal ou User.monthlyIncome deve chamar `brain.recalculate()` ao final
2. **Parcelas são entidades reais:** cada parcela é uma `Transaction` autônoma — nunca gere parcelas como campos calculados
3. **API única:** o bot Telegram não acessa o banco diretamente, apenas a API REST
4. **Zod compartilhado:** schemas de validação vivem em `packages/shared` — frontend, backend e bot importam dali
