'use client'
import { useDebts, useUpdateDebt, useDeleteDebt } from '@/hooks/useDebts'
import { formatBRL } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'
import type { Debt, Situacao } from '@moneyflow/shared'

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

export function DebtTable({ pessoaFilter, situacaoFilter }: Props) {
  const { data, isLoading } = useDebts({
    pessoa: pessoaFilter || undefined,
    situacao: situacaoFilter || undefined,
  })
  const update = useUpdateDebt()
  const remove = useDeleteDebt()

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
                  <Button variant="ghost" size="sm" onClick={() => remove.mutate(debt.id)} disabled={remove.isPending}>
                    <Trash2 size={14} className="text-muted-foreground" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
