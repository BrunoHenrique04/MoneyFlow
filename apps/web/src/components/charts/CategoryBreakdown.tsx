'use client'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid,
} from 'recharts'
import { formatBRL } from '@/lib/utils'
import { CHART_GREENS } from '@/lib/chartColors'

interface CategoryData {
  categoryId: string
  name: string
  color: string
  amount: number
  percent: number
}

interface CategoryBreakdownProps {
  data: CategoryData[]
  mode: 'radar' | 'bar'
  totalSpent: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function BarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  const d: CategoryData = payload[0].payload
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm animate-fade-in">
      <p className="font-semibold">{d.name}</p>
      <p className="text-muted-foreground">{formatBRL(d.amount)} · {d.percent}%</p>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function RadarTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-card border border-border rounded-xl px-3 py-2 shadow-lg text-sm animate-fade-in">
      <p className="font-semibold">{payload[0].subject}</p>
      <p className="text-muted-foreground">{formatBRL(payload[0].value)}</p>
    </div>
  )
}

export function CategoryBreakdown({ data, mode, totalSpent }: CategoryBreakdownProps) {
  if (data.length === 0) {
    return <p className="text-muted-foreground text-sm text-center py-12">Sem categorias neste mês.</p>
  }

  const sorted = [...data].sort((a, b) => b.amount - a.amount)

  if (mode === 'radar') {
    const radarData = sorted.slice(0, 8).map((c) => ({ subject: c.name, value: c.amount }))
    return (
      <div className="space-y-4">
        <ResponsiveContainer width="100%" height={300}>
          <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
            <Radar
              name="Gasto"
              dataKey="value"
              stroke="#166534"
              fill="#166534"
              fillOpacity={0.35}
              animationDuration={900}
            />
            <Tooltip content={<RadarTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
        <CategoryList data={sorted} totalSpent={totalSpent} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={sorted} barSize={32} margin={{ left: 0, right: 12, top: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 9) + '…' : v}
          />
          <YAxis
            tickFormatter={(v) => `R$${(v / 1000).toFixed(1)}k`}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            axisLine={false}
            tickLine={false}
            width={44}
          />
          <Tooltip content={<BarTooltip />} cursor={{ fill: 'hsl(var(--muted))', radius: 6 }} />
          <Bar dataKey="amount" radius={[6, 6, 0, 0]} isAnimationActive animationDuration={800} animationEasing="ease-out">
            {sorted.map((c, i) => (
              <Cell key={c.categoryId} fill={CHART_GREENS[i % CHART_GREENS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <CategoryList data={sorted} totalSpent={totalSpent} />
    </div>
  )
}

function CategoryList({ data, totalSpent }: { data: CategoryData[]; totalSpent: number }) {
  return (
    <div className="space-y-2">
      {data.map((c, i) => (
        <div key={c.categoryId} className="flex items-center gap-3 animate-slide-up" style={{ animationDelay: `${i * 0.04}s` }}>
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: CHART_GREENS[i % CHART_GREENS.length] }} />
          <span className="text-sm flex-1 truncate">{c.name}</span>
          <div className="w-28 h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${c.percent}%`, backgroundColor: CHART_GREENS[i % CHART_GREENS.length] }}
            />
          </div>
          <span className="text-xs text-muted-foreground w-10 text-right tabular-nums">{c.percent}%</span>
          <span className="text-sm font-medium tabular-nums w-24 text-right">{formatBRL(c.amount)}</span>
        </div>
      ))}
      <div className="flex justify-between pt-2 border-t border-border text-sm font-bold">
        <span>Total</span>
        <span>{formatBRL(totalSpent)}</span>
      </div>
    </div>
  )
}
