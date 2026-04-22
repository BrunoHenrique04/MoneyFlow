import { create } from 'zustand'

interface UIState {
  selectedMonth: string
  setSelectedMonth: (month: string) => void
  sidebarOpen: boolean
  toggleSidebar: () => void
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const useUIStore = create<UIState>((set) => ({
  selectedMonth: currentMonth(),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}))
