'use client'
import { RadialBarChart, RadialBar, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { formatBRL } from '@/lib/utils'
import { CHART_GREENS } from '@/lib/chartColors'

interface Goal {
  id: string
  name: string
  targetAmount: number
  savedAmount: number
  progressPercent: number
  monthsRemaining: number
  monthlyAporte: number
  priority: string
}

interface GoalProgressProps {
  goals: Goal[]
}

const PRIORITY_LABEL: Record<string, string> = { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const g: Goal = payload[0].payload
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm animate-fade-in">
      <p className="font-semibold">{g.name}</p>
      <p className="text-muted-foreground">{formatBRL(g.savedAmount)} / {formatBRL(g.targetAmount)}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{g.progressPercent}% · {g.monthsRemaining} meses restantes</p>
    </div>
  )
}

export function GoalProgress({ goals }: GoalProgressProps) {
  const active = goals.filter((g) => g.progressPercent < 100)

  if (active.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-3xl mb-2">🎉</p>
        <p className="text-muted-foreground text-sm">Todas as metas foram concluídas!</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ResponsiveContainer width="100%" height={280}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="20%"
          outerRadius="90%"
          data={active.map((g, i) => ({ ...g, fill: CHART_GREENS[i % CHART_GREENS.length] }))}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            dataKey="progressPercent"
            cornerRadius={8}
            background={{ fill: 'hsl(var(--muted))' }}
            isAnimationActive
            animationDuration={1000}
            animationEasing="ease-out"
          >
            {active.map((_, i) => (
              <Cell key={i} fill={CHART_GREENS[i % CHART_GREENS.length]} />
            ))}
          </RadialBar>
          <Tooltip content={<CustomTooltip />} />
        </RadialBarChart>
      </ResponsiveContainer>

      <div className="space-y-3">
        {active.map((g, i) => (
          <div key={g.id} className="p-4 rounded-2xl bg-card border border-border space-y-2 animate-slide-up" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">{g.name}</p>
                <p className="text-xs text-muted-foreground">Prioridade: {PRIORITY_LABEL[g.priority] ?? g.priority} · {g.monthsRemaining} meses restantes</p>
              </div>
              <span className="text-lg font-bold" style={{ color: CHART_GREENS[i % CHART_GREENS.length] }}>
                {g.progressPercent}%
              </span>
            </div>
            <div className="h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{ width: `${g.progressPercent}%`, backgroundColor: CHART_GREENS[i % CHART_GREENS.length] }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>{formatBRL(g.savedAmount)} poupado</span>
              <span>Meta: {formatBRL(g.targetAmount)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Aporte mensal necessário: <strong>{formatBRL(g.monthlyAporte)}</strong></p>
          </div>
        ))}
      </div>
    </div>
  )
}
