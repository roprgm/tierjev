'use client'

import { Dialog } from '@base-ui/react/dialog'
import type { ComponentProps } from 'react'
import { ModalBackdrop, ModalSurface } from '@/components/ui/modal'
import { cn } from '@/lib/utils'

export const DialogRoot = Dialog.Root
export const DialogClose = Dialog.Close

export function DialogContent({
  className,
  ...props
}: Omit<Dialog.Popup.Props, 'className'> & { className?: string }) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop render={<ModalBackdrop />} />
      <Dialog.Popup render={<ModalSurface className={className} />} {...props} />
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
