'use client'
import { useRecommendation, useUser } from '@/hooks/useReports'
import { Card, CardTitle, CardValue } from '@/components/ui/card'
import { formatBRL } from '@/lib/utils'
import { AlertTriangle, Lightbulb } from 'lucide-react'

interface RecData {
  essentialBudget: number
  investmentBudget: number
  freeBudget: number
  alerts: string[]
  suggestions: string[]
}

export function BudgetOverview() {
  const { data: rec } = useRecommendation()
  const { data: user } = useUser()

  if (!rec || !user) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <div className="h-4 bg-muted rounded w-24 mb-2" />
            <div className="h-7 bg-muted rounded w-32" />
          </Card>
        ))}
      </div>
    )
  }

  const recData = rec as RecData
  const userData = user as { monthlyIncome: number }
  const income = userData.monthlyIncome
  const committed = recData.essentialBudget + recData.investmentBudget
  const commitPct = income > 0 ? Math.round((committed / income) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Main cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardTitle>Renda</CardTitle>
          <CardValue className="text-foreground">{formatBRL(income)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Comprometido</CardTitle>
          <CardValue className="text-orange-500">{formatBRL(committed)}</CardValue>
          {income > 0 && (
            <p className="text-xs text-muted-foreground mt-1">{commitPct}% da renda</p>
          )}
        </Card>
        <Card>
          <CardTitle>Metas</CardTitle>
          <CardValue className="text-blue-500">{formatBRL(recData.investmentBudget)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Orçamento Livre</CardTitle>
          <CardValue className={recData.freeBudget < 0 ? 'text-destructive' : 'text-green-500'}>
            {formatBRL(recData.freeBudget)}
          </CardValue>
          {income > 0 && recData.freeBudget >= 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              {Math.round((recData.freeBudget / income) * 100)}% da renda
            </p>
          )}
        </Card>
      </div>

      {/* Progress bar */}
      {income > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Distribuição da renda</span>
            <span>{formatBRL(income)}</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
            <div
              className="bg-orange-400 transition-all"
              style={{ width: `${Math.min(100, income > 0 ? (recData.essentialBudget / income) * 100 : 0)}%` }}
              title="Essencial"
            />
            <div
              className="bg-blue-400 transition-all"
              style={{ width: `${Math.min(100, income > 0 ? (recData.investmentBudget / income) * 100 : 0)}%` }}
              title="Metas"
            />
            <div
              className="bg-green-400 transition-all"
              style={{ width: `${Math.min(100, income > 0 ? (recData.freeBudget / income) * 100 : 0)}%` }}
              title="Livre"
            />
          </div>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />Essencial</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />Metas</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />Livre</span>
          </div>
        </div>
      )}

      {/* Alerts */}
      {recData.alerts.length > 0 && (
        <div className="space-y-2">
          {recData.alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm dark:bg-yellow-950 dark:border-yellow-800 dark:text-yellow-300">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {alert}
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {recData.suggestions?.length > 0 && (
        <div className="space-y-2">
          {recData.suggestions.map((s, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
              <Lightbulb size={16} className="mt-0.5 shrink-0" />
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
