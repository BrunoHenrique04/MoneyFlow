'use client'
import { useState, useRef } from 'react'
import { addMonths, subMonths, format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  ChevronLeft, ChevronRight, Plus, X, Upload, CheckCircle, AlertTriangle,
  Pencil, Trash2, CircleDollarSign, Users, Eye, EyeOff,
} from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { useProjections, useCreateTransaction, useUpdateTransaction, useDeleteTransaction, usePayTransaction, useImportTransactions } from '@/hooks/useTransactions'
import { useCreateRecurringTemplate } from '@/hooks/useRecurring'
import { useAccounts } from '@/hooks/useAccounts'
import { useCategories } from '@/hooks/useCategories'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Transaction, UpdateTransactionInput } from '@moneyflow/shared'

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmtMoney(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string) {
  try { return format(parseISO(iso), 'dd/MM/yyyy') } catch { return iso }
}

function tagLabel(tag: string) {
  if (tag === 'ESSENTIAL') return 'Essencial'
  if (tag === 'INVESTMENT') return 'Investimento'
  return 'N. Essencial'
}

function tagColor(tag: string) {
  if (tag === 'ESSENTIAL') return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
  if (tag === 'INVESTMENT') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
  return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
}

function statusColor(status: string) {
  if (status === 'PAID') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  if (status === 'CANCELLED') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
}

function statusLabel(status: string) {
  if (status === 'PAID') return 'Pago'
  if (status === 'CANCELLED') return 'Cancelado'
  return 'Pendente'
}

function typeLabel(type: string) {
  const m: Record<string, string> = {
    SINGLE: 'Único', INSTALLMENT: 'Parcela', RECURRING: 'Recorrente',
    FIXED: 'Fixo', INCOME: 'Receita', SHARED: 'Compartilhado',
  }
  return m[type] ?? type
}

function situacaoLabel(s: string | null) {
  if (s === 'PAGO') return 'Pago'
  if (s === 'RECEBER') return 'A Receber'
  if (s === 'NAO_PAGO') return 'Não Pago'
  return ''
}

