import { differenceInMonths } from 'date-fns'
import { GoalWithAllocation } from './types'

export function generateSuggestions(
  goals: GoalWithAllocation[],
  freeBudget: number,
): string[] {
  const suggestions: string[] = []
  const active = goals.filter((g) => g.status === 'ACTIVE')

  const nearest = [...active].sort(
    (a, b) => a.targetDate.getTime() - b.targetDate.getTime(),
  )[0]

  if (nearest) {
    const months = Math.max(0, differenceInMonths(nearest.targetDate, new Date()))
    suggestions.push(
      `Com o aporte atual de R$ ${nearest.monthlyAporte.toFixed(2)}/mês, "${nearest.name}" estará completa em ${months} meses.`,
    )
  }

  if (freeBudget > 200) {
    suggestions.push(
      `Você tem R$ ${freeBudget.toFixed(2)} de orçamento livre este mês. Considere aportar parte disso em suas metas.`,
    )
  }

  return suggestions
}
