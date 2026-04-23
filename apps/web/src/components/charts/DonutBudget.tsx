'use client'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { formatBRL } from '@/lib/utils'
import { BUDGET_COLORS, BUDGET_LABELS } from '@/lib/chartColors'

interface DonutBudgetProps {
  income: number
  fixedExpenses: number
  installments: number
  essentialExpenses: number
  goalAporte: number
  nonEssential: number
  freeBudget: number
  singleExpenses?: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-foreground">{name}</p>
      <p className="text-muted-foreground">{formatBRL(value)}</p>
    </div>
  )
}

export function DonutBudget({ income, fixedExpenses, installments, essentialExpenses, goalAporte, nonEssential, freeBudget, singleExpenses }: DonutBudgetProps) {
  const segments = [
    { key: 'fixedExpenses',     value: fixedExpenses     },
    { key: 'installments',      value: installments      },
    { key: 'essentialExpenses', value: essentialExpenses },
    { key: 'goalAporte',        value: goalAporte        },
    { key: 'nonEssential',      value: nonEssential      },
    { key: 'singleExpenses',    value: singleExpenses ?? 0 },
    { key: 'freeBudget',        value: Math.max(0, freeBudget) },
  ].filter((s) => s.value > 0).map((s) => ({
    name: BUDGET_LABELS[s.key],
    value: s.value,
    color: BUDGET_COLORS[s.key],
  }))

  const totalSpent = fixedExpenses + installments + essentialExpenses + goalAporte + nonEssential
  const pct = income > 0 ? Math.round((totalSpent / income) * 100) : 0

  if (segments.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-12">Sem dados para este mês.</p>
  }

  return (
    <div className="space-y-6">
      <div className="relative">
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={segments}
              cx="50%"
              cy="50%"
              innerRadius={88}
              outerRadius={124}
              paddingAngle={2}
              dataKey="value"
              animationBegin={80}
              animationDuration={900}
              animationEasing="ease-out"
            >
              {segments.map((s, i) => (
                <Cell key={i} fill={s.color} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
              iconType="circle"
              iconSize={10}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
          <span className="text-3xl font-bold text-foreground">{pct}%</span>
          <span className="text-xs text-muted-foreground">comprometido</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {segments.map((s) => (
          <div key={s.name} className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/60">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-muted-foreground">{s.name}</span>
            </div>
            <span className="text-xs font-semibold tabular-nums">{formatBRL(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
