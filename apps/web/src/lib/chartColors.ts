export const CHART_GREENS = [
  '#14532d', // green-900
  '#166534', // green-800
  '#15803d', // green-700
  '#16a34a', // green-600
  '#22c55e', // green-500
  '#4ade80', // green-400
  '#059669', // emerald-600
  '#10b981', // emerald-500
  '#34d399', // emerald-400
  '#6ee7b7', // emerald-300
]

export const BUDGET_COLORS: Record<string, string> = {
  fixedExpenses:     '#14532d',
  installments:      '#166534',
  essentialExpenses: '#15803d',
  goalAporte:        '#16a34a',
  nonEssential:      '#22c55e',
  freeBudget:        '#bbf7d0',
}

export const BUDGET_LABELS: Record<string, string> = {
  fixedExpenses:     'Gastos Fixos',
  installments:      'Parcelas',
  essentialExpenses: 'Essencial',
  goalAporte:        'Metas',
  nonEssential:      'Não essencial',
  freeBudget:        'Livre',
}

export function commitRatioColor(ratio: number): string {
  if (ratio >= 95) return '#14532d'
  if (ratio >= 80) return '#166534'
  if (ratio >= 65) return '#15803d'
  if (ratio >= 50) return '#16a34a'
  if (ratio >= 35) return '#22c55e'
  return '#4ade80'
}

export function commitRatioLabel(ratio: number): string {
  if (ratio >= 95) return 'Travado'
  if (ratio >= 80) return 'Crítico'
  if (ratio >= 65) return 'Apertado'
  if (ratio >= 50) return 'Moderado'
  if (ratio >= 35) return 'Confortável'
  return 'Livre'
}
