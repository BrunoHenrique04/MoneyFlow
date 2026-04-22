'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Transaction, CreateTransactionInput, UpdateTransactionInput } from '@moneyflow/shared'

interface TransactionsResponse {
  items: Transaction[]
  total: number
  summary: {
    totalAmount: number
    essential: number
    nonEssential: number
    investment: number
  }
}

interface TransactionFilters {
  month?: string
  accountId?: string
  categoryId?: string
  type?: string
  status?: string
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

export function useCreateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateTransactionInput) => api.post('/transactions', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function useUpdateTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionInput }) =>
      api.patch(`/transactions/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function useDeleteTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, cancelFuture }: { id: string; cancelFuture?: boolean }) =>
      api.delete(`/transactions/${id}${cancelFuture ? '?cancelFuture=true' : ''}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['transactions'] }),
  })
}

export function usePayTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, paidAt }: { id: string; paidAt?: string }) =>
      api.patch(`/transactions/${id}/pay`, { paidAt }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
