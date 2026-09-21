'use client'

import { type ComponentProps, type FormEvent, type ReactNode, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createSet } from '@/lib/api'
import { parseList } from '@/lib/list'
import type { TierSet } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  credits: number
  onOpenChange: (open: boolean) => void
  onCreate: (set: TierSet, paid: boolean) => void
  onError: (message: string) => void
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function NewSetDialog({ open, credits, onOpenChange, onCreate, onError }: Props) {
  const [mode, setMode] = useState<'ai' | 'list'>('ai')
  const [topic, setTopic] = useState('')
  const [title, setTitle] = useState('')
  const [list, setList] = useState('')
  const [busy, setBusy] = useState(false)
  const parsed = list.trim() ? parseList(list) : null
  const listError = parsed && 'error' in parsed ? parsed.error : null
  const listItems = parsed && 'items' in parsed ? parsed.items : null

  async function generate(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    try {
      onCreate(await createSet(topic), true)
      setTopic('')
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Could not create that set.')
    } finally {
      setBusy(false)
    }
  }

  function addList(e: FormEvent) {
    e.preventDefault()
    if (!parsed || 'error' in parsed) return
    onCreate(
      { id: `list-${slug(title)}`, title: title.trim(), emoji: '', criterion: '', items: parsed.items },
      false,
    )
    setTitle('')
    setList('')
  }

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>New set</DialogTitle>
        <DialogDescription>Let AI build one, or paste your own list.</DialogDescription>

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
          <ModeButton active={mode === 'ai'} onClick={() => setMode('ai')}>
            Generate with AI
          </ModeButton>
          <ModeButton active={mode === 'list'} onClick={() => setMode('list')}>
            Paste a list
          </ModeButton>
        </div>

        {mode === 'ai' ? (
          <form onSubmit={generate} className="space-y-5">
            <Field label="Topic">
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="90s sitcoms"
                maxLength={80}
                required
                autoFocus
              />
            </Field>
            <Actions hint={`1 credit · you have ${credits}`} disabled={busy || credits < 1}>
              {busy ? 'Generating…' : 'Create set'}
            </Actions>
          </form>
        ) : (
          <form onSubmit={addList} className="space-y-5">
            <Field label="Name">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Street food"
                maxLength={60}
                required
              />
            </Field>
            <Field label="Items, one per line" error={listError}>
              <Textarea
                value={list}
                onChange={(e) => setList(e.target.value)}
                placeholder={'Tacos\nArepas\nEmpanadas'}
                rows={7}
                required
                className={cn(listError && 'border-tier-s/60')}
              />
            </Field>
            <Actions hint={listItems ? `${listItems.length} items · free` : 'Free'} disabled={!listItems}>
              Create set
            </Actions>
          </form>
        )}
      </DialogContent>
    </DialogRoot>
  )
}

function ModeButton({ active, ...props }: { active: boolean } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'rounded-md py-1.5 font-medium transition-colors',
        active ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
      )}
      {...props}
    />
  )
}

function Field({ label, error, children }: { label: string; error?: string | null; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <span className="flex items-baseline justify-between text-xs font-medium text-muted-foreground">
        {label}
        {error && <span className="font-normal text-tier-s">{error}</span>}
      </span>
      {children}
    </div>
  )
}

function Actions({ hint, disabled, children }: { hint: string; disabled: boolean; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs whitespace-nowrap text-muted-foreground">{hint}</span>
      <div className="flex shrink-0 gap-2">
        <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
        <Button type="submit" disabled={disabled} className="whitespace-nowrap">
          {children}
        </Button>
      </div>
    </div>
  )
}
