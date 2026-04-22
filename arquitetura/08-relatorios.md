# 08 — Módulo de Relatórios

## Responsabilidade

Gerar visões analíticas sobre os dados financeiros. Todos os relatórios são read-only e não disparam o Brain.

---

## Relatório Mensal

**Endpoint:** `GET /reports/monthly?month=2025-04`

### Query SQL (via Prisma)

```typescript
async function getMonthlyReport(userId: string, month: string) {
  const [year, m] = month.split('-').map(Number)
  const start = new Date(year, m - 1, 1)
  const end = new Date(year, m, 0, 23, 59, 59)

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      dueDate: { gte: start, lte: end },
      status: { not: 'CANCELLED' },
    },
    include: { category: true, account: true },
  })

  const byCategory = groupBy(transactions, 'categoryId').map(group => ({
    categoryId: group.categoryId,
    name: group.category.name,
    amount: sum(group.items),
    percent: (sum(group.items) / totalSpent) * 100,
  }))

  const byAccount = groupBy(transactions, 'accountId').map(group => ({
    accountId: group.accountId,
    name: group.account.name,
    amount: sum(group.items),
  }))

  const byUtility = {
    essential: sum(transactions.filter(t => t.utilityTag === 'ESSENTIAL')),
    nonEssential: sum(transactions.filter(t => t.utilityTag === 'NON_ESSENTIAL')),
    investment: sum(transactions.filter(t => t.utilityTag === 'INVESTMENT')),
  }

  return { month, totalSpent, byCategory, byAccount, byUtility }
}
```

---

## Timeline de Parcelas

**Endpoint:** `GET /reports/installment-timeline?months=6`

Mostra os próximos N meses com as parcelas ativas em cada um.

```typescript
async function getInstallmentTimeline(userId: string, months: number) {
  const result = []
  const today = new Date()

  for (let i = 0; i < months; i++) {
    const monthDate = addMonths(today, i)
    const month = format(monthDate, 'yyyy-MM')
    const start = startOfMonth(monthDate)
    const end = endOfMonth(monthDate)

    const installments = await prisma.transaction.findMany({
      where: {
        userId,
        type: { in: ['INSTALLMENT', 'RECURRING'] },
        status: 'PENDING',
        dueDate: { gte: start, lte: end },
      },
      include: { installmentGroup: true },
    })

    result.push({
      month,
      installments: installments.map(t => ({
        description: t.description,
        amount: t.amount,
        installmentNumber: t.installmentNumber,
        of: t.installmentGroup?.totalInstallments,
        accountId: t.accountId,
      })),
      totalInstallments: sum(installments),
    })
  }

  return result
}
```

---

## Fluxo de Caixa Projetado

**Endpoint:** `GET /reports/cashflow?months=6`

Projeta entrada vs saída para os próximos N meses.

```typescript
async function getCashflow(userId: string, months: number) {
  const user = await getUser(userId)
  const result = []

  for (let i = 0; i < months; i++) {
    const month = format(addMonths(new Date(), i), 'yyyy-MM')
    const transactions = await getTransactionsForMonth(userId, month)
    const recommendation = await getRecommendation(userId, month)

    result.push({
      month,
      projectedIncome: user.monthlyIncome,
      projectedExpenses: sum(transactions.filter(t => t.status === 'PENDING')),
      projectedFree: recommendation?.freeBudget ?? 0,
      installments: sum(transactions.filter(t => t.type === 'INSTALLMENT')),
      goals: recommendation?.investmentBudget ?? 0,
    })
  }

  return result
}
```

---

## Relatório Comparativo

**Endpoint:** `GET /reports/comparison`

Compara mês atual vs anterior vs média dos últimos 3 meses.

```typescript
async function getComparison(userId: string) {
  const months = [
    format(new Date(), 'yyyy-MM'),                 // atual
    format(subMonths(new Date(), 1), 'yyyy-MM'),   // anterior
    format(subMonths(new Date(), 2), 'yyyy-MM'),   // -2
    format(subMonths(new Date(), 3), 'yyyy-MM'),   // -3
  ]

  const data = await Promise.all(months.map(m => getMonthlyReport(userId, m)))

  const avg3months = (data[1].totalSpent + data[2].totalSpent + data[3].totalSpent) / 3

  return {
    current: data[0],
    previous: data[1],
    avg3months,
    variation: {
      vsLastMonth: ((data[0].totalSpent - data[1].totalSpent) / data[1].totalSpent) * 100,
      vsAvg3months: ((data[0].totalSpent - avg3months) / avg3months) * 100,
    },
  }
}
```

---

## Estrutura do Serviço

```
packages/api/src/services/reports/
├── monthly.ts
├── installment-timeline.ts
├── cashflow.ts
├── comparison.ts
└── index.ts
```

---

## Performance

- Relatórios **não são cacheados** no MVP — calculados on-demand
- Relatório mensal: O(n) nas transações do mês — rápido
- Cashflow 12 meses: pode ser lento se houver muitas transações futuras — adicionar cache Redis na Fase 4
- Todos os relatórios têm índice em `(userId, dueDate)` no banco
