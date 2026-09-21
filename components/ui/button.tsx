import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

type Props = ComponentProps<'button'> & { variant?: 'default' | 'ghost' }

export function Button({ className, variant = 'default', ...props }: Props) {
  return (
    <button
      className={cn(
        'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-[background-color,box-shadow,transform] duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
        variant === 'default' &&
          'bg-primary text-primary-foreground shadow-ridge hover:bg-primary/90 active:shadow-groove active:translate-y-px',
        variant === 'ghost' &&
          'text-muted-foreground hover:bg-muted hover:text-foreground active:bg-muted/70',
        className,
      )}
      {...props}
    />
  )
}
