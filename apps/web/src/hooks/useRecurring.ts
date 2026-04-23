'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { RecurringTemplate, CreateRecurringTemplateInput, UpdateRecurringTemplateInput } from '@moneyflow/shared'

export function useRecurringTemplates() {
  return useQuery<RecurringTemplate[]>({
    queryKey: ['recurring-templates'],
    queryFn: () => api.get('/recurring-templates'),
  })
}

export function useCreateRecurringTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRecurringTemplateInput) => api.post('/recurring-templates', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring-templates'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['recommendation'] })
    },
  })
}

export function useUpdateRecurringTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecurringTemplateInput }) =>
      api.patch(`/recurring-templates/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recurring-templates'] }),
  })
}

export function useDeactivateRecurringTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/recurring-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recurring-templates'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
    },
  })
}
