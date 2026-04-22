# 01 — Visão Geral

## Produto

MoneyFlow é uma aplicação web **single-user** de controle financeiro pessoal com:
- Registro de gastos únicos, parcelados e recorrentes
- Motor de recomendações que calcula orçamento livre automaticamente
- Metas financeiras com prazo e prioridade
- Interface Telegram como canal alternativo de entrada
- Relatórios analíticos e projeção de fluxo de caixa

---

## Stack Tecnológica

### Backend
| Camada | Tecnologia |
|---|---|
| Runtime | Node.js 20+ |
| Framework | Fastify |
| ORM | Prisma |
| Banco | PostgreSQL (prod) / SQLite (dev local) |
| Validação | Zod |
| Agendamento | node-cron (para recorrências) |

### Frontend
| Camada | Tecnologia |
|---|---|
| Framework | Next.js 14 (App Router) |
| Estilo | Tailwind CSS |
| Componentes | shadcn/ui |
| Estado global | Zustand |
| Fetch/Cache | TanStack Query |
| Gráficos | Recharts |
| Formulários | React Hook Form + Zod |

### Integração Telegram
| Camada | Tecnologia |
|---|---|
| SDK | Grammy (Telegram Bot Framework) |
| Modo | Webhook em produção, polling em dev |

### Infraestrutura (sugestão)
| Serviço | Uso |
|---|---|
| Railway / Render | Deploy do backend + banco |
| Vercel | Deploy do frontend |
| Upstash | Cache Redis (opcional, Fase 4) |

---

## Estrutura de Pastas do Projeto

```
moneyflow/
├── apps/
│   ├── web/                  # Next.js frontend
│   │   ├── app/              # App Router pages
│   │   ├── components/       # UI components
│   │   ├── hooks/            # Custom hooks
│   │   ├── lib/              # Helpers, api client
│   │   └── store/            # Zustand stores
│   └── bot/                  # Telegram bot (Grammy)
│       ├── commands/         # Handlers de cada comando
│       ├── wizards/          # Fluxos conversacionais
│       └── index.ts
├── packages/
│   ├── api/                  # Fastify backend
│   │   ├── routes/           # Rotas por módulo
│   │   ├── services/         # Lógica de negócio
│   │   ├── brain/            # Motor de recomendações
│   │   └── prisma/           # Schema e migrations
│   └── shared/               # Types e Zod schemas compartilhados
├── docker-compose.yml
└── turbo.json                # Turborepo (monorepo)
```

> Monorepo com Turborepo. `packages/shared` garante que os tipos Zod são iguais no frontend, backend e bot sem duplicação.

---

## Fluxo de Dados Global

```
Usuário (Web ou Telegram)
        │
        ▼
   API Fastify
   /api/v1/...
        │
        ├─► Serviço (valida, persiste)
        │          │
        │          ▼
        │       Prisma → PostgreSQL
        │
        └─► Brain.recalculate(userId)
                   │
                   ▼
            BudgetSnapshot salvo
            Recommendation gerada
            Alerta emitido (se necessário)
```

Toda mutação passa pela API. O Brain **nunca é chamado diretamente** pelo frontend — ele é acionado internamente pelos serviços após qualquer persistência relevante.

---

## Decisões de Arquitetura

| Decisão | Justificativa |
|---|---|
| Monorepo Turborepo | Compartilha types Zod entre web, api e bot sem duplicação |
| Fastify em vez de Express | Performance superior, schema nativo com Zod, melhor DX |
| Prisma | Migrations versionadas, type-safety no ORM, suporte SQLite/PG |
| SQLite em dev | Zero config local, troca por PG em prod via `DATABASE_URL` |
| App Router (Next.js) | Server Components reduzem bundle, melhor SEO futuro |
| TanStack Query | Cache automático, invalidação granular após mutações |
| Brain como serviço interno | Garante consistência — nunca há estado de orçamento desatualizado |
