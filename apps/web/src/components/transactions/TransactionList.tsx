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

  const isInstallment = tx.type === 'INSTALLMENT'
  const isFixed = tx.type === 'FIXED'
  const isShared = tx.type === 'SHARED'
  const totalInstallments = tx.installmentGroup?.totalInstallments ?? null
  const isLastInstallment = isInstallment && tx.installmentNumber != null && totalInstallments != null && tx.installmentNumber >= totalInstallments

  const [form, setForm] = useState({
    description: tx.description,
    amount: tx.amount,
    categoryId: tx.categoryId,
    utilityTag: tx.utilityTag as UpdateTransactionInput['utilityTag'],
    dueDate: tx.dueDate ? new Date(tx.dueDate).toISOString().slice(0, 10) : '',
    notes: tx.notes ?? '',
    status: tx.status as UpdateTransactionInput['status'],
    pessoa: tx.pessoa ?? '',
    situacao: (tx.situacao ?? '') as UpdateTransactionInput['situacao'] | '',
    scope: 'only_this' as 'only_this' | 'this_and_future',
  })

  const handleSave = () => {
    const payload: UpdateTransactionInput = {
      description: form.description,
      amount: form.amount,
      categoryId: form.categoryId,
      utilityTag: form.utilityTag,
      dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      notes: form.notes || null,
      status: form.status,
      ...(isShared && {
        pessoa: form.pessoa || null,
        situacao: (form.situacao || null) as UpdateTransactionInput['situacao'],
      }),
      ...(isInstallment && { scope: form.scope }),
    }
    update.mutate({ id: tx.id, data: payload }, { onSuccess: onClose })
  }

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm(f => ({ ...f, [key]: value }))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-base">Editar lançamento</h2>
            {isInstallment && tx.installmentNumber != null && totalInstallments != null && (
              <p className="text-xs text-muted-foreground mt-0.5">
                Parcela {tx.installmentNumber} de {totalInstallments}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}><X size={16} /></Button>
        </div>

        {isFixed && (
          <div className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
            Esta edição afeta apenas este mês. Para alterar permanentemente, edite o template em <strong>Configurações → Gastos Fixos</strong>.
          </div>
        )}

        {isInstallment && !isLastInstallment && (
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="only_this"
                checked={form.scope === 'only_this'}
                onChange={() => set('scope', 'only_this')}
                className="accent-primary"
              />
              Só esta parcela
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="scope"
                value="this_and_future"
                checked={form.scope === 'this_and_future'}
                onChange={() => set('scope', 'this_and_future')}
                className="accent-primary"
              />
              Esta e as futuras
            </label>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 flex flex-col gap-1 text-sm">
            Descrição
            <input
              value={form.description}
              onChange={e => set('description', e.target.value)}
              className="border border-border rounded-md px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Valor (R$)
            <input
              type="number"
              step="0.01"
              value={form.amount}
              onChange={e => set('amount', parseFloat(e.target.value))}
              className="border border-border rounded-md px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Data
            <input
              type="date"
              value={form.dueDate}
              onChange={e => set('dueDate', e.target.value)}
              className="border border-border rounded-md px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Categoria
            <select
              value={form.categoryId}
              onChange={e => set('categoryId', e.target.value)}
              className="border border-border rounded-md px-3 py-2 bg-background text-sm"
            >
              {categories?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Tag
            <select
              value={form.utilityTag ?? ''}
              onChange={e => set('utilityTag', e.target.value as UpdateTransactionInput['utilityTag'])}
              className="border border-border rounded-md px-3 py-2 bg-background text-sm"
            >
              <option value="ESSENTIAL">Essencial</option>
              <option value="NON_ESSENTIAL">Não essencial</option>
              <option value="INVESTMENT">Investimento</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Status
            <select
              value={form.status ?? ''}
              onChange={e => set('status', e.target.value as UpdateTransactionInput['status'])}
              className="border border-border rounded-md px-3 py-2 bg-background text-sm"
            >
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Conta
            <input
              value={accounts?.find(a => a.id === tx.accountId)?.name ?? '—'}
              disabled
              className="border border-border rounded-md px-3 py-2 bg-muted text-sm text-muted-foreground"
            />
          </label>

          {isShared && (
            <>
              <label className="flex flex-col gap-1 text-sm">
                Pessoa
                <input
                  value={form.pessoa}
                  onChange={e => set('pessoa', e.target.value)}
                  className="border border-border rounded-md px-3 py-2 text-sm"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm">
                Situação
                <select
                  value={form.situacao ?? ''}
                  onChange={e => set('situacao', e.target.value as typeof form.situacao)}
                  className="border border-border rounded-md px-3 py-2 bg-background text-sm"
                >
                  <option value="NAO_PAGO">Não pago</option>
                  <option value="PAGO">Pago</option>
                  <option value="RECEBER">A receber</option>
                </select>
              </label>
            </>
          )}

          <label className="col-span-2 flex flex-col gap-1 text-sm">
            Observações
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
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
