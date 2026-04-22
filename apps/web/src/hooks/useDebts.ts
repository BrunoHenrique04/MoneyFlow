'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CreateDebtInput, UpdateDebtInput } from '@moneyflow/shared'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? 'dev-secret-key'

export function useDebts(filters: { pessoa?: string; situacao?: string } = {}) {
  const params = new URLSearchParams()
  if (filters.pessoa) params.set('pessoa', filters.pessoa)
  if (filters.situacao) params.set('situacao', filters.situacao)
  const qs = params.toString()

  return useQuery({
    queryKey: ['debts', filters],
    queryFn: () => api.get(`/debts${qs ? `?${qs}` : ''}`),
  })
}

export function useCreateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateDebtInput) => api.post('/debts', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  })
}

export function useUpdateDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDebtInput }) =>
      api.patch(`/debts/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  })
}

export function useDeleteDebt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/debts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  })
}

export function useImportOds() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API_URL}/api/v1/debts/import`, {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY },
        body: form,
      })
      const json = await res.json()
      if (!res.ok || json.error) throw new Error(json.error?.message ?? 'Erro ao importar')
      return json.data as { imported: number }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['debts'] }),
  })
}
