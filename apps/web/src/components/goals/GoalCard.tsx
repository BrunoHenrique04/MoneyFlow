'use client'
import { formatBRL } from '@/lib/utils'
import { useDeleteGoal, useDepositGoal } from '@/hooks/useGoals'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import type { Goal } from '@moneyflow/shared'

const priorityVariant: Record<string, 'danger' | 'warning' | 'muted'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'muted',
}

const priorityLabel: Record<string, string> = {
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
}

export function GoalCard({ goal }: { goal: Goal }) {
  const deleteGoal = useDeleteGoal()
  const deposit = useDepositGoal()
  const percent = Math.min(100, goal.progressPercent)

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{goal.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {goal.monthsRemaining} meses restantes · {formatBRL(goal.monthlyAporte)}/mês
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={priorityVariant[goal.priority]}>{priorityLabel[goal.priority]}</Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => deleteGoal.mutate(goal.id)}
            disabled={deleteGoal.isPending}
          >
            <Trash2 size={14} className="text-muted-foreground" />
          </Button>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>{formatBRL(goal.savedAmount)}</span>
          <span>{formatBRL(goal.targetAmount)}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1 text-right">{percent.toFixed(1)}%</p>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => {
          const amount = parseFloat(prompt('Valor do aporte (R$):') ?? '0')
          if (amount > 0) deposit.mutate({ id: goal.id, amount })
        }}
        disabled={deposit.isPending}
      >
        Registrar aporte
      </Button>
    </div>
  )
}
