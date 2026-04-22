'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { formatMonth } from '@/lib/utils'

function addMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const date = new Date(y, m - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function Topbar() {
  const { selectedMonth, setSelectedMonth } = useUIStore()

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSelectedMonth(addMonth(selectedMonth, -1))}
          className="p-1 rounded hover:bg-accent text-muted-foreground"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="text-sm font-medium capitalize w-36 text-center">
          {formatMonth(selectedMonth)}
        </span>
        <button
          onClick={() => setSelectedMonth(addMonth(selectedMonth, 1))}
          className="p-1 rounded hover:bg-accent text-muted-foreground"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </header>
  )
}
