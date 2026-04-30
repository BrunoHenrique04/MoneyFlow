export interface GoalWithAllocation {
  id: string
  name: string
  goalMode: string
  targetAmount: number | null
  savedAmount: number
  targetDate: Date | null
  fixedMonthlyAporte: number | null
  priority: string
  status: string
  monthlyAporte: number
  depositedThisMonth: number
  allocatedAporte?: number
  onTrackWarning?: boolean
}

export interface TransactionWithCategory {
  id: string
  amount: number
  type: string
  utilityTag: string
  categoryId: string
  status: string
  situacao?: string | null
  recurringTemplateId?: string | null
  category: { categoryType: string; name: string }
}

// Budget layers in priority order:
// 1. FIXED (rent, utilities) — non-negotiable
// 2. HEALTH (insurance, pharmacy)
// 3. ESSENTIAL one-offs (grocery, transport)
// 4. INSTALLMENTS (committed purchase payments)
// 5. GOALS (savings towards objectives)
// 6. FREE (discretionary)
export interface BudgetLayers {
  income: number             // effectiveIncome = baseIncome + extraIncome
  extraIncome: number        // sum of INCOME + RECEBER transactions for the month
  fixedExpenses: number      // FIXED type or FIXED category
  healthExpenses: number     // HEALTH category
  essentialExpenses: number  // ESSENTIAL tag, not FIXED/HEALTH
  installments: number       // INSTALLMENT type (not counted above)
  nonEssential: number       // NON_ESSENTIAL for reference
  goalAporte: number
  freeBudget: number
  totalCommitted: number
  commitRatio: number        // totalCommitted / income * 100
}
