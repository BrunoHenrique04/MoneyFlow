'use client'
import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { HelpCircle } from 'lucide-react'

interface InfoTooltipProps {
  content: React.ReactNode
  side?: 'top' | 'bottom'
  className?: string
}

export function InfoTooltip({ content, side = 'top', className }: InfoTooltipProps) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [position, setPosition] = useState({ left: 0, top: 0 })
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return

    const updatePosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return

      setPosition({
        left: rect.left + rect.width / 2,
        top: side === 'top' ? rect.top - 8 : rect.bottom + 8,
      })
    }

    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)

    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, side])

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
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

      {mounted && open && createPortal(
        <div
          className={[
            'fixed z-[2147483647] w-64 bg-card text-foreground border border-border rounded-xl p-3 shadow-xl text-xs animate-fade-in',
            side === 'top' ? '-translate-x-1/2 -translate-y-full' : '-translate-x-1/2',
          ].join(' ')}
          style={{ left: `${position.left}px`, top: `${position.top}px` }}
        >
          {content}
          <span
            className={[
              'absolute left-1/2 -translate-x-1/2 w-2 h-2 bg-card border-border rotate-45',
              side === 'top' ? 'top-full -translate-y-1.5 border-r border-b' : 'bottom-full translate-y-1.5 border-l border-t',
            ].join(' ')}
          />
        </div>,
        document.body
      )}
    </div>
  )
}
