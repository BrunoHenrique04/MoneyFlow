'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Goal, CreateGoalInput, GoalDepositInput } from '@moneyflow/shared'

function invalidateGoals(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['goals'] })
  qc.invalidateQueries({ queryKey: ['recommendations'] })
  qc.invalidateQueries({ queryKey: ['reports'] })
}

export function useGoals(status?: string) {
  const qs = status ? `?status=${status}` : ''
  return useQuery<Goal[]>({
    queryKey: ['goals', status],
    queryFn: () => api.get(`/goals${qs}`),
  })
}

export function useGoalDeposits(goalId: string) {
  return useQuery({
    queryKey: ['goal-deposits', goalId],
    queryFn: () => api.get(`/goals/${goalId}/deposits`),
    enabled: !!goalId,
  })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateGoalInput) => api.post('/goals', data),
    onSuccess: () => invalidateGoals(qc),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/goals/${id}`, data),
    onSuccess: () => invalidateGoals(qc),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => invalidateGoals(qc),
  })
}

export function useDepositGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: GoalDepositInput & { id: string }) =>
      api.post(`/goals/${id}/deposit`, body),
    onSuccess: () => invalidateGoals(qc),
  })
}

export function usePauseGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/goals/${id}/pause`, {}),
    onSuccess: () => invalidateGoals(qc),
  })
}

export function useResumeGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/goals/${id}/resume`, {}),
    onSuccess: () => invalidateGoals(qc),
  })
}
