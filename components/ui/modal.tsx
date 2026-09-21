import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export function ModalBackdrop({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 min-h-dvh bg-black/60 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  )
}

export function ModalSurface({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-3rem)] w-96 max-w-[calc(100vw-3rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-xl border bg-control p-5 text-foreground shadow-xl shadow-black/40 ring-1 ring-black/30 outline-none',
        'transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none',
        className,
      )}
      {...props}
    />
  )
}
