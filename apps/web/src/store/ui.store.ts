import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  selectedMonth: string
  setSelectedMonth: (month: string) => void
  sidebarOpen: boolean
  toggleSidebar: () => void
  theme: 'light' | 'dark'
  toggleTheme: () => void
}

function currentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      selectedMonth: currentMonth(),
      setSelectedMonth: (month) => set({ selectedMonth: month }),
      sidebarOpen: true,
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      theme: 'light',
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    }),
    {
      name: 'moneyflow-ui',
      partialize: (s) => ({ theme: s.theme }),
    },
  ),
)
