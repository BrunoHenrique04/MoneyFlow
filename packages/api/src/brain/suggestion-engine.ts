import { differenceInMonths } from 'date-fns'
import { GoalWithAllocation, BudgetLayers } from './types'

interface SuggestionInput {
  goals: GoalWithAllocation[]
  layers: BudgetLayers
  months: number
}

export function generateSuggestions({ goals, layers, months }: SuggestionInput): string[] {
  const { income, freeBudget, fixedExpenses, installments, nonEssential, goalAporte, commitRatio } = layers
  const suggestions: string[] = []
  const active = goals.filter((g) => g.status === 'ACTIVE')

  // ── Orçamento livre positivo: sugerir aporte extra nas metas ────────────────
  const withDeadline = active.filter((g) => g.targetDate != null)
  if (freeBudget > 200 && active.length > 0) {
    const nearest = withDeadline.sort((a, b) => a.targetDate!.getTime() - b.targetDate!.getTime())[0] ?? active[0]
    suggestions.push(
      `Você tem R$ ${freeBudget.toFixed(2)} de orçamento livre. Considere aportar R$ ${Math.floor(freeBudget * 0.5).toFixed(2)} extras na meta "${nearest.name}" para antecipar o prazo.`,
    )
  } else if (freeBudget > 0 && freeBudget <= 200 && active.length > 0) {
    suggestions.push(
      `Sobram R$ ${freeBudget.toFixed(2)} neste mês — mesmo um pequeno aporte extra faz diferença nas suas metas.`,
    )
  }

  // ── Meta mais próxima do prazo ────────────────────────────────────────────
  const nearest = [...withDeadline].sort((a, b) => a.targetDate!.getTime() - b.targetDate!.getTime())[0]
  if (nearest && nearest.targetDate) {
    const monthsLeft = Math.max(0, differenceInMonths(nearest.targetDate, new Date()))
    if (monthsLeft <= 3) {
      suggestions.push(
        `A meta "${nearest.name}" vence em ${monthsLeft === 0 ? 'menos de 1 mês' : `${monthsLeft} mês(es)`}. Priorize os aportes para não perder o prazo.`,
      )
    } else if (goalAporte > 0) {
      suggestions.push(
        `Com o aporte atual de R$ ${goalAporte.toFixed(2)}/mês, você está no caminho certo para atingir suas metas.`,
      )
    }
  }

  // ── Parcelas altas: sugerir quitação antecipada ──────────────────────────
  if (income > 0 && installments / income > 0.2) {
    suggestions.push(
      `Suas parcelas consomem ${((installments / income) * 100).toFixed(0)}% da renda. Quitar alguma antecipadamente pode liberar fluxo de caixa.`,
    )
  }

  // ── Gastos não essenciais expressivos ──────────────────────────────────────
  if (income > 0 && nonEssential / income > 0.15) {
    suggestions.push(
      `Gastos não essenciais representam ${((nonEssential / income) * 100).toFixed(0)}% da renda (R$ ${nonEssential.toFixed(2)}). Reduzir 20% liberaria R$ ${(nonEssential * 0.2).toFixed(2)} para metas ou reservas.`,
    )
  }

  // ── Comprometimento elevado mas parcelas altas: renegociação ────────────
  if (commitRatio > 75 && installments > fixedExpenses) {
    suggestions.push(
      `O comprometimento da renda está elevado e as parcelas superam os gastos fixos. Renegociar prazos pode aliviar o orçamento.`,
    )
  }

  // ── Análise histórica (múltiplos meses) ──────────────────────────────────
  if (months > 1) {
    suggestions.push(
      `Você está vendo ${months} meses de histórico. Use os relatórios para identificar tendências de gastos ao longo do período.`,
    )
  }

  // ── Sem metas ativas ──────────────────────────────────────────────────────
  if (active.length === 0 && income > 0) {
    suggestions.push(
      `Sem metas financeiras ativas. Defina um objetivo (reserva de emergência, viagem, etc.) para dar propósito ao seu orçamento livre.`,
    )
  }

  // ── Renda zerada ─────────────────────────────────────────────────────────
  if (income === 0) {
    suggestions.push(`Configure sua renda mensal nas configurações para ativar as recomendações do Brain.`)
  }

  return suggestions
}
