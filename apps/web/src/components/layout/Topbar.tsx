'use client'
import { ChevronLeft, ChevronRight, Sun, Moon } from 'lucide-react'
import { useUIStore } from '@/store/ui.store'
import { formatMonth } from '@/lib/utils'

function addMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number)
  const date = new Date(y, m - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function Topbar() {
  const { selectedMonth, setSelectedMonth, theme, toggleTheme } = useUIStore()

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setSelectedMonth(addMonth(selectedMonth, -1))}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
        >
          <ChevronLeft size={17} />
        </button>
        <span className="text-sm font-medium capitalize w-36 text-center select-none">
          {formatMonth(selectedMonth)}
        </span>
        <button
          onClick={() => setSelectedMonth(addMonth(selectedMonth, 1))}
          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground transition-colors"
        >
          <ChevronRight size={17} />
        </button>
      </div>

      <button
        onClick={toggleTheme}
        className="p-2 rounded-xl hover:bg-accent text-muted-foreground transition-all duration-300"
        title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}
      >
        {theme === 'light'
          ? <Moon size={17} />
          : <Sun size={17} className="text-yellow-400" />
        }
      </button>
    </header>
  )
}
