import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

type Props = ComponentProps<'button'> & { variant?: 'default' | 'ghost' }

export function Button({ className, variant = 'default', ...props }: Props) {
  return (
    <button
      className={cn(
        'inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        variant === 'ghost' && 'hover:bg-muted',
        className,
      )}
      {...props}
    />
  )
}
