export type TransactionType = 'SINGLE' | 'INSTALLMENT' | 'RECURRING' | 'INCOME'
export type UtilityTag = 'ESSENTIAL' | 'NON_ESSENTIAL' | 'INVESTMENT'
export type TransactionStatus = 'PENDING' | 'PAID' | 'CANCELLED'
export type GoalPriority = 'HIGH' | 'MEDIUM' | 'LOW'
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'

export interface ApiResponse<T> {
  data: T | null
  error: { code: string; message: string } | null
}

export interface User {
  id: string
  name: string
  monthlyIncome: number
  currency: string
  timezone: string
  telegramChatId: string | null
  createdAt: string
  updatedAt: string
}

export interface Account {
  id: string
  userId: string
  name: string
  color: string
  icon: string
  balance: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  userId: string
  name: string
  color: string
  icon: string
  isDefault: boolean
  createdAt: string
}

export interface Transaction {
  id: string
  userId: string
  accountId: string
  categoryId: string
  installmentGroupId: string | null
  description: string
  amount: number
  type: TransactionType
  utilityTag: UtilityTag
  status: TransactionStatus
  dueDate: string
  paidAt: string | null
  installmentNumber: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
  account?: Account
  category?: Category
}

export interface InstallmentGroup {
  id: string
  userId: string
  description: string
  totalAmount: number
  totalInstallments: number
  firstDueDate: string
  createdAt: string
  transactions?: Transaction[]
}

export interface Goal {
  id: string
  userId: string
  name: string
  targetAmount: number
  savedAmount: number
  targetDate: string
  priority: GoalPriority
  status: GoalStatus
  monthlyAporte: number
  progressPercent: number
  monthsRemaining: number
  createdAt: string
  updatedAt: string
}

export interface Recommendation {
  referenceMonth: string
  essentialBudget: number
  investmentBudget: number
  freeBudget: number
  alerts: string[]
  suggestions: string[]
  calculatedAt: string
}

export interface BudgetSnapshot {
  id: string
  userId: string
  month: string
  totalIncome: number
  totalEssential: number
  totalInstallments: number
  totalGoalAporte: number
  totalFree: number
  totalSpent: number
}
