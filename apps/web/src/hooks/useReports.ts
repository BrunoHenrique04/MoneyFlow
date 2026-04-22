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
