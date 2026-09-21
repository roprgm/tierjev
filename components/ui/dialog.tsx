'use client'

import { Dialog } from '@base-ui/react/dialog'
import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'

export const DialogRoot = Dialog.Root
export const DialogClose = Dialog.Close

const backdrop =
  'fixed inset-0 z-50 min-h-dvh bg-black/60 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 motion-reduce:transition-none'
const surface =
  'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-3rem)] w-[28rem] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-5 overflow-y-auto rounded-2xl border bg-control p-6 text-foreground shadow-xl shadow-black/40 ring-1 ring-black/30 outline-none transition-[scale,opacity] duration-150 ease-out data-ending-style:scale-[0.98] data-ending-style:opacity-0 data-starting-style:scale-[0.98] data-starting-style:opacity-0 motion-reduce:transition-none'

export function DialogContent({
  className,
  ...props
}: Omit<Dialog.Popup.Props, 'className'> & { className?: string }) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className={backdrop} />
      <Dialog.Popup className={cn(surface, className)} {...props} />
    </Dialog.Portal>
  )
}

export function DialogTitle({ className, ...props }: ComponentProps<typeof Dialog.Title>) {
  return <Dialog.Title className={cn('text-lg font-semibold tracking-tight', className)} {...props} />
}

export function DialogDescription({ className, ...props }: ComponentProps<typeof Dialog.Description>) {
  return (
    <Dialog.Description
      className={cn('-mt-3 text-sm leading-5 text-muted-foreground', className)}
      {...props}
    />
  )
}