function situacaoColor(s: string | null) {
  if (s === 'PAGO') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  if (s === 'RECEBER') return 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200'
  if (s === 'NAO_PAGO') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  return ''
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

function EditModal({ tx, onClose }: { tx: Transaction; onClose: () => void }) {
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const update = useUpdateTransaction()

  const [form, setForm] = useState<UpdateTransactionInput>({
    description: tx.description,
    amount: tx.amount,
    totalAmount: tx.totalAmount ?? undefined,
    categoryId: tx.categoryId,
    accountId: tx.accountId ?? undefined,
    utilityTag: tx.utilityTag,
    dueDate: tx.dueDate.slice(0, 10),
    notes: tx.notes ?? undefined,
    status: tx.status as 'PENDING' | 'PAID' | 'CANCELLED',
    pessoa: tx.pessoa ?? undefined,
    situacao: (tx.situacao as 'PAGO' | 'NAO_PAGO' | 'RECEBER' | undefined) ?? undefined,
  })

  const set = (k: keyof typeof form, v: unknown) => setForm((p) => ({ ...p, [k]: v }))

  const handleSave = () => {
    const payload: UpdateTransactionInput = {
      ...form,
      dueDate: form.dueDate ? new Date(form.dueDate as string).toISOString() : undefined,
    }
    update.mutate({ id: tx.id, data: payload }, { onSuccess: onClose })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold text-lg">Editar lançamento</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
        </div>
        <div className="p-4 grid grid-cols-2 gap-3 text-sm">
          <label className="col-span-2 flex flex-col gap-1">
            Descrição
            <input value={form.description ?? ''} onChange={(e) => set('description', e.target.value)}
              className="border border-border rounded-md px-3 py-2 bg-background" />
          </label>
          <label className="flex flex-col gap-1">
            Valor (R$)
            <input type="number" step="0.01" value={form.amount ?? ''} onChange={(e) => set('amount', parseFloat(e.target.value))}
              className="border border-border rounded-md px-3 py-2 bg-background" />
          </label>
          <label className="flex flex-col gap-1">
            Data
            <input type="date" value={(form.dueDate as string ?? '').slice(0, 10)} onChange={(e) => set('dueDate', e.target.value)}
              className="border border-border rounded-md px-3 py-2 bg-background" />
          </label>
          <label className="flex flex-col gap-1">
            Categoria
            <select value={form.categoryId ?? ''} onChange={(e) => set('categoryId', e.target.value)}
              className="border border-border rounded-md px-3 py-2 bg-background">
              {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Conta
            <select value={form.accountId ?? ''} onChange={(e) => set('accountId', e.target.value || undefined)}
              className="border border-border rounded-md px-3 py-2 bg-background">
              <option value="">Sem conta</option>
              {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Tag
            <select value={form.utilityTag ?? ''} onChange={(e) => set('utilityTag', e.target.value as 'ESSENTIAL' | 'NON_ESSENTIAL' | 'INVESTMENT')}
              className="border border-border rounded-md px-3 py-2 bg-background">
              <option value="NON_ESSENTIAL">Não Essencial</option>
              <option value="ESSENTIAL">Essencial</option>
              <option value="INVESTMENT">Investimento</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Status
            <select value={form.status ?? ''} onChange={(e) => set('status', e.target.value as 'PENDING' | 'PAID' | 'CANCELLED')}
              className="border border-border rounded-md px-3 py-2 bg-background">
              <option value="PENDING">Pendente</option>
              <option value="PAID">Pago</option>
              <option value="CANCELLED">Cancelado</option>
            </select>
          </label>
          <label className="flex flex-col gap-1">
            Pessoa
            <input value={form.pessoa ?? ''} onChange={(e) => set('pessoa', e.target.value || undefined)}
              className="border border-border rounded-md px-3 py-2 bg-background" placeholder="Opcional" />
          </label>
          <label className="flex flex-col gap-1">
            Situação
            <select value={form.situacao ?? ''} onChange={(e) => set('situacao', (e.target.value as 'PAGO' | 'NAO_PAGO' | 'RECEBER') || undefined)}
              className="border border-border rounded-md px-3 py-2 bg-background">
              <option value="">—</option>
              <option value="NAO_PAGO">Não Pago</option>
              <option value="PAGO">Pago</option>
              <option value="RECEBER">A Receber</option>
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1">
            Observações
            <textarea value={form.notes ?? ''} onChange={(e) => set('notes', e.target.value || undefined)} rows={2}
              className="border border-border rounded-md px-3 py-2 bg-background resize-none" />
          </label>
        </div>
        <div className="flex gap-2 p-4 border-t border-border">
          <Button onClick={handleSave} disabled={update.isPending} className="flex-1">
            {update.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button variant="secondary" onClick={onClose} className="flex-1">Cancelar</Button>
        </div>
      </div>
    </div>
  )
}

// ─── New Transaction Form ─────────────────────────────────────────────────────

function NewTransactionForm({ onClose }: { onClose: () => void }) {
  const { data: accounts } = useAccounts()
  const { data: categories } = useCategories()
  const create = useCreateTransaction()
  const createTemplate = useCreateRecurringTemplate()

  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [totalAmountField, setTotalAmountField] = useState('')
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [installments, setInstallments] = useState('1')
  const [isRecurring, setIsRecurring] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [accountId, setAccountId] = useState('')
  const [utilityTag, setUtilityTag] = useState<'ESSENTIAL' | 'NON_ESSENTIAL' | 'INVESTMENT'>('NON_ESSENTIAL')
  const [notes, setNotes] = useState('')
  // Pessoa is the trigger: when filled, switches to SHARED mode automatically
  const [pessoa, setPessoa] = useState('')
  const [situacao, setSituacao] = useState<'NAO_PAGO' | 'PAGO' | 'RECEBER'>('NAO_PAGO')
  // Extra fields for recurring template
  const [dayOfMonth, setDayOfMonth] = useState('10')
  const [startMonth, setStartMonth] = useState(new Date().toISOString().slice(0, 7))
  const [endMonth, setEndMonth] = useState('')

  const isShared = pessoa.trim().length > 0
  const numInstallments = Math.max(1, parseInt(installments) || 1)
  const isInstallment = !isRecurring && numInstallments > 1
  const amt = parseFloat(amount) || 0
  const autoTotal = amt * numInstallments
  const computedTotal = totalAmountField ? parseFloat(totalAmountField) : autoTotal

  const typeHint = isRecurring
    ? '🔁 Gasto Fixo / Recorrente Perpétuo'
    : isShared && isInstallment ? '🤝 Compartilhado · Parcelado'
    : isShared ? '🤝 Compartilhado / Dívida'
    : isInstallment ? '📋 Parcelado'
    : '📌 Único'

  const handleToggleRecurring = () => {
    setIsRecurring((r) => {
      if (!r) setInstallments('1')
      return !r
    })
  }

  const handleInstallmentsChange = (v: string) => {
    setInstallments(v)
    if (parseInt(v) > 1) setIsRecurring(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!desc || !categoryId || !amount) return

    const isoDate = new Date(date).toISOString()
    const baseFields = {
      description: desc,
      categoryId,
      accountId: accountId || null,
      utilityTag,
      notes: notes || null,
      pessoa: pessoa.trim() || null,
      situacao: isShared ? situacao : null,
    }

    if (isRecurring) {
      if (!accountId) { alert('Selecione uma conta para o gasto recorrente.'); return }
      createTemplate.mutate({
        description: desc,
        amount: amt,
        accountId,
        categoryId,
        utilityTag,
        dayOfMonth: parseInt(dayOfMonth),
        startMonth,
        endMonth: endMonth || null,
        notes: notes || null,
      }, { onSuccess: onClose })
      return
    }

    let payload: Parameters<typeof create.mutate>[0]
    if (isInstallment) {
      payload = {
        type: 'INSTALLMENT',
        totalAmount: computedTotal,
        totalInstallments: numInstallments,
        firstDueDate: isoDate,
        ...baseFields,
      }
    } else if (isShared) {
      payload = {
        type: 'SHARED',
        amount: amt,
        dueDate: isoDate,
        description: desc,
        categoryId,
        accountId: accountId || null,
        utilityTag,
        notes: notes || null,
        pessoa: pessoa.trim(),
        situacao,
        totalAmount: totalAmountField ? parseFloat(totalAmountField) : null,
      }
    } else {
      payload = { type: 'SINGLE', amount: amt, dueDate: isoDate, ...baseFields }
    }

    create.mutate(payload, { onSuccess: onClose })
  }

  const isPending = create.isPending || createTemplate.isPending

  return (
    <form onSubmit={handleSubmit} className="bg-card border border-border rounded-xl p-4 space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Novo lançamento</h2>
          <span className="text-xs text-muted-foreground">{typeHint}</span>
        </div>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Descrição */}
        <label className="col-span-2 flex flex-col gap-1">
          Descrição
          <input required value={desc} onChange={(e) => setDesc(e.target.value)}
            className="border border-border rounded-md px-3 py-2 bg-background" />
        </label>

        {/* Valor + Data */}
        <label className="flex flex-col gap-1">
          {isInstallment ? 'Valor por parcela (R$)' : 'Valor (R$)'}
          <input required type="number" step="0.01" min="0.01" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border border-border rounded-md px-3 py-2 bg-background" />
        </label>
        <label className="flex flex-col gap-1">
          {isInstallment ? 'Primeira parcela' : 'Data'}
          <input required type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="border border-border rounded-md px-3 py-2 bg-background" />
        </label>

        {/* Nº parcelas + Recorrente toggle */}
        <label className="flex flex-col gap-1">
          <span className="flex items-center justify-between">
            <span>Nº parcelas</span>
            <button type="button" onClick={handleToggleRecurring}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground select-none">
              <span className={`relative inline-flex h-4 w-7 shrink-0 rounded-full transition-colors ${isRecurring ? 'bg-primary' : 'bg-muted border border-border'}`}>
                <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${isRecurring ? 'translate-x-3' : 'translate-x-0.5'}`} />
              </span>
              Recorrente
            </button>
          </span>
          <input type="number" min="1" value={installments}
            onChange={(e) => handleInstallmentsChange(e.target.value)}
            disabled={isRecurring}
            className="border border-border rounded-md px-3 py-2 bg-background disabled:opacity-50" />
          {isInstallment && amt > 0 && (
            <span className="text-xs text-muted-foreground">
              Total estimado: {autoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          )}
        </label>

        {/* Valor total — shown for installment (override) or shared (optional) */}
        {(isInstallment || isShared) && (
          <label className="flex flex-col gap-1">
            {isInstallment ? 'Valor total da compra (R$)' : 'Valor total da compra (R$)'}
            <input type="number" step="0.01" value={totalAmountField}
              onChange={(e) => setTotalAmountField(e.target.value)}
              className="border border-border rounded-md px-3 py-2 bg-background"
              placeholder={isInstallment ? `${autoTotal.toFixed(2)} (auto)` : 'Opcional'} />
          </label>
        )}

        {/* Recurring extra fields */}
        {isRecurring && (
          <>
            <label className="flex flex-col gap-1">
              Dia do mês (1–28)
              <input type="number" min="1" max="28" value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
                className="border border-border rounded-md px-3 py-2 bg-background" />
            </label>
            <label className="flex flex-col gap-1">
              Início (mês)
              <input type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)}
                className="border border-border rounded-md px-3 py-2 bg-background" />
            </label>
            <label className="col-span-2 flex flex-col gap-1">
              Encerramento (opcional — vazio = perpétuo)
              <input type="month" value={endMonth} onChange={(e) => setEndMonth(e.target.value)}
                className="border border-border rounded-md px-3 py-2 bg-background" />
            </label>
          </>
        )}

        {/* Pessoa — always visible; fills → SHARED mode */}
        <label className="col-span-2 flex flex-col gap-1">
          <span>Pessoa <span className="text-muted-foreground font-normal text-xs">— preencha para modo compartilhado/dívida</span></span>
          <input value={pessoa} onChange={(e) => setPessoa(e.target.value)}
            className="border border-border rounded-md px-3 py-2 bg-background"
            placeholder="Nome da outra parte (opcional)" />
        </label>

        {/* Situação — appears only when Pessoa is filled */}
        {isShared && (
          <label className="col-span-2 flex flex-col gap-1">
            Situação com {pessoa}
            <select value={situacao} onChange={(e) => setSituacao(e.target.value as typeof situacao)}
              className="border border-border rounded-md px-3 py-2 bg-background">
              <option value="NAO_PAGO">Não Pago</option>
              <option value="PAGO">Pago</option>
              <option value="RECEBER">A Receber — {pessoa} me deve</option>
            </select>
          </label>
        )}

        {/* Categoria + Conta */}
        <label className="flex flex-col gap-1">
          Categoria
          <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)}
            className="border border-border rounded-md px-3 py-2 bg-background">
            <option value="">Selecione...</option>
            {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          Conta{isRecurring && <span className="text-destructive ml-0.5">*</span>}
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)}
            className="border border-border rounded-md px-3 py-2 bg-background">
            <option value="">Sem conta</option>
            {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </label>

        {/* Tag */}
        <label className="col-span-2 flex flex-col gap-1">
          Tag de utilidade
          <select value={utilityTag} onChange={(e) => setUtilityTag(e.target.value as typeof utilityTag)}
            className="border border-border rounded-md px-3 py-2 bg-background">
            <option value="NON_ESSENTIAL">Não Essencial</option>
            <option value="ESSENTIAL">Essencial</option>
            <option value="INVESTMENT">Investimento</option>
          </select>
        </label>

        {/* Notes */}
        <label className="col-span-2 flex flex-col gap-1">
          Observações
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="border border-border rounded-md px-3 py-2 bg-background resize-none" />
        </label>
      </div>

      <Button type="submit" className="w-full" disabled={isPending}>
        {isPending ? 'Salvando...' : isRecurring ? 'Criar gasto fixo recorrente' : 'Salvar lançamento'}
      </Button>
    </form>
  )
}

// ─── Import Button ────────────────────────────────────────────────────────────

function ImportButton() {
  const inputRef = useRef<HTMLInputElement>(null)
  const importTx = useImportTransactions()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMsg(null)
    importTx.mutate(file, {
      onSuccess: (d) => setMsg({ ok: true, text: `${d.imported} registros importados.` }),
      onError: (err) => setMsg({ ok: false, text: err.message }),
    })
    e.target.value = ''
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={importTx.isPending}>
        <Upload size={15} className="mr-1" />
        {importTx.isPending ? 'Importando...' : 'Importar ODS/CSV'}
      </Button>
      <input ref={inputRef} type="file" accept=".ods,.xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      {msg && (
        <span className={`flex items-center gap-1 text-xs ${msg.ok ? 'text-green-600' : 'text-destructive'}`}>
          {msg.ok ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
          {msg.text}
        </span>
      )}
    </div>
  )
}

// ─── Transactions Table Row ───────────────────────────────────────────────────

function TxRow({
  tx, onEdit, onDelete, onPay, isFuture,
}: {
  tx: Transaction & { isFuture?: boolean }
  onEdit: (tx: Transaction) => void
  onDelete: (tx: Transaction) => void
  onPay: (tx: Transaction) => void
  isFuture?: boolean
}) {
  const rowClass = isFuture
    ? 'opacity-50 italic border-b border-border hover:bg-muted/20'
    : 'border-b border-border hover:bg-muted/30 transition-colors'

  return (
    <tr className={rowClass}>
      <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(tx.dueDate)}</td>
      <td className="py-2 px-3 text-sm">
        <span className="font-medium">{tx.description}</span>
        {tx.installmentNumber && tx.installmentGroupId && (
          <span className="ml-1 text-xs text-muted-foreground">#{tx.installmentNumber}</span>
        )}
        {isFuture && <span className="ml-1 text-xs text-muted-foreground">(projeção)</span>}
      </td>
      <td className="py-2 px-3 text-xs">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: tx.category?.color }} />
          {tx.category?.name}
        </span>
      </td>
      <td className="py-2 px-3 text-xs text-muted-foreground">{tx.account?.name ?? '—'}</td>
      <td className="py-2 px-3">
        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${tagColor(tx.utilityTag)}`}>
          {tagLabel(tx.utilityTag)}
        </span>
      </td>
      <td className="py-2 px-3 text-xs">{tx.pessoa ?? '—'}</td>
      <td className="py-2 px-3">
        {tx.situacao ? (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${situacaoColor(tx.situacao)}`}>
            {situacaoLabel(tx.situacao)}
          </span>
        ) : '—'}
      </td>
      <td className="py-2 px-3 text-xs text-muted-foreground">
        {tx.totalAmount ? fmtMoney(tx.totalAmount) : '—'}
      </td>
      <td className="py-2 px-3 text-sm font-medium text-right whitespace-nowrap">
        {fmtMoney(tx.amount)}
      </td>
      <td className="py-2 px-3">
        {!isFuture && (
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${statusColor(tx.status)}`}>
            {statusLabel(tx.status)}
          </span>
        )}
        {isFuture && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
            {typeLabel(tx.type)}
          </span>
        )}
      </td>
      <td className="py-2 px-3">
        {!isFuture && (
          <div className="flex items-center gap-1">
            {tx.status === 'PENDING' && (
              <button onClick={() => onPay(tx)} title="Marcar como pago"
                className="p-1 rounded hover:bg-green-100 text-green-700 dark:hover:bg-green-900">
                <CircleDollarSign size={15} />
              </button>
            )}
            <button onClick={() => onEdit(tx)} title="Editar"
              className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground">
              <Pencil size={15} />
            </button>
            <button onClick={() => onDelete(tx)} title="Remover"
              className="p-1 rounded hover:bg-red-100 text-red-600 dark:hover:bg-red-900">
              <Trash2 size={15} />
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  const { selectedMonth, setSelectedMonth } = useUIStore()
  const [showForm, setShowForm] = useState(false)
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [deleteTx, setDeleteTx] = useState<Transaction | null>(null)
  const [showProjections, setShowProjections] = useState(true)
  const [pessoaFilter, setPessoaFilter] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [situacaoFilter, setSituacaoFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const { data, isLoading } = useProjections(selectedMonth)
  const deleteMutation = useDeleteTransaction()
  const payMutation = usePayTransaction()

  const prevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = subMonths(new Date(y, m - 1, 1), 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const nextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = addMonths(new Date(y, m - 1, 1), 1)
    setSelectedMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }

  const monthLabel = (() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    return format(new Date(y, m - 1, 1), 'MMMM yyyy', { locale: ptBR })
  })()

  const isFutureMonth = selectedMonth > (() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })()

  const allItems = data?.items ?? []

  const filtered = allItems.filter((t) => {
    if (!showProjections && t.isFuture) return false
    if (pessoaFilter && t.pessoa !== pessoaFilter) return false
    if (accountFilter && (t.account?.id ?? '') !== accountFilter) return false
    if (situacaoFilter && t.situacao !== situacaoFilter) return false
    if (typeFilter && t.type !== typeFilter) return false
    if (statusFilter && !t.isFuture && t.status !== statusFilter) return false
    return true
  })

  const realItems = filtered.filter((t) => !t.isFuture)
  const totalSpent = realItems.filter((t) => t.status !== 'CANCELLED' && t.type !== 'INCOME')
    .reduce((s, t) => s + t.amount, 0)
  const totalIncome = realItems.filter((t) => t.type === 'INCOME' && t.status !== 'CANCELLED')
    .reduce((s, t) => s + t.amount, 0)
  const totalReceivable = realItems.filter((t) => t.situacao === 'RECEBER' && t.status !== 'CANCELLED')
    .reduce((s, t) => s + t.amount, 0)

  const pessoas = [...new Set(allItems.map((t) => t.pessoa).filter(Boolean))] as string[]
  const accounts = allItems
    .map((t) => t.account)
    .filter((a): a is NonNullable<typeof a> => Boolean(a))
    .filter((a, idx, arr) => arr.findIndex((x) => x.id === a.id) === idx)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  const handleDelete = (tx: Transaction) => {
    if (tx.installmentGroupId) {
      setDeleteTx(tx)
    } else {
      deleteMutation.mutate({ id: tx.id })
    }
  }

  const handlePay = (tx: Transaction) => {
    payMutation.mutate({ id: tx.id })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Lançamentos</h1>
        <div className="flex items-center gap-2">
          <ImportButton />
          <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'}>
            {showForm ? <><X size={15} className="mr-1" />Fechar</> : <><Plus size={15} className="mr-1" />Novo lançamento</>}
          </Button>
        </div>
      </div>

      {/* New Form */}
      {showForm && <NewTransactionForm onClose={() => setShowForm(false)} />}

      {/* Month Navigation */}
      <div className="flex items-center gap-3 justify-center">
        <button onClick={prevMonth} className="p-1.5 rounded-full hover:bg-muted transition-colors">
          <ChevronLeft size={20} />
        </button>
        <span className="font-semibold capitalize text-lg min-w-[160px] text-center">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1.5 rounded-full hover:bg-muted transition-colors">
          <ChevronRight size={20} />
        </button>
        {isFutureMonth && (
          <Badge variant="muted" className="text-xs">Previsão</Badge>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Total Gastos</p>
          <p className="text-lg font-bold text-destructive">{fmtMoney(totalSpent)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Receitas</p>
          <p className="text-lg font-bold text-green-600">{fmtMoney(totalIncome)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground">A Receber</p>
          <p className="text-lg font-bold text-sky-600">{fmtMoney(totalReceivable)}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Registros</p>
          <p className="text-lg font-bold">{realItems.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <select value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}
          className="border border-border rounded-md px-2 py-1.5 bg-background text-sm">
          <option value="">Todas as contas</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={pessoaFilter} onChange={(e) => setPessoaFilter(e.target.value)}
          className="border border-border rounded-md px-2 py-1.5 bg-background text-sm">
          <option value="">Todas as pessoas</option>
          {pessoas.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={situacaoFilter} onChange={(e) => setSituacaoFilter(e.target.value)}
          className="border border-border rounded-md px-2 py-1.5 bg-background text-sm">
          <option value="">Todas situações</option>
          <option value="NAO_PAGO">Não Pago</option>
          <option value="PAGO">Pago</option>
          <option value="RECEBER">A Receber</option>
        </select>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="border border-border rounded-md px-2 py-1.5 bg-background text-sm">
          <option value="">Todos os tipos</option>
          <option value="SINGLE">Único</option>
          <option value="INSTALLMENT">Parcelado</option>
          <option value="RECURRING">Recorrente</option>
          <option value="FIXED">Fixo</option>
          <option value="INCOME">Receita</option>
          <option value="SHARED">Compartilhado</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-border rounded-md px-2 py-1.5 bg-background text-sm">
          <option value="">Todos os status</option>
          <option value="PENDING">Pendente</option>
          <option value="PAID">Pago</option>
          <option value="CANCELLED">Cancelado</option>
        </select>
        <button onClick={() => setShowProjections(!showProjections)}
          className="flex items-center gap-1.5 px-2 py-1.5 border border-border rounded-md bg-background text-sm hover:bg-muted transition-colors">
          {showProjections ? <Eye size={15} /> : <EyeOff size={15} />}
          Projeções
        </button>
        {(accountFilter || pessoaFilter || situacaoFilter || typeFilter || statusFilter) && (
          <button onClick={() => { setAccountFilter(''); setPessoaFilter(''); setSituacaoFilter(''); setTypeFilter(''); setStatusFilter('') }}
            className="text-xs text-muted-foreground hover:text-foreground underline">
            Limpar filtros
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">
            Nenhum lançamento encontrado para este mês.
            {!showForm && (
              <> <button onClick={() => setShowForm(true)} className="text-primary underline ml-1">Adicionar</button></>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground text-xs">
                  <th className="py-2 px-3 text-left font-medium">Data</th>
                  <th className="py-2 px-3 text-left font-medium">Descrição</th>
                  <th className="py-2 px-3 text-left font-medium">Categoria</th>
                  <th className="py-2 px-3 text-left font-medium">Conta</th>
                  <th className="py-2 px-3 text-left font-medium">Tag</th>
                  <th className="py-2 px-3 text-left font-medium">
                    <span className="flex items-center gap-1"><Users size={13} />Pessoa</span>
                  </th>
                  <th className="py-2 px-3 text-left font-medium">Situação</th>
                  <th className="py-2 px-3 text-left font-medium">Vl. Total</th>
                  <th className="py-2 px-3 text-right font-medium">Valor</th>
                  <th className="py-2 px-3 text-left font-medium">Status</th>
                  <th className="py-2 px-3 text-left font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((tx) => (
                  <TxRow
                    key={tx.id}
                    tx={tx}
                    isFuture={tx.isFuture}
                    onEdit={setEditTx}
                    onDelete={handleDelete}
                    onPay={handlePay}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pessoa balance summary */}
      {pessoas.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5"><Users size={15} />Saldo por pessoa</h3>
          <div className="flex flex-wrap gap-3">
            {pessoas.map((pessoa) => {
              const txs = realItems.filter((t) => t.pessoa === pessoa && t.status !== 'CANCELLED')
              const receber = txs.filter((t) => t.situacao === 'RECEBER').reduce((s, t) => s + t.amount, 0)
              const aPagar = txs.filter((t) => t.situacao === 'NAO_PAGO').reduce((s, t) => s + t.amount, 0)
              const saldo = receber - aPagar
              return (
                <div key={pessoa} className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                  <span className="text-sm font-medium">{pessoa}</span>
                  <span className={`text-sm font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {fmtMoney(Math.abs(saldo))} {saldo >= 0 ? '↑ receber' : '↓ pagar'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editTx && <EditModal tx={editTx} onClose={() => setEditTx(null)} />}

      {/* Delete confirm */}
      {deleteTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <h2 className="font-semibold">Remover lançamento</h2>
            <p className="text-sm text-muted-foreground">
              Este lançamento faz parte de um grupo de parcelas. Deseja cancelar também as parcelas futuras?
            </p>
            <div className="flex gap-2">
              <Button variant="destructive" className="flex-1"
                onClick={() => { deleteMutation.mutate({ id: deleteTx.id, cancelFuture: true }); setDeleteTx(null) }}>
                Cancelar futuras
              </Button>
              <Button variant="secondary" className="flex-1"
                onClick={() => { deleteMutation.mutate({ id: deleteTx.id }); setDeleteTx(null) }}>
                Só esta
              </Button>
              <Button variant="secondary" onClick={() => setDeleteTx(null)}>
                <X size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
