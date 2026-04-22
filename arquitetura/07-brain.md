# 07 — Brain (Motor de Recomendações)

## Responsabilidade

Núcleo inteligente da aplicação. Calculado automaticamente após qualquer mutação relevante. Produz o orçamento categorizado e recomendações textuais para o usuário.

---

## Quando o Brain é Disparado

| Evento | Meses recalculados |
|---|---|
| Criar / editar / cancelar transação | Mês(es) afetado(s) |
| Criar / editar / deletar objetivo | Mês atual em diante |
| Atualizar renda (`monthlyIncome`) | Mês atual em diante |
| Atualizar limite de categoria | Mês atual |
| Marcar objetivo como PAID/PAUSED/CANCELLED | Mês atual em diante |

---

## Fórmula Central

```
orçamento_essencial   = sum(ESSENTIAL transactions no mês)
orçamento_parcelas    = sum(INSTALLMENT/RECURRING PENDING no mês)
orçamento_investimento = sum(monthlyAporte de goals ACTIVE)
orçamento_livre       = renda - essencial - parcelas - investimento

Se orçamento_livre < 0 → alerta crítico
```

---

## Algoritmo Completo

```typescript
async function recalculate(userId: string, months: string[] = [currentMonth()]) {
  const user = await getUserWithIncome(userId)
  const goals = await getActiveGoals(userId)

  for (const month of months) {
    const transactions = await getTransactionsForMonth(userId, month)

    // 1. Agrupa por utilityTag
    const essential = sum(transactions.filter(t => t.utilityTag === 'ESSENTIAL'))
    const investment = sum(transactions.filter(t => t.utilityTag === 'INVESTMENT'))
    const installments = sum(
      transactions.filter(t => t.type === 'INSTALLMENT' || t.type === 'RECURRING')
    )

    // 2. Calcula aportes dos objetivos (apenas mês atual)
    const goalAporte = month === currentMonth()
      ? distributeGoalAportes(goals, user.monthlyIncome - essential - installments)
      : 0

    // 3. Orçamento livre
    const freeBudget = user.monthlyIncome - essential - installments - goalAporte

    // 4. Gera alertas
    const alerts = generateAlerts(userId, month, transactions, freeBudget)

    // 5. Gera sugestões textuais
    const suggestions = generateSuggestions(goals, freeBudget, user)

    // 6. Persiste Recommendation (upsert por mês)
    await upsertRecommendation(userId, month, {
      essentialBudget: essential,
      investmentBudget: goalAporte,
      freeBudget,
      alerts,
      suggestions,
    })

    // 7. Atualiza BudgetSnapshot
    await upsertBudgetSnapshot(userId, month, { ... })
  }
}
```

---

## Distribuição de Aportes por Objetivo

```typescript
function distributeGoalAportes(goals: Goal[], availableForInvestment: number): number {
  const sortedGoals = goals.sort((a, b) => priorityWeight(b) - priorityWeight(a))
  let remaining = availableForInvestment
  let totalAporte = 0

  for (const goal of sortedGoals) {
    const needed = goal.monthlyAporte
    const allocated = Math.min(needed, remaining)
    goal.allocatedAporte = allocated
    remaining -= allocated
    totalAporte += allocated

    if (allocated < needed) {
      goal.onTrackWarning = true // será incluído nos alertas
    }
  }

  return totalAporte
}

function priorityWeight(goal: Goal): number {
  return { HIGH: 3, MEDIUM: 2, LOW: 1 }[goal.priority]
}
```

---

## Geração de Alertas

```typescript
function generateAlerts(userId, month, transactions, freeBudget): string[] {
  const alerts: string[] = []

  // 1. Orçamento negativo
  if (freeBudget < 0) {
    alerts.push(`Atenção: orçamento do mês excede a renda em R$ ${Math.abs(freeBudget).toFixed(2)}`)
  }

  // 2. Orçamento livre abaixo de 10%
  if (freeBudget < user.monthlyIncome * 0.1 && freeBudget >= 0) {
    alerts.push(`Orçamento livre muito baixo: apenas R$ ${freeBudget.toFixed(2)} restante`)
  }

  // 3. Limites de categoria ultrapassados
  const limits = await getCategoryLimits(userId)
  for (const limit of limits) {
    const spent = sum(transactions.filter(t => t.categoryId === limit.categoryId))
    if (spent > limit.limitValue) {
      alerts.push(`${limit.category.name} ultrapassou o limite de R$ ${limit.limitValue.toFixed(2)} (gasto: R$ ${spent.toFixed(2)})`)
    }
  }

  // 4. Objetivos em risco
  for (const goal of goals) {
    if (goal.onTrackWarning) {
      alerts.push(`Meta "${goal.name}" está em risco: aporte necessário de R$ ${goal.monthlyAporte.toFixed(2)} mas apenas R$ ${goal.allocatedAporte.toFixed(2)} disponível`)
    }
  }

  return alerts
}
```

---

## Geração de Sugestões Textuais

```typescript
function generateSuggestions(goals: Goal[], freeBudget: number, user: User): string[] {
  const suggestions: string[] = []

  // Meta mais próxima do prazo
  const nearest = goals.sort((a, b) => a.targetDate - b.targetDate)[0]
  if (nearest) {
    const months = differenceInMonths(nearest.targetDate, new Date())
    suggestions.push(
      `Com o aporte atual de R$ ${nearest.monthlyAporte.toFixed(2)}/mês, ` +
      `"${nearest.name}" estará completa em ${months} meses.`
    )
  }

  // Sugestão de uso do orçamento livre
  if (freeBudget > 200) {
    suggestions.push(
      `Você tem R$ ${freeBudget.toFixed(2)} de orçamento livre este mês. ` +
      `Considere aportar parte disso em suas metas.`
    )
  }

  return suggestions
}
```

---

## Estrutura do Serviço

```
packages/api/src/brain/
├── index.ts           # ponto de entrada: brain.recalculate(userId, months?)
├── calculator.ts      # lógica central de cálculo
├── goal-allocator.ts  # distribuição de aportes por prioridade
├── alert-generator.ts # regras de alerta
├── suggestion-engine.ts # geração de textos
└── types.ts           # tipos internos do Brain
```

---

## Garantias

- Idempotente: chamar `recalculate` múltiplas vezes no mesmo mês produz o mesmo resultado
- Nunca falha silenciosamente: erros são logados e propagados como `BRAIN_ERROR`
- Sempre executa em background (sem bloquear a response da API ao usuário)
- Usa `upsert` — nunca cria duplicatas de `Recommendation` ou `BudgetSnapshot`
