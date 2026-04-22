'use client'
import { BudgetOverview } from '@/components/dashboard/BudgetOverview'
import { TransactionList } from '@/components/transactions/TransactionList'
import { useUIStore } from '@/store/ui.store'
import { useMonthlyReport } from '@/hooks/useReports'
import { formatBRL, formatMonth } from '@/lib/utils'

export default function Dashboard() {
  const { selectedMonth } = useUIStore()
  const { data: report } = useMonthlyReport(selectedMonth)

  const reportData = report as {
    totalSpent: number
    byUtility: { essential: number; nonEssential: number; investment: number }
  } | undefined

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">{formatMonth(selectedMonth)}</p>
      </div>

      <BudgetOverview />

      {reportData && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Total gasto</p>
            <p className="text-xl font-bold mt-1">{formatBRL(reportData.totalSpent)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Essencial</p>
            <p className="text-xl font-bold text-orange-500 mt-1">{formatBRL(reportData.byUtility.essential)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs text-muted-foreground">Não essencial</p>
            <p className="text-xl font-bold text-purple-500 mt-1">{formatBRL(reportData.byUtility.nonEssential)}</p>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold mb-4">Lançamentos do mês</h2>
        <TransactionList month={selectedMonth} />
      </div>
    </div>
  )
}
