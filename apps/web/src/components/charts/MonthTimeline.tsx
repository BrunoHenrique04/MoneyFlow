'use client'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ReferenceLine,
  Cell, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { formatBRL } from '@/lib/utils'
import { commitRatioColor, commitRatioLabel, BUDGET_COLORS, BUDGET_LABELS } from '@/lib/chartColors'

const LAYER_ORDER = ['fixedExpenses', 'installments', 'essentialExpenses', 'goalAporte', 'nonEssential'] as const

interface MonthData {
  month: string
  isFuture: boolean
  isCurrent: boolean
  income: number
  fixedExpenses: number
  installments: number
  essentialExpenses: number
  goalAporte: number
  nonEssential: number
  freeBudget: number
  totalCommitted: number
  commitRatio: number
}

interface MonthTimelineProps {
  data: MonthData[]
  stacked?: boolean
}

function shortMonth(m: string) {
  const [y, mo] = m.split('-').map(Number)
  return new Date(y, mo - 1, 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const d: MonthData = payload[0]?.payload
  return (
    <div className="bg-card border border-border rounded-2xl p-4 shadow-xl text-sm min-w-52 animate-fade-in">
      <p className="font-bold mb-2 capitalize">
        {new Date(d.month + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
        {d.isCurrent && <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">Atual</span>}
        {d.isFuture && <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Projeção</span>}
      </p>
      <div className="space-y-1.5">
        {[
          ['fixedExpenses', d.fixedExpenses],
          ['installments', d.installments],
          ['essentialExpenses', d.essentialExpenses],
          ['goalAporte', d.goalAporte],
          ['nonEssential', d.nonEssential],
        ].filter(([, v]) => (v as number) > 0).map(([k, v]) => (
          <div key={k as string} className="flex items-center justify-between gap-6">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: BUDGET_COLORS[k as string] }} />
              <span className="text-muted-foreground text-xs">{BUDGET_LABELS[k as string]}</span>
            </div>
            <span className="font-medium tabular-nums text-xs">{formatBRL(v as number)}</span>
          </div>
        ))}
        <div className="border-t border-border pt-1.5 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Comprometido</span>
          <span className="font-bold text-xs">{d.commitRatio.toFixed(0)}% — {commitRatioLabel(d.commitRatio)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Renda</span>
          <span className="text-xs font-medium tabular-nums">{formatBRL(d.income)}</span>
        </div>
      </div>
    </div>
  )
  void label
}

const LAYERS = LAYER_ORDER

export function MonthTimeline({ data, stacked = true }: MonthTimelineProps) {
  if (!data.length) return <p className="text-muted-foreground text-sm text-center py-12">Sem dados.</p>

  const maxIncome = Math.max(...data.map((d) => d.income))

  return (
    <div className="space-y-6">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} barSize={stacked ? 28 : 14} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={shortMonth}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', radius: 8 }} />
          {maxIncome > 0 && (
            <ReferenceLine
              y={maxIncome}
              stroke="#22c55e"
              strokeDasharray="6 3"
              strokeWidth={1.5}
              label={{ value: 'Renda', position: 'right', fontSize: 10, fill: '#22c55e' }}
            />
          )}

          {stacked ? (
            LAYERS.map((key) => (
              <Bar key={key} dataKey={key} stackId="a" fill={BUDGET_COLORS[key]} radius={key === 'nonEssential' ? [4, 4, 0, 0] : [0, 0, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-out">
                {data.map((_, i) => (
                  <Cell key={i} fill={BUDGET_COLORS[key]} opacity={data[i].isFuture ? 0.5 : 1} />
                ))}
              </Bar>
            ))
          ) : (
            <Bar dataKey="totalCommitted" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-out">
              {data.map((d, i) => (
                <Cell key={i} fill={commitRatioColor(d.commitRatio)} opacity={d.isFuture ? 0.55 : 1} />
              ))}
            </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* legend */}
      <div className="flex flex-wrap gap-3 justify-center">
        {stacked ? (
          LAYERS.map((k) => (
            <div key={k} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: BUDGET_COLORS[k] }} />
              {BUDGET_LABELS[k]}
            </div>
          ))
        ) : (
          [0, 35, 50, 65, 80, 95].map((threshold) => (
            <div key={threshold} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: commitRatioColor(threshold) }} />
              {commitRatioLabel(threshold)}
            </div>
          ))
        )}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block w-5 border-t-2 border-dashed border-green-500" />
          Renda
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-muted opacity-50" />
          Projeção
        </div>
      </div>

      {/* Future months preview — stacked mode only */}
      {stacked && (() => {
        const futureMonths = data.filter((d) => d.isFuture)
        if (!futureMonths.length) return null
        return (
          <div className="border-t border-border pt-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Previsão meses futuros</p>
            {futureMonths.map((d) => {
              const label = new Date(d.month + '-02').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
              const ratio = d.income > 0 ? (d.totalCommitted / d.income) * 100 : 0
              return (
                <div key={d.month} className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium capitalize">{label}</span>
                    <span className="text-xs font-bold" style={{ color: commitRatioColor(ratio) }}>
                      {ratio.toFixed(0)}% — {commitRatioLabel(ratio)}
                    </span>
                  </div>
                  {/* stacked mini bar */}
                  <div className="flex h-2.5 rounded-full overflow-hidden gap-px">
                    {LAYERS.map((key) => {
                      const val = d[key as keyof MonthData] as number
                      const w = d.income > 0 ? (val / d.income) * 100 : 0
                      return w > 0 ? (
                        <div key={key} title={BUDGET_LABELS[key]} style={{ width: `${w}%`, backgroundColor: BUDGET_COLORS[key] }} />
                      ) : null
                    })}
                  </div>
                  {/* layer values */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                    {LAYERS.filter((k) => (d[k as keyof MonthData] as number) > 0).map((k) => (
                      <div key={k} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: BUDGET_COLORS[k] }} />
                          {BUDGET_LABELS[k]}
                        </span>
                        <span className="tabular-nums font-medium">{formatBRL(d[k as keyof MonthData] as number)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}
