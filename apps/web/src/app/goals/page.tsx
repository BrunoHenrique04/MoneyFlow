'use client'
import { useState, useMemo } from 'react'
import { differenceInMonths, addMonths, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useGoals, useCreateGoal } from '@/hooks/useGoals'
import { GoalCard } from '@/components/goals/GoalCard'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { formatBRL } from '@/lib/utils'
import type { Goal, GoalMode } from '@moneyflow/shared'

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals('ACTIVE')
  const { data: paused } = useGoals('PAUSED')
  const create = useCreateGoal()
  const [showForm, setShowForm] = useState(false)

  const [name, setName] = useState('')
  const [targetAmount, setTargetAmount] = useState('')
  const [monthlyAporte, setMonthlyAporte] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [savedAmount, setSavedAmount] = useState('')
  const [priority, setPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM')

  const hasTarget = parseFloat(targetAmount) > 0
  const hasAporte = parseFloat(monthlyAporte) > 0
  const hasDate = targetDate.length > 0

  const goalMode: GoalMode | null =
    hasTarget && hasDate && !hasAporte ? 'DEADLINE_TARGET' :
    hasAporte && hasTarget && !hasDate ? 'FIXED_APORTE_TARGET' :
    hasAporte && hasDate && !hasTarget ? 'FIXED_APORTE_DEADLINE' :
    hasAporte && !hasTarget && !hasDate ? 'FREE_SAVING' :
    null

  const hint = useMemo(() => {
    if (!goalMode) return null
    const saved = parseFloat(savedAmount) || 0
    const target = parseFloat(targetAmount) || 0
    const aporte = parseFloat(monthlyAporte) || 0
    const date = targetDate ? new Date(targetDate) : null

    switch (goalMode) {
      case 'DEADLINE_TARGET': {
        const months = Math.max(1, differenceInMonths(date!, new Date()))
        const calc = (target - saved) / months
        return `Aporte necessário: ${formatBRL(calc)}/mês para atingir ${formatBRL(target)}`
      }
      case 'FIXED_APORTE_TARGET': {
        const remaining = target - saved
        const months = remaining > 0 ? Math.ceil(remaining / aporte) : 0
        const deadline = format(addMonths(new Date(), months), 'MMM/yyyy', { locale: ptBR })
        return `Você chegará em ${formatBRL(target)} em ~${months} meses (${deadline})`
      }
      case 'FIXED_APORTE_DEADLINE': {
        const months = Math.max(0, differenceInMonths(date!, new Date()))
        const total = saved + aporte * months
        return `Você terá ${formatBRL(total)} guardados até ${format(date!, 'MMM/yyyy', { locale: ptBR })}`
      }
      case 'FREE_SAVING':
        return `Poupança livre — acumulando ${formatBRL(aporte)}/mês sem prazo definido`
    }
  }, [goalMode, targetAmount, monthlyAporte, targetDate, savedAmount])

  const modeLabel: Record<GoalMode, string> = {
    DEADLINE_TARGET: 'Meta com prazo',
    FIXED_APORTE_TARGET: 'Meta com aporte fixo',
    FIXED_APORTE_DEADLINE: 'Compromisso por prazo',
    FREE_SAVING: 'Poupança livre',
  }

  function resetForm() {
    setName(''); setTargetAmount(''); setMonthlyAporte(''); setTargetDate(''); setSavedAmount(''); setPriority('MEDIUM')
  }

  const handleCreate = () => {
    if (!name || !goalMode) return
    const base = { name, priority, savedAmount: parseFloat(savedAmount) || 0 }
    let payload: Parameters<typeof create.mutate>[0]

    if (goalMode === 'DEADLINE_TARGET') {
      payload = { ...base, goalMode, targetAmount: parseFloat(targetAmount), targetDate: new Date(targetDate).toISOString() }
    } else if (goalMode === 'FIXED_APORTE_TARGET') {
      payload = { ...base, goalMode, targetAmount: parseFloat(targetAmount), fixedMonthlyAporte: parseFloat(monthlyAporte) }
    } else if (goalMode === 'FIXED_APORTE_DEADLINE') {
      payload = { ...base, goalMode, targetDate: new Date(targetDate).toISOString(), fixedMonthlyAporte: parseFloat(monthlyAporte) }
    } else {
      payload = { ...base, goalMode, fixedMonthlyAporte: parseFloat(monthlyAporte) }
    }

    create.mutate(payload, { onSuccess: () => { setShowForm(false); resetForm() } })
  }

  if (isLoading) return <div className="text-muted-foreground text-sm py-8 text-center">Carregando...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Objetivos</h1>
        <Button onClick={() => { setShowForm(!showForm); resetForm() }}>
          <Plus size={16} /> Novo objetivo
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-4">
          <h2 className="font-semibold text-sm">Novo objetivo</h2>

          <input
            placeholder="Nome (ex: Moto Honda, Reserva de emergência)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-border rounded-md px-3 py-2 text-sm"
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Valor alvo (R$)</label>
              <input
                placeholder="ex: 15000"
                type="number"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Aporte/mês (R$)</label>
              <input
                placeholder="ex: 500"
                type="number"
                step="0.01"
                value={monthlyAporte}
                onChange={(e) => setMonthlyAporte(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Prazo</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Já guardado (R$)</label>
              <input
                placeholder="0"
                type="number"
                step="0.01"
                value={savedAmount}
                onChange={(e) => setSavedAmount(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Prioridade</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
              className="w-full border border-border rounded-md px-3 py-2 bg-background text-sm"
            >
              <option value="HIGH">Alta</option>
              <option value="MEDIUM">Média</option>
              <option value="LOW">Baixa</option>
            </select>
          </div>

          {goalMode && (
            <div className="rounded-md bg-muted/50 border border-border px-3 py-2 space-y-0.5">
              <p className="text-xs font-medium text-primary">{modeLabel[goalMode]}</p>
              {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
            </div>
          )}

          {!goalMode && (name || targetAmount || monthlyAporte || targetDate) && (
            <p className="text-xs text-muted-foreground italic">
              Preencha: só prazo+alvo → meta com prazo · só aporte+alvo → aporte fixo · aporte+prazo → compromisso · só aporte → poupança livre
            </p>
          )}

          <div className="flex gap-2">
            <Button onClick={handleCreate} disabled={create.isPending || !goalMode || !name}>
              {create.isPending ? 'Salvando...' : 'Criar objetivo'}
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {!goals?.length && !paused?.length ? (
        <p className="text-center text-muted-foreground text-sm py-12">Nenhum objetivo cadastrado.</p>
      ) : (
        <div className="space-y-6">
          {!!goals?.length && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Ativos</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {goals.map((goal: Goal) => <GoalCard key={goal.id} goal={goal} />)}
              </div>
            </div>
          )}
          {!!paused?.length && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pausados</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {paused.map((goal: Goal) => <GoalCard key={goal.id} goal={goal} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
