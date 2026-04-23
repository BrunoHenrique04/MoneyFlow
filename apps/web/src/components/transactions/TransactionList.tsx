'use client'
import { useState } from 'react'
import { useTransactions, usePayTransaction, useDeleteTransaction, useUpdateTransaction } from '@/hooks/useTransactions'
import { useCategories } from '@/hooks/useCategories'
import { useAccounts } from '@/hooks/useAccounts'
import { formatBRL } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Trash2, Pencil, X, RefreshCw } from 'lucide-react'
import type { Transaction, UpdateTransactionInput, CategoryType } from '@moneyflow/shared'

interface Props {
  month: string
}

const utilityLabels: Record<string, string> = {
  ESSENTIAL: 'Essencial',
  NON_ESSENTIAL: 'Não essencial',
  INVESTMENT: 'Investimento',
}

const statusVariant: Record<string, 'success' | 'warning' | 'muted'> = {
  PAID: 'success',
  PENDING: 'warning',
  CANCELLED: 'muted',
}

const statusLabel: Record<string, string> = {
  PAID: 'Pago',
  PENDING: 'Pendente',
  CANCELLED: 'Cancelado',
}

const typeLabel: Record<string, string> = {
  SINGLE: 'Único',
  INSTALLMENT: 'Parcela',
  RECURRING: 'Recorrente',
  FIXED: 'Fixo',
  INCOME: 'Renda',
}

function EditTransactionModal({
  tx,
  onClose,
}: {
  tx: Transaction
  onClose: () => void
}) {
  const update = useUpdateTransaction()
  const { data: categories } = useCategories()
  const { data: accounts } = useAccounts()

  const [form, setForm] = useState<UpdateTransactionInput>({
    description: tx.description,
    amount: tx.amount,
    categoryId: tx.categoryId,
    utilityTag: tx.utilityTag,
    dueDate: tx.dueDate ? new Date(tx.dueDate).toISOString().slice(0, 10) : undefined,
    notes: tx.notes ?? undefined,
    status: tx.status,
  })

  const handleSave = () => {
    const payload: UpdateTransactionInput = {
      ...form,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
    }
    update.mutate({ id: tx.id, data: payload }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Editar lançamento</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X size={16} /></Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 flex flex-col gap-1 text-sm">
            Descrição
            <input
              value={form.description ?? ''}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="border border-border rounded-md px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Valor (R$)
            <input
              type="number"
              step="0.01"
              value={form.amount ?? ''}
              onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) })}
              className="border border-border rounded-md px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Data
            <input
              type="date"
              value={form.dueDate ?? ''}
              onChange={e => setForm({ ...form, dueDate: e.target.value })}
              className="border border-border rounded-md px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Categoria
            <select
              value={form.categoryId ?? ''}
              onChange={e => setForm({ ...form, categoryId: e.target.value })}
              className="border border-border rounded-md px-3 py-2 bg-background text-sm"
            >
              {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Tag
            <select
              value={form.utilityTag ?? ''}
              onChange={e => setForm({ ...form, utilityTag: e.target.value as UpdateTransactionInput['utilityTag'] })}
              className="border border-border rounded-md px-3 py-2 bg-background text-sm"
            >
              <option value="ESSENTIAL">Essencial</option>
              <option value="NON_ESSENTIAL">Não essencial</option>
              <option value="INVESTMENT">Investimento</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Situação
            <select
              value={form.status ?? ''}
              onChange={e => setForm({ ...form, status: e.target.value as UpdateTransactionInput['status'] })}
              className="border border-border rounded-md px-3 py-2 bg-background text-sm"
            >
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Conta
            <select
              value=""
              disabled
              className="border border-border rounded-md px-3 py-2 bg-muted text-sm text-muted-foreground"
            >
              <option>{accounts?.find(a => a.id === tx.accountId)?.name ?? 'Conta'}</option>
            </select>
          </label>

          <label className="col-span-2 flex flex-col gap-1 text-sm">
            Observações
            <textarea
              value={form.notes ?? ''}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="border border-border rounded-md px-3 py-2 text-sm resize-none"
            />
          </label>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {update.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export function TransactionList({ month }: Props) {
  const { data, isLoading } = useTransactions({ month })
  const pay = usePayTransaction()
  const remove = useDeleteTransaction()
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)

  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
  if (!data?.items.length) return <div className="text-center py-8 text-muted-foreground text-sm">Nenhum lançamento no mês.</div>

  return (
    <>
      {editingTx && <EditTransactionModal tx={editingTx} onClose={() => setEditingTx(null)} />}

      <div className="space-y-2">
        {data.items.map((tx: Transaction) => (
          <div
            key={tx.id}
            className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{tx.description}</p>
                {tx.type === 'FIXED' && (
                  <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                    <RefreshCw size={11} /> Fixo
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {new Date(tx.dueDate).toLocaleDateString('pt-BR')}
                </span>
                {tx.installmentNumber && (
                  <span className="text-xs text-muted-foreground">Parcela {tx.installmentNumber}</span>
                )}
                <Badge variant={statusVariant[tx.status] ?? 'muted'}>
                  {statusLabel[tx.status] ?? tx.status}
                </Badge>
                <span className="text-xs text-muted-foreground">{utilityLabels[tx.utilityTag]}</span>
                {tx.category && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {tx.category.name}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <span className="font-semibold text-sm">{formatBRL(tx.amount)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditingTx(tx)}
                title="Editar"
              >
                <Pencil size={14} className="text-muted-foreground" />
              </Button>
              {tx.status === 'PENDING' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => pay.mutate({ id: tx.id })}
                  disabled={pay.isPending}
                  title="Marcar como pago"
                >
                  <CheckCircle size={16} className="text-green-500" />
                </Button>
              )}
              {tx.status !== 'CANCELLED' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => remove.mutate({ id: tx.id })}
                  disabled={remove.isPending}
                  title="Cancelar"
                >
                  <Trash2 size={16} className="text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>
        ))}
        <div className="flex justify-between text-sm text-muted-foreground px-1 pt-2 border-t border-border">
          <span>{data.total} lançamentos</span>
          <span className="font-medium text-foreground">{formatBRL(data.summary.totalAmount)}</span>
        </div>
      </div>
    </>
  )
}
