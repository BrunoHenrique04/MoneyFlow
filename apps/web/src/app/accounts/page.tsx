'use client'
import { useState } from 'react'
import { useAccounts, useCreateAccount, useDeleteAccount } from '@/hooks/useAccounts'
import { Button } from '@/components/ui/button'
import { formatBRL } from '@/lib/utils'
import { Plus, Trash2 } from 'lucide-react'
import type { Account } from '@moneyflow/shared'

export default function AccountsPage() {
  const { data: accounts, isLoading } = useAccounts()
  const createAccount = useCreateAccount()
  const deleteAccount = useDeleteAccount()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [balance, setBalance] = useState('')

  const handleCreate = () => {
    if (!name.trim()) return
    createAccount.mutate(
      { name, balance: parseFloat(balance) || 0, color: '#6B7280', icon: 'bank' },
      { onSuccess: () => { setName(''); setBalance(''); setShowForm(false) } },
    )
  }

  if (isLoading) return <div className="text-muted-foreground text-sm py-8 text-center">Carregando...</div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Contas</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus size={16} /> Nova conta
        </Button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-border bg-card p-5 space-y-3">
          <h2 className="font-semibold text-sm">Nova conta</h2>
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Nome (ex: Nubank)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="border border-border rounded-md px-3 py-2 text-sm"
            />
            <input
              placeholder="Saldo inicial"
              type="number"
              step="0.01"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="border border-border rounded-md px-3 py-2 text-sm"
            />
          </div>
          <Button onClick={handleCreate} disabled={createAccount.isPending}>
            {createAccount.isPending ? 'Salvando...' : 'Criar conta'}
          </Button>
        </div>
      )}

      <div className="space-y-2">
        {accounts?.map((account: Account) => (
          <div key={account.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: account.color }}
              />
              <span className="font-medium text-sm">{account.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">{formatBRL(account.balance)}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteAccount.mutate(account.id)}
                disabled={deleteAccount.isPending}
              >
                <Trash2 size={14} className="text-muted-foreground" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
