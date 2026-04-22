import { GoalWithAllocation } from './types'

interface AlertInput {
  userId: string
  freeBudget: number
  monthlyIncome: number
  transactions: Array<{ categoryId: string; amount: number }>
  goals: GoalWithAllocation[]
  limits: Array<{ categoryId: string; limitValue: number; category: { name: string } }>
}

export function generateAlerts(input: AlertInput): string[] {
  const { freeBudget, monthlyIncome, transactions, goals, limits } = input
  const alerts: string[] = []

  if (freeBudget < 0) {
    alerts.push(
      `Atenção: orçamento do mês excede a renda em R$ ${Math.abs(freeBudget).toFixed(2)}`,
    )
  } else if (freeBudget < monthlyIncome * 0.1) {
    alerts.push(
      `Orçamento livre muito baixo: apenas R$ ${freeBudget.toFixed(2)} restante`,
    )
  }

  for (const limit of limits) {
    const spent = transactions
      .filter((t) => t.categoryId === limit.categoryId)
      .reduce((sum, t) => sum + t.amount, 0)
    if (spent > limit.limitValue) {
      alerts.push(
        `${limit.category.name} ultrapassou o limite de R$ ${limit.limitValue.toFixed(2)} (gasto: R$ ${spent.toFixed(2)})`,
      )
    }
  }

  for (const goal of goals) {
    if (goal.onTrackWarning) {
      alerts.push(
        `Meta "${goal.name}" em risco: aporte necessário R$ ${goal.monthlyAporte.toFixed(2)}, disponível R$ ${(goal.allocatedAporte ?? 0).toFixed(2)}`,
      )
    }
  }

  return alerts
}
