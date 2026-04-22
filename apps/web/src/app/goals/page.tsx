'use client'
import { useState } from 'react'
import { useGoals, useCreateGoal } from '@/hooks/useGoals'
import { GoalCard } from '@/components/goals/GoalCard'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import type { Goal } from '@moneyflow/shared'

export default function GoalsPage() {
  const { data: goals, isLoading } = useGoals('ACTIVE')
  const create = useCreateGoal()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<{ name: string; targetAmount: string; targetDate: string; priority: 'HIGH' | 'MEDIUM' | 'LOW'; savedAmount: string }>({ name: '', targetAmount: '', targetDate: '', priority: 'MEDIUM', savedAmount: '' })

  const handleCreate = () => {
    if (!form.name || !form.targetAmount || !form.targetDate) return
    create.mutate(
      {
        name: form.name,
        targetAmount: parseFloat(form.targetAmount),
        targetDate: new Date(form.targetDate).toISOString(),
        priority: form.priority,
        savedAmount: parseFloat(form.savedAmount) || 0,
      },
      { onSuccess: () => { setShowForm(false); setForm({ name: '', targetAmount: '', targetDate: '', priority: 'MEDIUM', savedAmount: '' }) } },
    )
  }

  if (isLoading) return <div className="text-muted-foreground text-sm py-8 text-center">Carregando...</div>

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Objetivos</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Novo objetivo
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold text-sm">Novo objetivo</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Nome (ex: Moto Honda)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="col-span-2 border border-border rounded-md px-3 py-2 text-sm"
            />
            <input
              placeholder="Valor alvo (R$)"
              type="number"
              step="0.01"
              value={form.targetAmount}
              onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
              className="border border-border rounded-md px-3 py-2 text-sm"
            />
            <input
              placeholder="Já guardado (R$)"
              type="number"
              step="0.01"
              value={form.savedAmount}
              onChange={(e) => setForm({ ...form, savedAmount: e.target.value })}
              className="border border-border rounded-md px-3 py-2 text-sm"
            />
            <input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              className="border border-border rounded-md px-3 py-2 text-sm"
            />
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as 'HIGH' | 'MEDIUM' | 'LOW' })}
              className="border border-border rounded-md px-3 py-2 bg-background text-sm"
            >
              <option value="HIGH">Prioridade Alta</option>
              <option value="MEDIUM">Prioridade Média</option>
              <option value="LOW">Prioridade Baixa</option>
            </select>
          </div>
          <Button onClick={handleCreate} disabled={create.isPending}>
            {create.isPending ? 'Salvando...' : 'Criar objetivo'}
          </Button>
        </div>
      )}

      {!goals?.length ? (
        <p className="text-center text-muted-foreground text-sm py-12">Nenhum objetivo ativo.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {goals.map((goal: Goal) => <GoalCard key={goal.id} goal={goal} />)}
        </div>
      )}
    </div>
  )
}
