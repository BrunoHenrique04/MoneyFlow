'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatBRL } from '@/lib/utils'
import { CHART_GREENS } from '@/lib/chartColors'

interface TxItem {
  id: string
  description: string
  amount: number
  type: string
  utilityTag: string
  categoryName: string
  categoryColor: string
  categoryType: string
}

interface ExpenseItemsProps {
  transactions: TxItem[]
  mode: 'bars' | 'list'
}

const TYPE_LABEL: Record<string, string> = {
  SINGLE:      'Avulso',
  INSTALLMENT: 'Parcela',
  RECURRING:   'Fixo',
  INCOME:      'Renda',
}

const UTIL_COLORS: Record<string, string> = {
  ESSENTIAL:     '#15803d',
  NON_ESSENTIAL: '#22c55e',
  INVESTMENT:    '#059669',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d: TxItem = payload[0].payload
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm max-w-56 animate-fade-in">
      <p className="font-semibold text-foreground truncate">{d.description}</p>
      <p className="text-muted-foreground text-xs">{d.categoryName} · {TYPE_LABEL[d.type] ?? d.type}</p>
      <p className="font-bold mt-1">{formatBRL(d.amount)}</p>
    </div>
  )
}

export function ExpenseItems({ transactions, mode }: ExpenseItemsProps) {
  const sorted = [...transactions]
    .filter((t) => t.type !== 'INCOME')
    .sort((a, b) => b.amount - a.amount)

  if (sorted.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-12">Nenhum lançamento neste mês.</p>
  }

  if (mode === 'list') {
    const maxAmt = sorted[0].amount
    return (
      <div className="space-y-2">
        {sorted.map((t, i) => (
          <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
            <span className="text-xs text-muted-foreground w-5 shrink-0 tabular-nums">{i + 1}</span>
            <div
              className="w-1.5 h-8 rounded-full shrink-0"
              style={{ backgroundColor: UTIL_COLORS[t.utilityTag] ?? CHART_GREENS[i % CHART_GREENS.length] }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{t.description}</p>
              <p className="text-xs text-muted-foreground">{t.categoryName} · {TYPE_LABEL[t.type] ?? t.type}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-bold tabular-nums">{formatBRL(t.amount)}</p>
              <div className="h-1.5 w-24 bg-muted rounded-full mt-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(t.amount / maxAmt) * 100}%`,
                    backgroundColor: UTIL_COLORS[t.utilityTag] ?? CHART_GREENS[i % CHART_GREENS.length],
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const chartData = sorted.slice(0, 20)

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 36)}>
      <BarChart data={chartData} layout="vertical" barSize={18} margin={{ left: 12, right: 60, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="description"
          width={130}
          tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => v.length > 18 ? v.slice(0, 17) + '…' : v}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', radius: 6 }} />
        <Bar dataKey="amount" radius={[0, 6, 6, 0]} isAnimationActive animationDuration={800} animationEasing="ease-out">
          {chartData.map((t, i) => (
            <Cell key={t.id} fill={UTIL_COLORS[t.utilityTag] ?? CHART_GREENS[i % CHART_GREENS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
