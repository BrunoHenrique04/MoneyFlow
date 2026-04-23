'use client'
import { useState } from 'react'
import { useDebts, useUpdateDebt, useDeleteDebt } from '@/hooks/useDebts'
import { formatBRL } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2, Pencil, X } from 'lucide-react'
import type { Debt, Situacao, UpdateDebtInput } from '@moneyflow/shared'

const situacaoLabel: Record<Situacao, string> = {
  PAGO: 'Pago',
  NAO_PAGO: 'Não Pago',
  RECEBER: 'Receber',
}

const situacaoVariant: Record<Situacao, 'success' | 'danger' | 'warning'> = {
  PAGO: 'success',
  NAO_PAGO: 'danger',
  RECEBER: 'warning',
}

interface Props {
  pessoaFilter: string
  situacaoFilter: string
}

function EditDebtModal({ debt, onClose }: { debt: Debt; onClose: () => void }) {
  const update = useUpdateDebt()
  const [form, setForm] = useState<UpdateDebtInput>({
    pessoa: debt.pessoa,
    descricao: debt.descricao,
    banco: debt.banco ?? '',
    valorAPagar: debt.valorAPagar,
    valorTotalCompra: debt.valorTotalCompra,
    situacao: debt.situacao as Situacao,
    dataCompra: debt.dataCompra ? new Date(debt.dataCompra).toISOString().slice(0, 10) : '',
    dataVencimento: debt.dataVencimento ? new Date(debt.dataVencimento).toISOString().slice(0, 10) : '',
    observacoes: debt.observacoes ?? '',
  })

  const handleSave = () => {
    update.mutate(
      {
        id: debt.id,
        data: {
          ...form,
          banco: form.banco || null,
          observacoes: form.observacoes || null,
          dataCompra: form.dataCompra ? new Date(form.dataCompra as string).toISOString() : null,
          dataVencimento: form.dataVencimento ? new Date(form.dataVencimento as string).toISOString() : null,
        },
      },
      { onSuccess: onClose },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-xl p-6 w-full max-w-lg space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-base">Editar registro</h2>
          <Button variant="ghost" size="sm" onClick={onClose}><X size={16} /></Button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Pessoa
            <input value={form.pessoa ?? ''} onChange={e => setForm({ ...form, pessoa: e.target.value })}
              className="border border-border rounded-md px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Descrição
            <input value={form.descricao ?? ''} onChange={e => setForm({ ...form, descricao: e.target.value })}
              className="border border-border rounded-md px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Banco / Pago por
            <input value={(form.banco as string) ?? ''} onChange={e => setForm({ ...form, banco: e.target.value })}
              className="border border-border rounded-md px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Valor a pagar (R$)
            <input type="number" step="0.01" value={form.valorAPagar ?? ''} onChange={e => setForm({ ...form, valorAPagar: parseFloat(e.target.value) })}
              className="border border-border rounded-md px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Valor total (R$)
            <input type="number" step="0.01" value={form.valorTotalCompra ?? ''} onChange={e => setForm({ ...form, valorTotalCompra: parseFloat(e.target.value) })}
              className="border border-border rounded-md px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Situação
            <select value={form.situacao ?? ''} onChange={e => setForm({ ...form, situacao: e.target.value as Situacao })}
              className="border border-border rounded-md px-3 py-2 bg-background text-sm">
              <option value="NAO_PAGO">Não Pago</option>
              <option value="PAGO">Pago</option>
              <option value="RECEBER">A Receber</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Data compra
            <input type="date" value={(form.dataCompra as string) ?? ''} onChange={e => setForm({ ...form, dataCompra: e.target.value })}
              className="border border-border rounded-md px-3 py-2 text-sm" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Data vencimento
            <input type="date" value={(form.dataVencimento as string) ?? ''} onChange={e => setForm({ ...form, dataVencimento: e.target.value })}
              className="border border-border rounded-md px-3 py-2 text-sm" />
          </label>
          <label className="col-span-2 flex flex-col gap-1 text-sm">
            Observações
            <input value={(form.observacoes as string) ?? ''} onChange={e => setForm({ ...form, observacoes: e.target.value })}
              className="border border-border rounded-md px-3 py-2 text-sm" />
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

export function DebtTable({ pessoaFilter, situacaoFilter }: Props) {
  const { data, isLoading } = useDebts({
    pessoa: pessoaFilter || undefined,
    situacao: situacaoFilter || undefined,
  })
  const update = useUpdateDebt()
  const remove = useDeleteDebt()
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null)

  const result = data as {
    items: Debt[]
    summary: {
      totalAPagar: number
      totalAReceber: number
      totalPago: number
      porPessoa: Array<{ pessoa: string; saldo: number }>
    }
  } | undefined

  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
  if (!result?.items.length) return <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma dívida registrada.</div>

  const cycleSituacao = (current: Situacao): Situacao => {
    const order: Situacao[] = ['NAO_PAGO', 'PAGO', 'RECEBER']
    return order[(order.indexOf(current) + 1) % order.length]
  }

  return (
    <>
      {editingDebt && <EditDebtModal debt={editingDebt} onClose={() => setEditingDebt(null)} />}

      <div className="space-y-4">
        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">A pagar</p>
            <p className="text-lg font-bold text-destructive">{formatBRL(result.summary.totalAPagar)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">A receber</p>
            <p className="text-lg font-bold text-green-500">{formatBRL(result.summary.totalAReceber)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Pago</p>
            <p className="text-lg font-bold">{formatBRL(result.summary.totalPago)}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <p className="text-xs text-muted-foreground">Saldo líquido</p>
            <p className={`text-lg font-bold ${result.summary.totalAReceber - result.summary.totalAPagar >= 0 ? 'text-green-500' : 'text-destructive'}`}>
              {formatBRL(result.summary.totalAReceber - result.summary.totalAPagar)}
            </p>
          </div>
        </div>

        {/* Por pessoa */}
        {result.summary.porPessoa.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-xs font-medium text-muted-foreground mb-3">Saldo por pessoa (quem deve a você)</p>
            <div className="flex flex-wrap gap-3">
              {result.summary.porPessoa.map(({ pessoa, saldo }) => (
                <div key={pessoa} className="flex items-center gap-2">
                  <span className="text-sm font-medium">{pessoa}</span>
                  <span className={`text-sm font-bold ${saldo < 0 ? 'text-destructive' : 'text-green-500'}`}>
                    {formatBRL(Math.abs(saldo))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabela */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {['Pessoa', 'Data compra', 'Descrição', 'Banco', 'A pagar', 'Total compra', 'Situação', 'Vencimento', ''].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {result.items.map((debt) => (
                <tr key={debt.id} className="hover:bg-accent/20 transition-colors">
                  <td className="px-3 py-2 font-medium whitespace-nowrap">{debt.pessoa}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {debt.dataCompra ? new Date(debt.dataCompra).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-3 py-2 max-w-[180px] truncate">{debt.descricao}</td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{debt.banco ?? '—'}</td>
                  <td className={`px-3 py-2 font-semibold whitespace-nowrap ${debt.valorAPagar < 0 ? 'text-destructive' : 'text-green-500'}`}>
                    {formatBRL(debt.valorAPagar)}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{formatBRL(debt.valorTotalCompra)}</td>
                  <td className="px-3 py-2">
                    <button
                      onClick={() => update.mutate({ id: debt.id, data: { situacao: cycleSituacao(debt.situacao as Situacao) } })}
                      disabled={update.isPending}
                      title="Clique para alternar situação"
                    >
                      <Badge variant={situacaoVariant[debt.situacao as Situacao]}>
                        {situacaoLabel[debt.situacao as Situacao]}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {debt.dataVencimento ? new Date(debt.dataVencimento).toLocaleDateString('pt-BR') : '—'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditingDebt(debt)} title="Editar">
                        <Pencil size={14} className="text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove.mutate(debt.id)} disabled={remove.isPending} title="Excluir">
                        <Trash2 size={14} className="text-muted-foreground" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
