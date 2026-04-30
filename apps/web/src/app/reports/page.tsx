'use client'
import { useState } from 'react'
import { PieChart, BarChart3, List, Tag, Target, TrendingUp, LayoutGrid, X } from 'lucide-react'
import { useMonthlyReport, useBudgetTimeline } from '@/hooks/useReports'
import { useGoals } from '@/hooks/useGoals'
import { useUIStore } from '@/store/ui.store'
import { formatBRL, formatMonth } from '@/lib/utils'
import { DonutBudget } from '@/components/charts/DonutBudget'
import { MonthTimeline } from '@/components/charts/MonthTimeline'
import { ExpenseItems } from '@/components/charts/ExpenseItems'
import { CategoryBreakdown } from '@/components/charts/CategoryBreakdown'
import { GoalProgress } from '@/components/charts/GoalProgress'

type PresetId = 'donut' | 'timeline-stacked' | 'timeline-locked' | 'items-list' | 'items-bars' | 'category-bar' | 'category-radar' | 'goals'

interface Preset {
  id: PresetId
  label: string
  description: string
  icon: React.ElementType
  group: string
}

const PRESETS: Preset[] = [
  { id: 'donut',           label: 'Distribuição',      description: 'Pizza do orçamento do mês',            icon: PieChart,    group: 'Mensal'    },
  { id: 'items-list',      label: 'Por item (lista)',   description: 'Cada gasto com barra de proporção',    icon: List,        group: 'Mensal'    },
  { id: 'items-bars',      label: 'Por item (gráfico)', description: 'Barras horizontais por transação',     icon: LayoutGrid,  group: 'Mensal'    },
  { id: 'category-bar',    label: 'Categorias (barras)', description: 'Comparativo de categorias em barras', icon: BarChart3,   group: 'Mensal'    },
  { id: 'category-radar',  label: 'Categorias (radar)', description: 'Radar de categorias',                 icon: Tag,         group: 'Mensal'    },
  { id: 'timeline-stacked','label': 'Comprometimento (camadas)', description: 'Camadas de orçamento mês a mês', icon: BarChart3,   group: 'Histórico' },
  { id: 'timeline-locked', label: 'Meses travados',    description: 'Ver quando meses ficam lotados',       icon: TrendingUp,  group: 'Histórico' },
  { id: 'goals',           label: 'Metas',             description: 'Progresso de cada objetivo',           icon: Target,      group: 'Objetivos' },
]

const GROUPS = ['Mensal', 'Histórico', 'Objetivos']

interface CategoryData {
  categoryId: string
  name: string
  color: string
  amount: number
  percent: number
}

interface ReportTx {
  id: string
  description: string
  amount: number
  type: string
  utilityTag: string
  categoryName: string
  categoryColor: string
  categoryType: string
  categoryId?: string
  dueDate?: string
}

interface ReportData {
  totalIncome: number
  totalSpent: number
  byCategory: CategoryData[]
  byUtility: { essential: number; nonEssential: number; investment: number }
  transactions: ReportTx[]
}

interface TimelineMonth {
  month: string; isFuture: boolean; isCurrent: boolean
  income: number; fixedExpenses: number; installments: number
  essentialExpenses: number; goalAporte: number; nonEssential: number
  freeBudget: number; totalCommitted: number; commitRatio: number
}

