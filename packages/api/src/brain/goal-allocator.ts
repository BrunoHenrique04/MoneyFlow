import { differenceInMonths } from 'date-fns'
import { GoalWithAllocation } from './types'

const PRIORITY_WEIGHT: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 }

export function computeNeededAporte(goal: GoalWithAllocation): number {
  const { goalMode, targetAmount, savedAmount, targetDate, fixedMonthlyAporte } = goal

  if (
    goalMode === 'FREE_SAVING' ||
    goalMode === 'FIXED_APORTE_DEADLINE' ||
    goalMode === 'FIXED_APORTE_TARGET'
  ) {
    return fixedMonthlyAporte ?? 0
  }

  // DEADLINE_TARGET: dynamic based on remaining months
  if (!targetAmount || !targetDate) return 0
  const monthsLeft = Math.max(1, differenceInMonths(targetDate, new Date()))
  return Math.max(0, (targetAmount - savedAmount) / monthsLeft)
}

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
    const needed = computeNeededAporte(goal)
    // already deposited this month reduces the reservation
    const reservation = Math.max(0, needed - goal.depositedThisMonth)
    const allocated = Math.max(0, Math.min(reservation, remaining))
    goal.allocatedAporte = allocated
    remaining -= allocated
    total += allocated
    if (allocated < reservation) goal.onTrackWarning = true
  }

  return total
}
