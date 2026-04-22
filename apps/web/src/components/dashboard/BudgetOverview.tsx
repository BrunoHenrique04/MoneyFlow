'use client'
import { useRecommendation } from '@/hooks/useReports'
import { useUser } from '@/hooks/useReports'
import { Card, CardTitle, CardValue } from '@/components/ui/card'
import { formatBRL } from '@/lib/utils'
import { AlertTriangle } from 'lucide-react'

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

  const recData = rec as {
    essentialBudget: number
    investmentBudget: number
    freeBudget: number
    alerts: string[]
  }
  const userData = user as { monthlyIncome: number }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardTitle>Renda</CardTitle>
          <CardValue className="text-foreground">{formatBRL(userData.monthlyIncome)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Essencial</CardTitle>
          <CardValue className="text-orange-500">{formatBRL(recData.essentialBudget)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Investimento</CardTitle>
          <CardValue className="text-blue-500">{formatBRL(recData.investmentBudget)}</CardValue>
        </Card>
        <Card>
          <CardTitle>Orçamento Livre</CardTitle>
          <CardValue className={recData.freeBudget < 0 ? 'text-destructive' : 'text-green-500'}>
            {formatBRL(recData.freeBudget)}
          </CardValue>
        </Card>
      </div>
      {recData.alerts.length > 0 && (
        <div className="space-y-2">
          {recData.alerts.map((alert, i) => (
            <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              {alert}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