export default function ReportsPage() {
  const { selectedMonth } = useUIStore()
  const [preset, setPreset] = useState<PresetId>('donut')
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null)

  const { data: reportRaw, isLoading: reportLoading } = useMonthlyReport(selectedMonth)
  const { data: timelineRaw, isLoading: timelineLoading } = useBudgetTimeline(9, 3)
  const { data: goalsRaw, isLoading: goalsLoading } = useGoals('ACTIVE')

  const report = reportRaw as ReportData | undefined
  const timeline = (timelineRaw as TimelineMonth[] | undefined) ?? []

  const currentMonthData = timeline.find((m) => m.isCurrent)

  const PERSISTENT_TYPES = ['INSTALLMENT', 'FIXED']
  const singleExpenses = (report?.transactions ?? [])
    .filter((t) => !PERSISTENT_TYPES.includes(t.type) && t.type !== 'INCOME')
    .reduce((s, t) => s + t.amount, 0)

  // Transactions for the selected category
  const categoryTransactions = selectedCategory
    ? (report?.transactions ?? []).filter((t) => t.categoryName === selectedCategory.name && t.type !== 'INCOME')
    : []

  const isCategoryPreset = preset === 'category-bar' || preset === 'category-radar'

  function handlePresetChange(id: PresetId) {
    setPreset(id)
    setSelectedCategory(null)
  }

  function renderChart() {
    if (preset === 'donut') {
      if (reportLoading) return <ChartSkeleton />
      if (!report) return <Empty />
      const layers = currentMonthData ?? {
        fixedExpenses: 0, installments: 0, essentialExpenses: 0,
        goalAporte: 0, nonEssential: 0, freeBudget: 0,
      }
      return (
        <DonutBudget
          income={report.totalIncome}
          fixedExpenses={layers.fixedExpenses}
          installments={layers.installments}
          essentialExpenses={layers.essentialExpenses}
          goalAporte={layers.goalAporte}
          nonEssential={layers.nonEssential}
          freeBudget={layers.freeBudget}
          singleExpenses={singleExpenses}
        />
      )
    }

    if (preset === 'items-list' || preset === 'items-bars') {
      if (reportLoading) return <ChartSkeleton />
      if (!report) return <Empty />
      return <ExpenseItems transactions={report.transactions ?? []} mode={preset === 'items-list' ? 'list' : 'bars'} />
    }

    if (isCategoryPreset) {
      if (reportLoading) return <ChartSkeleton />
      if (!report) return <Empty />
      return (
        <CategoryBreakdown
          data={report.byCategory}
          mode={preset === 'category-bar' ? 'bar' : 'radar'}
          totalSpent={report.totalSpent}
          selectedCategoryId={selectedCategory?.categoryId}
          onCategorySelect={setSelectedCategory}
        />
      )
    }

    if (preset === 'timeline-stacked' || preset === 'timeline-locked') {
      if (timelineLoading) return <ChartSkeleton />
      return <MonthTimeline data={timeline} stacked={preset === 'timeline-stacked'} />
    }

    if (preset === 'goals') {
      if (goalsLoading) return <ChartSkeleton />
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return <GoalProgress goals={(goalsRaw as any[]) ?? []} />
    }

    return <Empty />
  }

  const activePreset = PRESETS.find((p) => p.id === preset)!
  const isMonthPreset = activePreset.group === 'Mensal'

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm mt-1 capitalize">{formatMonth(selectedMonth)}</p>
        </div>
        {isMonthPreset && report && (
          <div className="flex gap-3 text-right">
            <div className="rounded-xl border border-border bg-card px-4 py-2">
              <p className="text-xs text-muted-foreground">Renda</p>
              <p className="font-bold tabular-nums">{formatBRL(report.totalIncome)}</p>
            </div>
            <div className="rounded-xl border border-border bg-card px-4 py-2">
              <p className="text-xs text-muted-foreground">Gasto</p>
              <p className="font-bold text-destructive tabular-nums">{formatBRL(report.totalSpent)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Preset selector */}
      <div className="space-y-3">
        {GROUPS.map((group) => {
          const groupPresets = PRESETS.filter((p) => p.group === group)
          return (
            <div key={group}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{group}</p>
              <div className="flex flex-wrap gap-2">
                {groupPresets.map((p) => {
                  const Icon = p.icon
                  const active = preset === p.id
                  return (
                    <button
                      key={p.id}
                      onClick={() => handlePresetChange(p.id)}
                      className={[
                        'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-200',
                        active
                          ? 'bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]'
                          : 'bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground hover:bg-accent',
                      ].join(' ')}
                    >
                      <Icon size={14} />
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Chart panel */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-scale-in">
        <div className="flex items-center gap-2 mb-6">
          {(() => { const Icon = activePreset.icon; return <Icon size={16} className="text-primary" /> })()}
          <div>
            <h2 className="font-semibold text-sm">{activePreset.label}</h2>
            <p className="text-xs text-muted-foreground">{activePreset.description}</p>
          </div>
        </div>
        {renderChart()}
      </div>

      {/* Category detail panel — shown when a category is selected */}
      {isCategoryPreset && selectedCategory && (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedCategory.color || '#16a34a' }} />
              <h2 className="font-semibold">{selectedCategory.name}</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {selectedCategory.percent}% do total
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold tabular-nums">{formatBRL(selectedCategory.amount)}</span>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {categoryTransactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhuma transação encontrada nesta categoria.</p>
          ) : (
            <div className="space-y-2">
              {categoryTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground capitalize">{tx.type.toLowerCase()}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-destructive ml-4">
                    {formatBRL(tx.amount)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-2 text-sm font-bold">
                <span>Total ({categoryTransactions.length} transações)</span>
                <span className="tabular-nums">{formatBRL(selectedCategory.amount)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="space-y-4 animate-pulse py-4">
      <div className="h-64 bg-muted rounded-xl" />
      <div className="grid grid-cols-3 gap-3">
        {[...Array(6)].map((_, i) => <div key={i} className="h-8 bg-muted rounded-lg" />)}
      </div>
    </div>
  )
}

function Empty() {
  return <p className="text-center text-muted-foreground text-sm py-16">Sem dados para este período.</p>
}
