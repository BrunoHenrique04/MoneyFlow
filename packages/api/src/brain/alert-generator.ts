import { GoalWithAllocation, TransactionWithCategory, BudgetLayers } from './types'

interface AlertInput {
  layers: BudgetLayers
  transactions: TransactionWithCategory[]
  goals: GoalWithAllocation[]
  limits: Array<{ categoryId: string; limitValue: number; category: { name: string } }>
}

export function generateAlerts(input: AlertInput): string[] {
  const { layers, transactions, goals, limits } = input
  const { income, freeBudget, commitRatio, fixedExpenses, healthExpenses, installments } = layers
  const alerts: string[] = []
  const active = transactions.filter((t) => t.status !== 'CANCELLED')

  // ── Orçamento ────────────────────────────────────────────────────────────────
  if (freeBudget < 0) {
    alerts.push(
      `🚨 Orçamento negativo: seus gastos excedem a renda em R$ ${Math.abs(freeBudget).toFixed(2)}`,
    )
  } else if (freeBudget < income * 0.05) {
    alerts.push(
      `⚠️ Orçamento livre crítico: apenas R$ ${freeBudget.toFixed(2)} restante (${((freeBudget / income) * 100).toFixed(1)}% da renda)`,
    )
  } else if (freeBudget < income * 0.1) {
    alerts.push(
      `⚠️ Orçamento livre baixo: R$ ${freeBudget.toFixed(2)} (${((freeBudget / income) * 100).toFixed(1)}% da renda)`,
    )
  }

  // ── Comprometimento alto ─────────────────────────────────────────────────────
  if (commitRatio > 90) {
    alerts.push(
      `🔴 ${commitRatio.toFixed(0)}% da sua renda está comprometida com gastos fixos e parcelas`,
    )
  } else if (commitRatio > 75) {
    alerts.push(
      `🟡 ${commitRatio.toFixed(0)}% da renda comprometida — pouco espaço para imprevistos`,
    )
  }

  // ── Gastos fixos altos ────────────────────────────────────────────────────────
  if (income > 0 && fixedExpenses / income > 0.4) {
    alerts.push(
      `🏠 Gastos fixos (R$ ${fixedExpenses.toFixed(2)}) consomem ${((fixedExpenses / income) * 100).toFixed(0)}% da renda — acima do recomendado de 40%`,
    )
  }

  // ── Saúde zerada ─────────────────────────────────────────────────────────────
  if (healthExpenses === 0 && income > 1500) {
    alerts.push(`💊 Nenhum gasto de saúde registrado este mês — considere incluir plano ou consultas`)
  }

  // ── Parcelas pesadas ─────────────────────────────────────────────────────────
  if (income > 0 && installments / income > 0.3) {
    alerts.push(
      `💳 Parcelas comprometem ${((installments / income) * 100).toFixed(0)}% da renda (R$ ${installments.toFixed(2)}) — acima do recomendado de 30%`,
    )
  }

  // ── Limites de categoria ultrapassados ───────────────────────────────────────
  for (const limit of limits) {
    const spent = active
      .filter((t) => t.categoryId === limit.categoryId)
      .reduce((s, t) => s + t.amount, 0)
    if (spent > limit.limitValue) {
      const over = spent - limit.limitValue
      alerts.push(
        `📊 ${limit.category.name}: limite de R$ ${limit.limitValue.toFixed(2)} ultrapassado em R$ ${over.toFixed(2)} (gasto: R$ ${spent.toFixed(2)})`,
      )
    }
  }

  // ── Objetivos em risco ────────────────────────────────────────────────────────
  for (const goal of goals) {
    if (goal.onTrackWarning) {
      const gap = goal.monthlyAporte - (goal.allocatedAporte ?? 0)
      alerts.push(
        `🎯 Meta "${goal.name}" em risco: faltam R$ ${gap.toFixed(2)}/mês para o aporte necessário`,
      )
    }
  }

  return alerts
}
