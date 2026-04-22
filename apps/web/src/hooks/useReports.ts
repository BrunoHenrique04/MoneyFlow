'use client'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useMonthlyReport(month?: string) {
  const qs = month ? `?month=${month}` : ''
  return useQuery({
    queryKey: ['reports', 'monthly', month],
    queryFn: () => api.get(`/reports/monthly${qs}`),
  })
}

export function useInstallmentTimeline(months = 6) {
  return useQuery({
    queryKey: ['reports', 'timeline', months],
    queryFn: () => api.get(`/reports/installment-timeline?months=${months}`),
  })
}

export function useBudgetTimeline(future = 9, past = 3) {
  return useQuery({
    queryKey: ['reports', 'budget-timeline', future, past],
    queryFn: () => api.get(`/reports/budget-timeline?future=${future}&past=${past}`),
  })
}

export function useRecommendation() {
  return useQuery({
    queryKey: ['recommendations', 'current'],
    queryFn: () => api.get('/recommendations/current'),
  })
}

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: () => api.get('/user'),
  })
}
