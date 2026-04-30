'use client'
import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { formatBRL } from '@/lib/utils'
import { useDeleteGoal, useDepositGoal, usePauseGoal, useResumeGoal } from '@/hooks/useGoals'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, Pause, Play, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react'
import type { Goal, GoalMode } from '@moneyflow/shared'

const priorityVariant: Record<string, 'danger' | 'warning' | 'muted'> = {
  HIGH: 'danger',
  MEDIUM: 'warning',
  LOW: 'muted',
}
const priorityLabel: Record<string, string> = { HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' }

const modeConfig: Record<GoalMode, { label: string; color: string }> = {
  FREE_SAVING:            { label: 'Poupança livre',        color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  FIXED_APORTE_TARGET:    { label: 'Meta com aporte fixo',  color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  DEADLINE_TARGET:        { label: 'Meta com prazo',        color: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  FIXED_APORTE_DEADLINE:  { label: 'Compromisso por prazo', color: 'bg-violet-500/10 text-violet-500 border-violet-500/20' },
}

function contextualInfo(goal: Goal): string {
  switch (goal.goalMode) {
    case 'DEADLINE_TARGET':
      return `${goal.monthsRemaining ?? 0} meses restantes · ${formatBRL(goal.monthlyAporte)}/mês necessário`
    case 'FIXED_APORTE_TARGET':
      return goal.estimatedDeadline
        ? `Prazo estimado: ${formatMonth(goal.estimatedDeadline)} (${monthsUntil(goal.estimatedDeadline)} meses)`
        : `Aporte fixo: ${formatBRL(goal.monthlyAporte)}/mês`
    case 'FIXED_APORTE_DEADLINE':
      return goal.projectedTotal != null
        ? `Você terá ~${formatBRL(goal.projectedTotal)} no prazo`
        : `Aporte fixo: ${formatBRL(goal.monthlyAporte)}/mês`
    case 'FREE_SAVING':
      return `Acumulando ${formatBRL(goal.monthlyAporte)}/mês · Sem prazo definido`
  }
}

function formatMonth(m: string) {
  try { return format(new Date(m + '-01'), 'MMM/yyyy', { locale: ptBR }) } catch { return m }
}

function monthsUntil(m: string): number {
  try {
    const d = new Date(m + '-01')
    const diff = (d.getFullYear() - new Date().getFullYear()) * 12 + (d.getMonth() - new Date().getMonth())
    return Math.max(0, diff)
  } catch { return 0 }
}

export function GoalCard({ goal }: { goal: Goal }) {
  const deleteGoal = useDeleteGoal()
  const deposit = useDepositGoal()
  const pause = usePauseGoal()
  const resume = useResumeGoal()

  const [customValue, setCustomValue] = useState('')
  const [showCustom, setShowCustom] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const mode = modeConfig[goal.goalMode] ?? modeConfig.FREE_SAVING
  const progressPercent = goal.progressPercent != null ? Math.min(100, goal.progressPercent) : null
  const monthPercent = goal.monthlyAporte > 0
    ? Math.min(100, (goal.depositedThisMonth / goal.monthlyAporte) * 100)
    : 0
  const isPaused = goal.status === 'PAUSED'
  const isCompleted = goal.status === 'COMPLETED'

  const currentMonthLabel = format(new Date(), 'MMMM/yyyy', { locale: ptBR })
  currentMonthLabel.charAt(0).toUpperCase()

  function handleQuickDeposit() {
    if (goal.remainingThisMonth > 0) {
      deposit.mutate({ id: goal.id, amount: goal.remainingThisMonth })
    }
  }

  function handleCustomDeposit() {
    const v = parseFloat(customValue)
    if (v > 0) {
      deposit.mutate({ id: goal.id, amount: v }, { onSuccess: () => { setCustomValue(''); setShowCustom(false) } })
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${mode.color}`}>
              {mode.label}
            </span>
            {isPaused && <span className="text-xs text-muted-foreground">(pausado)</span>}
            {isCompleted && <span className="text-xs text-emerald-500 font-medium">Concluído</span>}
          </div>
          <p className="font-medium truncate">{goal.name}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{contextualInfo(goal)}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant={priorityVariant[goal.priority]}>{priorityLabel[goal.priority]}</Badge>
          {!isCompleted && (
            <Button
              variant="ghost" size="sm"
              onClick={() => isPaused ? resume.mutate(goal.id) : pause.mutate(goal.id)}
              disabled={pause.isPending || resume.isPending}
              title={isPaused ? 'Retomar' : 'Pausar'}
            >
              {isPaused ? <Play size={13} className="text-muted-foreground" /> : <Pause size={13} className="text-muted-foreground" />}
            </Button>
          )}
          <Button
            variant="ghost" size="sm"
            onClick={() => deleteGoal.mutate(goal.id)}
            disabled={deleteGoal.isPending}
          >
            <Trash2 size={13} className="text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Overall progress (only when targetAmount exists) */}
      {progressPercent != null && goal.targetAmount != null && (
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>{formatBRL(goal.savedAmount)}</span>
            <span>{formatBRL(goal.targetAmount)}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
          </div>
          <p className="text-xs text-muted-foreground mt-1 text-right">{progressPercent.toFixed(1)}%</p>
        </div>
      )}

      {/* FREE_SAVING total */}
      {goal.goalMode === 'FREE_SAVING' && goal.savedAmount > 0 && (
        <p className="text-sm font-medium text-emerald-500">Total guardado: {formatBRL(goal.savedAmount)}</p>
      )}

      {/* Monthly aporte progress */}
      {!isCompleted && !isPaused && goal.monthlyAporte > 0 && (
        <div className="rounded-md bg-muted/40 px-3 py-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium capitalize">{currentMonthLabel}</p>
            <p className="text-xs text-muted-foreground">Esperado: {formatBRL(goal.monthlyAporte)}</p>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${monthPercent >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${Math.min(100, monthPercent)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{formatBRL(goal.depositedThisMonth)} ({monthPercent.toFixed(0)}%)</span>
            {goal.remainingThisMonth > 0 ? (
              <span className="text-muted-foreground">Faltam {formatBRL(goal.remainingThisMonth)}</span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-500 font-medium">
                <CheckCircle2 size={11} /> Mês concluído
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      {!isCompleted && !isPaused && (
        <div className="flex flex-wrap gap-2">
          {goal.remainingThisMonth > 0 && (
            <Button
              size="sm"
              onClick={handleQuickDeposit}
              disabled={deposit.isPending}
            >
              Aportar {formatBRL(goal.remainingThisMonth)}
            </Button>
          )}
          <Button
            variant="outline" size="sm"
            onClick={() => setShowCustom(!showCustom)}
          >
            {showCustom ? 'Cancelar' : 'Outro valor'}
          </Button>
          <Button
            variant="ghost" size="sm"
            className="text-xs text-muted-foreground"
            onClick={() => setShowHistory(!showHistory)}
          >
            Histórico {showHistory ? <ChevronUp size={12} className="ml-1" /> : <ChevronDown size={12} className="ml-1" />}
          </Button>
        </div>
      )}

      {/* Custom deposit input */}
      {showCustom && (
        <div className="flex gap-2">
          <input
            type="number"
            step="0.01"
            placeholder="Valor (R$)"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            className="flex-1 border border-border rounded-md px-3 py-1.5 text-sm"
          />
          <Button size="sm" onClick={handleCustomDeposit} disabled={deposit.isPending}>
            Confirmar
          </Button>
        </div>
      )}

      {/* Deposit history */}
      {showHistory && goal.depositHistory.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">Histórico (últimos 6 meses)</p>
          <div className="rounded-md border border-border divide-y divide-border">
            {goal.depositHistory.map((h) => (
              <div key={h.month} className="flex items-center justify-between px-3 py-1.5 text-xs">
                <span className="text-muted-foreground">{formatMonth(h.month)}</span>
                <div className="flex items-center gap-3">
                  <span className="text-muted-foreground">Esperado {formatBRL(h.expected)}</span>
                  <span className={h.deposited >= h.expected && h.expected > 0 ? 'text-emerald-500 font-medium' : h.deposited > 0 ? 'text-primary' : 'text-muted-foreground'}>
                    {h.deposited > 0 ? formatBRL(h.deposited) : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
