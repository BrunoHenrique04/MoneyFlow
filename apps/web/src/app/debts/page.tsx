'use client'
import { useState } from 'react'
import { OdsImport } from '@/components/debts/OdsImport'
import { DebtTable } from '@/components/debts/DebtTable'
import { useCreateDebt } from '@/hooks/useDebts'
import { Button } from '@/components/ui/button'
import { Plus, X } from 'lucide-react'

const SITUACOES = [
  { value: '', label: 'Todos' },
  { value: 'NAO_PAGO', label: 'Não Pago' },
  { value: 'PAGO', label: 'Pago' },
  { value: 'RECEBER', label: 'A Receber' },
]

export default function DebtsPage() {
  const [pessoaFilter, setPessoaFilter] = useState('')
  const [situacaoFilter, setSituacaoFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const create = useCreateDebt()

  const [form, setForm] = useState({
    pessoa: '',
    dataCompra: '',
    descricao: '',
    banco: '',
    valorAPagar: '',
    valorTotalCompra: '',
    situacao: 'NAO_PAGO' as 'NAO_PAGO' | 'PAGO' | 'RECEBER',
    dataVencimento: '',
  })

  const handleCreate = () => {
    if (!form.pessoa || !form.descricao || !form.valorAPagar) return
    create.mutate(
      {
        pessoa: form.pessoa,
        descricao: form.descricao,
        banco: form.banco || null,
        valorAPagar: parseFloat(form.valorAPagar.replace(',', '.')),
        valorTotalCompra: parseFloat((form.valorTotalCompra || form.valorAPagar).replace(',', '.')),
        situacao: form.situacao,
        dataCompra: form.dataCompra ? new Date(form.dataCompra).toISOString() : null,
        dataVencimento: form.dataVencimento ? new Date(form.dataVencimento).toISOString() : null,
      },
      { onSuccess: () => { setShowForm(false); setForm({ pessoa: '', dataCompra: '', descricao: '', banco: '', valorAPagar: '', valorTotalCompra: '', situacao: 'NAO_PAGO', dataVencimento: '' }) } },
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dívidas / Quem deve</h1>
          <p className="text-sm text-muted-foreground mt-1">Controle de quem te deve e o que você deve a outros</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? <><X size={16} /> Fechar</> : <><Plus size={16} /> Novo registro</>}
        </Button>
      </div>

      {/* Import ODS */}
      <OdsImport />

      {/* Manual form */}
      {showForm && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold text-sm">Novo registro</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-sm">
              Pessoa
              <input value={form.pessoa} onChange={e => setForm({ ...form, pessoa: e.target.value })}
                placeholder="Ju, Marcos, Bruno..." className="border border-border rounded-md px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Descrição
              <input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
                placeholder="Academia, Netflix..." className="border border-border rounded-md px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Banco / Pago por
              <input value={form.banco} onChange={e => setForm({ ...form, banco: e.target.value })}
                placeholder="Nu, C6, Marcos..." className="border border-border rounded-md px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Valor a pagar (R$)
              <input value={form.valorAPagar} onChange={e => setForm({ ...form, valorAPagar: e.target.value })}
                placeholder="-350,00" className="border border-border rounded-md px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Valor total da compra (R$)
              <input value={form.valorTotalCompra} onChange={e => setForm({ ...form, valorTotalCompra: e.target.value })}
                placeholder="1400,00 (÷4 pessoas)" className="border border-border rounded-md px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Situação
              <select value={form.situacao} onChange={e => setForm({ ...form, situacao: e.target.value as typeof form.situacao })}
                className="border border-border rounded-md px-3 py-2 bg-background text-sm">
                <option value="NAO_PAGO">Não Pago</option>
                <option value="PAGO">Pago</option>
                <option value="RECEBER">A Receber</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Data da compra
              <input type="date" value={form.dataCompra} onChange={e => setForm({ ...form, dataCompra: e.target.value })}
                className="border border-border rounded-md px-3 py-2 text-sm" />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              Data vencimento fatura
              <input type="date" value={form.dataVencimento} onChange={e => setForm({ ...form, dataVencimento: e.target.value })}
                className="border border-border rounded-md px-3 py-2 text-sm" />
            </label>
          </div>
          <Button onClick={handleCreate} disabled={create.isPending}>
            {create.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          value={pessoaFilter}
          onChange={e => setPessoaFilter(e.target.value)}
          placeholder="Filtrar por pessoa..."
          className="border border-border rounded-md px-3 py-1.5 text-sm w-48"
        />
        <div className="flex gap-1">
          {SITUACOES.map(s => (
            <button
              key={s.value}
              onClick={() => setSituacaoFilter(s.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${situacaoFilter === s.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-accent'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <DebtTable pessoaFilter={pessoaFilter} situacaoFilter={situacaoFilter} />
    </div>
  )
}
