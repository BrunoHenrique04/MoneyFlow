import type { CategoryType } from './schemas/category'
export type TransactionType = 'SINGLE' | 'INSTALLMENT' | 'FIXED' | 'INCOME' | 'SHARED'
export type Situacao = 'PAGO' | 'NAO_PAGO' | 'RECEBER'
export type UtilityTag = 'ESSENTIAL' | 'NON_ESSENTIAL' | 'INVESTMENT'
export type TransactionStatus = 'PENDING' | 'PAID' | 'CANCELLED'
export type GoalPriority = 'HIGH' | 'MEDIUM' | 'LOW'
export type GoalStatus = 'ACTIVE' | 'COMPLETED' | 'PAUSED' | 'CANCELLED'
export type GoalMode = 'DEADLINE_TARGET' | 'FIXED_APORTE_TARGET' | 'FIXED_APORTE_DEADLINE' | 'FREE_SAVING'

export interface GoalDepositSummary {
  month: string
  deposited: number
  expected: number
}

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
  categoryType: CategoryType
  createdAt: string
}

export interface Transaction {
  id: string
  userId: string
  accountId: string
  categoryId: string
  installmentGroupId: string | null
  recurringTemplateId: string | null
  description: string
  amount: number
  totalAmount: number | null
  pessoa: string | null
  situacao: Situacao | null
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
  installmentGroup?: { totalInstallments: number } | null
  isFuture?: boolean
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
  goalMode: GoalMode
  targetAmount: number | null
  savedAmount: number
  targetDate: string | null
  fixedMonthlyAporte: number | null
  priority: GoalPriority
  status: GoalStatus
  monthlyAporte: number
  progressPercent: number | null
  monthsRemaining: number | null
  depositedThisMonth: number
  remainingThisMonth: number
  estimatedDeadline: string | null
  projectedTotal: number | null
  onTrack: boolean
  depositHistory: GoalDepositSummary[]
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

export interface Debt {
  id: string
  userId: string
  pessoa: string
  dataCompra: string | null
  descricao: string
  banco: string | null
  valorAPagar: number
  valorTotalCompra: number
  situacao: Situacao
  dataVencimento: string | null
  observacoes: string | null
  createdAt: string
  updatedAt: string
}

export interface RecurringTemplate {
  id: string
  userId: string
  type: 'FIXED' | 'INCOME'
  description: string
  amount: number
  accountId: string
  categoryId: string
  utilityTag: UtilityTag
  dayOfMonth: number
  startMonth: string
  endMonth: string | null
  isActive: boolean
  notes: string | null
  createdAt: string
  updatedAt: string
  account?: Account
  category?: Category
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
