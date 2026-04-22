'use client'
import { useState } from 'react'
import { useUser } from '@/hooks/useReports'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import type { User } from '@moneyflow/shared'

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
    <div className="max-w-xl mx-auto space-y-6">
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
    </div>
  )
}
