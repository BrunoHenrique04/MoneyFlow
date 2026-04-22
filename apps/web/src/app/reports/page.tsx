'use client'
import { useMonthlyReport, useInstallmentTimeline } from '@/hooks/useReports'
import { useUIStore } from '@/store/ui.store'
import { formatBRL, formatMonth } from '@/lib/utils'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'

const COLORS = ['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#F97316', '#6366F1', '#EC4899', '#6B7280']

export default function ReportsPage() {
  const { selectedMonth } = useUIStore()
  const { data: report } = useMonthlyReport(selectedMonth)
  const { data: timeline } = useInstallmentTimeline(6)

  const reportData = report as {
    totalIncome: number
    totalSpent: number
    byCategory: Array<{ categoryId: string; name: string; amount: number; percent: number }>
    byUtility: { essential: number; nonEssential: number; investment: number }
  } | undefined

  const timelineData = timeline as Array<{
    month: string
    totalInstallments: number
  }> | undefined

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground text-sm mt-1 capitalize">{formatMonth(selectedMonth)}</p>
      </div>

      {reportData && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Renda', value: reportData.totalIncome, color: '' },
              { label: 'Total gasto', value: reportData.totalSpent, color: 'text-destructive' },
              { label: 'Essencial', value: reportData.byUtility.essential, color: 'text-orange-500' },
              { label: 'Não essencial', value: reportData.byUtility.nonEssential, color: 'text-purple-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-lg border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-xl font-bold mt-1 ${color}`}>{formatBRL(value)}</p>
              </div>
            ))}
          </div>

          {reportData.byCategory.length > 0 && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="rounded-lg border border-border bg-card p-5">
                <h2 className="font-semibold text-sm mb-4">Por categoria</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={reportData.byCategory} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                      {reportData.byCategory.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-lg border border-border bg-card p-5">
                <h2 className="font-semibold text-sm mb-4">Detalhamento</h2>
                <div className="space-y-2">
                  {reportData.byCategory.map((cat, i) => (
                    <div key={cat.categoryId} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span>{cat.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground text-xs">{cat.percent}%</span>
                        <span className="font-medium">{formatBRL(cat.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {timelineData && timelineData.some((m) => m.totalInstallments > 0) && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="font-semibold text-sm mb-4">Timeline de parcelas (próximos 6 meses)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={timelineData}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
              <Tooltip formatter={(v: number) => formatBRL(v)} />
              <Bar dataKey="totalInstallments" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
