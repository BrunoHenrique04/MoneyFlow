'use client'
import { useState } from 'react'
import { useUser } from '@/hooks/useReports'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { useRecurringTemplates, useCreateRecurringTemplate, useDeactivateRecurringTemplate, useUpdateRecurringTemplate } from '@/hooks/useRecurring'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { formatBRL } from '@/lib/utils'
import { Plus, Pencil, X, RefreshCw, Check } from 'lucide-react'
import type { User, RecurringTemplate } from '@moneyflow/shared'

function RecurringTemplatesSection() {
  const { data: templates, isLoading } = useRecurringTemplates()
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const create = useCreateRecurringTemplate()
  const deactivate = useDeactivateRecurringTemplate()
  const update = useUpdateRecurringTemplate()

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const emptyForm = {
    description: '',
    amount: '',
    accountId: '',
    categoryId: '',
    utilityTag: 'ESSENTIAL' as 'ESSENTIAL' | 'NON_ESSENTIAL' | 'INVESTMENT',
    dayOfMonth: '10',
    startMonth: new Date().toISOString().slice(0, 7),
    endMonth: '',
    notes: '',
  }
  const [form, setForm] = useState(emptyForm)

  const handleCreate = () => {
    if (!form.description || !form.amount || !form.accountId || !form.categoryId) return
    create.mutate(
      {
        description: form.description,
        amount: parseFloat(form.amount),
        accountId: form.accountId,
        categoryId: form.categoryId,
        utilityTag: form.utilityTag,
        dayOfMonth: parseInt(form.dayOfMonth),
        startMonth: form.startMonth,
        endMonth: form.endMonth || null,
        notes: form.notes || null,
      },
      { onSuccess: () => { setShowForm(false); setForm(emptyForm) } },
    )
  }

  const handleUpdate = (id: string) => {
    update.mutate(
      {
        id,
        data: {
          description: form.description,
          amount: parseFloat(form.amount),
          accountId: form.accountId,
          categoryId: form.categoryId,
          utilityTag: form.utilityTag,
          dayOfMonth: parseInt(form.dayOfMonth),
          endMonth: form.endMonth || null,
          notes: form.notes || null,
        },
      },
      { onSuccess: () => setEditingId(null) },
    )
  }

  const startEdit = (tpl: RecurringTemplate) => {
    setEditingId(tpl.id)
    setForm({
      description: tpl.description,
      amount: tpl.amount.toString(),
      accountId: tpl.accountId,
      categoryId: tpl.categoryId,
      utilityTag: tpl.utilityTag as 'ESSENTIAL' | 'NON_ESSENTIAL' | 'INVESTMENT',
      dayOfMonth: tpl.dayOfMonth.toString(),
      startMonth: tpl.startMonth,
      endMonth: tpl.endMonth ?? '',
      notes: tpl.notes ?? '',
    })
  }

  const TemplateForm = ({ onSave, onCancel, saveLabel }: { onSave: () => void; onCancel: () => void; saveLabel: string }) => (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pt-3 border-t border-border">
      <label className="col-span-2 md:col-span-1 flex flex-col gap-1 text-sm">
        Descrição
        <input
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Conta de Luz, Aluguel..."
          className="border border-border rounded-md px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Valor (R$)
        <input
          type="number"
          step="0.01"
          value={form.amount}
          onChange={e => setForm({ ...form, amount: e.target.value })}
          className="border border-border rounded-md px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Dia do mês (1–28)
        <input
          type="number"
          min="1"
          max="28"
          value={form.dayOfMonth}
          onChange={e => setForm({ ...form, dayOfMonth: e.target.value })}
          className="border border-border rounded-md px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Conta
        <select
          value={form.accountId}
          onChange={e => setForm({ ...form, accountId: e.target.value })}
          className="border border-border rounded-md px-3 py-2 bg-background text-sm"
        >
          <option value="">Selecione...</option>
          {accounts?.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Categoria
        <select
          value={form.categoryId}
          onChange={e => setForm({ ...form, categoryId: e.target.value })}
          className="border border-border rounded-md px-3 py-2 bg-background text-sm"
        >
          <option value="">Selecione...</option>
          {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Tag
        <select
          value={form.utilityTag}
          onChange={e => setForm({ ...form, utilityTag: e.target.value as typeof form.utilityTag })}
          className="border border-border rounded-md px-3 py-2 bg-background text-sm"
        >
          <option value="ESSENTIAL">Essencial</option>
          <option value="NON_ESSENTIAL">Não essencial</option>
          <option value="INVESTMENT">Investimento</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Início (YYYY-MM)
        <input
          type="month"
          value={form.startMonth}
          onChange={e => setForm({ ...form, startMonth: e.target.value })}
          className="border border-border rounded-md px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Término (opcional)
        <input
          type="month"
          value={form.endMonth}
          onChange={e => setForm({ ...form, endMonth: e.target.value })}
          placeholder="Deixe vazio = perpétuo"
          className="border border-border rounded-md px-3 py-2 text-sm"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Observações
        <input
          value={form.notes}
          onChange={e => setForm({ ...form, notes: e.target.value })}
          placeholder="Ex: CEMIG"
          className="border border-border rounded-md px-3 py-2 text-sm"
        />
      </label>
      <div className="col-span-2 md:col-span-3 flex gap-2 pt-1">
        <Button onClick={onSave}>{saveLabel}</Button>
        <Button variant="secondary" onClick={onCancel}>Cancelar</Button>
      </div>
    </div>
  )

  const active = (templates ?? []).filter(t => t.isActive)
  const inactive = (templates ?? []).filter(t => !t.isActive)

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <RefreshCw size={15} className="text-primary" /> Gastos Fixos / Recorrentes Perpétuos
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Contas de luz, água, aluguel — geradas automaticamente todo mês enquanto ativas.
          </p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm) }}>
          <Plus size={14} /> Novo
        </Button>
      </div>

      {showForm && !editingId && (
        <TemplateForm
          onSave={handleCreate}
          onCancel={() => { setShowForm(false); setForm(emptyForm) }}
          saveLabel={create.isPending ? 'Salvando...' : 'Criar gasto fixo'}
        />
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {active.length === 0 && !isLoading && !showForm && (
        <p className="text-sm text-muted-foreground">Nenhum gasto fixo configurado.</p>
      )}

      <div className="space-y-2">
        {active.map(tpl => (
          <div key={tpl.id} className="rounded-md border border-border bg-background p-3 space-y-2">
            {editingId === tpl.id ? (
              <TemplateForm
                onSave={() => handleUpdate(tpl.id)}
                onCancel={() => setEditingId(null)}
                saveLabel={update.isPending ? 'Salvando...' : 'Salvar alterações'}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{tpl.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBRL(tpl.amount)} · Dia {tpl.dayOfMonth} · {tpl.startMonth}
                    {tpl.endMonth ? ` → ${tpl.endMonth}` : ' → perpétuo'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => startEdit(tpl)} title="Editar">
                    <Pencil size={14} className="text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deactivate.mutate(tpl.id)}
                    disabled={deactivate.isPending}
                    title="Desativar"
                  >
                    <X size={14} className="text-destructive/70" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {inactive.length > 0 && (
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Inativos ({inactive.length})</summary>
          <div className="mt-2 space-y-1">
            {inactive.map(tpl => (
              <div key={tpl.id} className="flex items-center gap-2 opacity-50">
                <span className="line-through">{tpl.description}</span>
                <span>{formatBRL(tpl.amount)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const { data: user } = useUser()
  const userData = user as User | undefined
  const qc = useQueryClient()

  const [name, setName] = useState('')
  const [income, setIncome] = useState('')

  const update = useMutation({
    mutationFn: (data: { name?: string; monthlyIncome?: number }) => api.patch('/user', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user'] }),
  })

  const handleSave = () => {
    update.mutate({
      name: name || undefined,
      monthlyIncome: income ? parseFloat(income) : undefined,
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Configurações</h1>

      <div className="rounded-lg border border-border bg-card p-5 space-y-4">
        <h2 className="font-semibold text-sm">Perfil</h2>

        {userData && (
          <p className="text-xs text-muted-foreground">
            Renda atual: <strong>R$ {userData.monthlyIncome.toFixed(2)}</strong>
          </p>
        )}

        <label className="flex flex-col gap-1 text-sm">
          Nome
          <input
            placeholder={userData?.name ?? 'Seu nome'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border border-border rounded-md px-3 py-2 text-sm"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Renda mensal (R$)
          <input
            type="number"
            step="0.01"
            placeholder={userData?.monthlyIncome?.toString() ?? '0'}
            value={income}
            onChange={(e) => setIncome(e.target.value)}
            className="border border-border rounded-md px-3 py-2 text-sm"
          />
        </label>

        <Button onClick={handleSave} disabled={update.isPending}>
          {update.isPending ? 'Salvando...' : 'Salvar'}
        </Button>
        {update.isSuccess && <p className="text-xs text-green-600">Salvo com sucesso.</p>}
      </div>

      <RecurringTemplatesSection />
    </div>
  )
}
