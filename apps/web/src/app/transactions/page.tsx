'use client'
import { useState } from 'react'
import { TransactionList } from '@/components/transactions/TransactionList'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { Button } from '@/components/ui/button'
import { useUIStore } from '@/store/ui.store'
import { Plus, X } from 'lucide-react'

export default function TransactionsPage() {
  const { selectedMonth } = useUIStore()
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Lançamentos</h1>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'secondary' : 'primary'}>
          {showForm ? <><X size={16} /> Fechar</> : <><Plus size={16} /> Novo lançamento</>}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-base font-semibold mb-4">Novo lançamento</h2>
          <TransactionForm onSuccess={() => setShowForm(false)} />
        </div>
      )}

      <TransactionList month={selectedMonth} />
    </div>
  )
}
