'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Transaction, CreateTransactionInput, UpdateTransactionInput } from '@moneyflow/shared'

export interface TransactionSummary {
  totalAmount: number
  essential: number
  nonEssential: number
  investment: number
  receivable: number
  porPessoa: { pessoa: string; saldo: number }[]
}

export interface TransactionsResponse {
  items: Transaction[]
  total: number
  summary: TransactionSummary
}

export interface ProjectionsResponse {
  items: (Transaction & { isFuture: boolean })[]
  isPureProjection: boolean
}

export interface TransactionFilters {
  month?: string
  accountId?: string
  categoryId?: string
  type?: string
  status?: string
  utilityTag?: string
  pessoa?: string
  situacao?: string
}

export function useTransactions(filters: TransactionFilters = {}) {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v) })
  const qs = params.toString()

  return useQuery<TransactionsResponse>({
    queryKey: ['transactions', filters],
    queryFn: () => api.get(`/transactions${qs ? `?${qs}` : ''}`),
  })
}

export function useProjections(month: string) {
  return useQuery<ProjectionsResponse>({
    queryKey: ['transactions', 'projections', month],
    queryFn: () => api.get(`/transactions/projections?month=${month}`),
  })
}

function invalidateBudget(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['transactions'] })
  qc.invalidateQueries({ queryKey: ['recommendations'] })
  qc.invalidateQueries({ queryKey: ['reports'] })
}

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTransactionInput) => api.post('/transactions', data),
    onSuccess: () => invalidateBudget(qc),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionInput }) =>
      api.patch(`/transactions/${id}`, data),
    onSuccess: () => invalidateBudget(qc),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cancelFuture }: { id: string; cancelFuture?: boolean }) =>
      api.delete(`/transactions/${id}${cancelFuture ? '?cancelFuture=true' : ''}`),
    onSuccess: () => invalidateBudget(qc),
  })
}

export function usePayTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paidAt }: { id: string; paidAt?: string }) =>
      api.patch(`/transactions/${id}/pay`, { paidAt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts'] })
      invalidateBudget(qc)
    },
  })
}

export function useImportTransactions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData()
      form.append('file', file)
      const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
      const apiKey = process.env.NEXT_PUBLIC_API_KEY ?? 'dev-secret-key'
      const res = await fetch(`${base}/api/v1/transactions/import`, {
        method: 'POST',
        body: form,
        headers: { 'X-API-Key': apiKey },
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error?.message ?? 'Erro ao importar')
      return json.data as { imported: number }
    },
    onSuccess: () => invalidateBudget(qc),
  })
}

export function useExportTransactions() {
  return useMutation({
    mutationFn: async (month?: string) => {
      const base   = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
      const apiKey = process.env.NEXT_PUBLIC_API_KEY ?? 'dev-secret-key'
      const qs     = month ? `?month=${month}` : ''
      const res    = await fetch(`${base}/api/v1/transactions/export${qs}`, {
        headers: { 'X-API-Key': apiKey },
      })
      if (!res.ok) throw new Error('Erro ao exportar')
      const blob     = await res.blob()
      const url      = URL.createObjectURL(blob)
      const a        = document.createElement('a')
      a.href         = url
      a.download     = month ? `lancamentos-${month}.xlsx` : 'lancamentos.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    },
  })
}

export function useMigrateDebts() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/transactions/migrate-debts', {}),
    onSuccess: () => invalidateBudget(qc),
  })
}
