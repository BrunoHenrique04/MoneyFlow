import { cn } from '@/lib/utils'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-lg border border-border bg-card p-5 shadow-sm', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-sm font-medium text-muted-foreground', className)}>{children}</h3>
}

export function CardValue({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-2xl font-bold mt-1', className)}>{children}</p>
}
