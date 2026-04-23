'use client'
import { useState } from 'react'
import { HelpCircle } from 'lucide-react'

interface InfoTooltipProps {
  content: React.ReactNode
  side?: 'top' | 'bottom'
  className?: string
}

export function InfoTooltip({ content, side = 'top', className }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label="Informação"
        className={`text-muted-foreground/60 hover:text-muted-foreground transition-colors ${className ?? ''}`}
      >
        <HelpCircle size={12} />
      </button>

      {open && (
        <div
          className={[
            'absolute z-50 w-64 bg-popover border border-border rounded-xl p-3 shadow-xl text-xs text-muted-foreground animate-fade-in left-1/2 -translate-x-1/2',
            side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2',
          ].join(' ')}
        >
          {content}
          {/* arrow */}
          <span
            className={[
              'absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-popover border-border rotate-45',
              side === 'top' ? 'top-full -translate-y-1.5 border-r border-b' : 'bottom-full translate-y-1.5 border-l border-t',
            ].join(' ')}
          />
        </div>
      )}
    </div>
  )
}
