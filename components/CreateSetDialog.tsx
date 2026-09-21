'use client'

import { Button } from '@/components/ui/button'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'

type Props = {
  open: boolean
  query: string
  credits: number
  busy: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function CreateSetDialog({ open, query, credits, busy, onOpenChange, onConfirm }: Props) {
  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>No set for that yet</DialogTitle>
        <DialogDescription>
          Nothing in the catalogue matches “{query}”. Create a new set for it? That costs 1 credit and you
          have {credits}.
        </DialogDescription>
        <div className="flex justify-end gap-2">
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button onClick={onConfirm} disabled={busy || credits < 1}>
            {busy ? 'Creating…' : 'Create for 1 credit'}
          </Button>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
