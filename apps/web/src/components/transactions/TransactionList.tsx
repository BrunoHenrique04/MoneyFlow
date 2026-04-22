'use client'
import { useTransactions, usePayTransaction, useDeleteTransaction } from '@/hooks/useTransactions'
import { formatBRL } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, Trash2 } from 'lucide-react'
import type { Transaction } from '@moneyflow/shared'

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

export function TransactionList({ month }: Props) {
  const { data, isLoading } = useTransactions({ month })
  const pay = usePayTransaction()
  const remove = useDeleteTransaction()

  if (isLoading) return <div className="text-center py-8 text-muted-foreground text-sm">Carregando...</div>
  if (!data?.items.length) return <div className="text-center py-8 text-muted-foreground text-sm">Nenhum lançamento no mês.</div>

  return (
    <div className="space-y-2">
      {data.items.map((tx: Transaction) => (
        <div
          key={tx.id}
          className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{tx.description}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-muted-foreground">
                {new Date(tx.dueDate).toLocaleDateString('pt-BR')}
              </span>
              {tx.installmentNumber && (
                <span className="text-xs text-muted-foreground">
                  Parcela {tx.installmentNumber}
                </span>
              )}
              <Badge variant={statusVariant[tx.status] ?? 'muted'}>
                {statusLabel[tx.status] ?? tx.status}
              </Badge>
              <span className="text-xs text-muted-foreground">{utilityLabels[tx.utilityTag]}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-4">
            <span className="font-semibold text-sm">{formatBRL(tx.amount)}</span>
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
  )
}
