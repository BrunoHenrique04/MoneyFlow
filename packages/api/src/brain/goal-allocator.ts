import { GoalWithAllocation } from './types'

const PRIORITY_WEIGHT: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }

export function distributeGoalAportes(
  goals: GoalWithAllocation[],
  available: number,
): number {
  const sorted = [...goals].sort(
    (a, b) => (PRIORITY_WEIGHT[b.priority] ?? 1) - (PRIORITY_WEIGHT[a.priority] ?? 1),
  )

  let remaining = available
  let total = 0

  for (const goal of sorted) {
    const needed = goal.monthlyAporte
    const allocated = Math.max(0, Math.min(needed, remaining))
    goal.allocatedAporte = allocated
    remaining -= allocated
    total += allocated
    if (allocated < needed) goal.onTrackWarning = true
  }

  return total
}
