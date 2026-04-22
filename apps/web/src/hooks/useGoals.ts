'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Goal, CreateGoalInput } from '@moneyflow/shared'

export function useGoals(status?: string) {
  const qs = status ? `?status=${status}` : ''
  return useQuery<Goal[]>({
    queryKey: ['goals', status],
    queryFn: () => api.get(`/goals${qs}`),
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGoalInput) => api.post('/goals', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateGoalInput> }) =>
      api.patch(`/goals/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}

export function useDepositGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.post(`/goals/${id}/deposit`, { amount }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals'] }),
  })
}
