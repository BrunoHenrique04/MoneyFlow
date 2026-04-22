# 10 — Frontend (Web App)

## Stack

- Next.js 14 (App Router)
- Tailwind CSS + shadcn/ui
- Zustand (estado global)
- TanStack Query (server state)
- React Hook Form + Zod
- Recharts (gráficos)

---

## Rotas (App Router)

```
app/
├── layout.tsx                 # Shell global: sidebar + header
├── page.tsx                   # → redirect para /dashboard
├── dashboard/
│   └── page.tsx               # Visão geral: orçamento, alertas, resumo
├── transactions/
│   ├── page.tsx               # Lista de transações com filtros
│   └── new/
│       └── page.tsx           # Formulário de novo lançamento
├── accounts/
│   └── page.tsx               # Gestão de contas/bancos
├── goals/
│   ├── page.tsx               # Lista de objetivos com progresso
│   └── new/
│       └── page.tsx
├── reports/
│   ├── page.tsx               # Hub de relatórios
│   ├── monthly/
│   │   └── page.tsx
│   ├── installments/
│   │   └── page.tsx           # Timeline de parcelas
│   └── cashflow/
│       └── page.tsx
└── settings/
    └── page.tsx               # Perfil, categorias, limites, Telegram
```

---

## Layout Global

```tsx
// app/layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryProvider>
          <div className="flex h-screen">
            <Sidebar />              {/* nav lateral — oculta no mobile */}
            <main className="flex-1 overflow-auto">
              <TopBar />             {/* header mobile com menu hamburguer */}
              {children}
            </main>
          </div>
          <BudgetAlertToast />      {/* notificações do Brain */}
        </QueryProvider>
      </body>
    </html>
  )
}
```

---

## Dashboard (`/dashboard`)

### Componentes

```
DashboardPage
├── BudgetOverview              # orçamento livre, essencial, investimento (3 cards)
├── AlertBanner                 # alertas do Brain (se houver)
├── RecentTransactions          # últimas 5 transações
├── GoalProgressList            # objetivos ativos com barra de progresso
└── MonthlySpendingChart        # donut chart por categoria (Recharts)
```

### Dados carregados

```typescript
// hooks/useDashboard.ts
export function useDashboard() {
  const recommendation = useQuery({ queryKey: ['recommendation', 'current'], ... })
  const transactions = useQuery({ queryKey: ['transactions', { month: currentMonth() }], ... })
  const goals = useQuery({ queryKey: ['goals', { status: 'ACTIVE' }], ... })

  return { recommendation, transactions, goals }
}
```

---

## Formulário de Novo Lançamento

### Campos dinâmicos por tipo

```
TransactionForm
├── Selector de tipo: [Único] [Parcelado] [Recorrente]
├── Campos comuns:
│   ├── description (input)
│   ├── amount (input numérico)
│   ├── categoryId (select com ícones)
│   ├── accountId (select com cores)
│   └── utilityTag (toggle: Essencial / Não-essencial / Investimento)
├── Campos condicionais (parcelado):
│   ├── totalInstallments (input)
│   └── firstDueDate (date picker)
└── Submit → POST /transactions → invalidate queries → toast de sucesso
```

```typescript
// components/transactions/transaction-form.tsx
const schema = CreateTransactionSchema  // reutiliza o Zod do packages/shared

const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
})

const { mutate } = useMutation({
  mutationFn: (data) => api.transactions.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['recommendation'] })
    toast.success('Lançamento registrado!')
    router.push('/transactions')
  }
})
```

---

## Timeline de Parcelas

Exibição de calendário horizontal mostrando meses com parcelas ativas:

```
Abr/25   Mai/25   Jun/25   Jul/25   ...
R$300    R$300    R$300    R$300
Samsung  Samsung  Samsung  Samsung
────     ────     ────     ────
R$55.9   R$55.9
Netflix  Netflix
```

Componente: `InstallmentTimeline` — renderiza cards por mês com lista de parcelas.

---

## Estado Global (Zustand)

```typescript
// store/ui.ts — apenas estado de UI, não de dados
interface UIStore {
  sidebarOpen: boolean
  setSidebarOpen: (v: boolean) => void
  activeMonth: string               // "2025-04"
  setActiveMonth: (m: string) => void
}
```

Dados do servidor ficam exclusivamente no TanStack Query — Zustand apenas para estado local de UI.

---

## Invalidação de Cache (TanStack Query)

Após qualquer mutação:

```typescript
// lib/query-keys.ts
export const queryKeys = {
  transactions: (filters?) => ['transactions', filters],
  recommendation: (month?) => ['recommendation', month ?? 'current'],
  goals: (status?) => ['goals', status],
  reports: {
    monthly: (month) => ['reports', 'monthly', month],
    cashflow: (months) => ['reports', 'cashflow', months],
  }
}

// Após criar transação:
queryClient.invalidateQueries({ queryKey: ['transactions'] })
queryClient.invalidateQueries({ queryKey: ['recommendation'] })
queryClient.invalidateQueries({ queryKey: ['reports'] })
```

---

## Componentes Compartilhados (components/ui)

Baseados no shadcn/ui, sem modificação — instalar via CLI do shadcn:

```
Button, Input, Select, Card, Badge, Dialog, Sheet,
Tabs, Progress, Tooltip, Toast, Popover, Calendar
```

Componentes de domínio em `components/`:

```
MoneyInput         # input formatado em BRL
CategoryBadge      # badge colorida com ícone da categoria
AccountBadge       # badge com cor do banco
UtilityTagBadge    # badge Essencial/Não-essencial/Investimento
TransactionCard    # card de uma transação na lista
GoalCard           # card de objetivo com progress bar
BudgetMeter        # medidor visual do orçamento (essencial + livre + meta)
```

---

## Mobile-First

- Sidebar colapsada em mobile, aberta via Sheet do shadcn
- Formulários em coluna única no mobile, dois colunas em md+
- Bottom navigation bar em mobile (Dashboard, Lançamentos, Metas, Relatórios)
- Transações em cards no mobile, tabela em desktop

---

## Variáveis de Ambiente (Web)

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_API_KEY=dev-key
```
