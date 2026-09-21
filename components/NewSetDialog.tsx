'use client'

import { type FormEvent, useState } from 'react'
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
        <DialogDescription>Let AI build it for a credit, or paste your own list.</DialogDescription>
        <div className="flex gap-1 rounded-lg bg-muted p-1 text-sm">
          {(['ai', 'list'] as const).map((m) => (
            <button
              type="button"
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                'flex-1 rounded-md py-1 transition-colors',
                mode === m && 'bg-background shadow-xs',
              )}
            >
              {m === 'ai' ? 'Generate with AI' : 'Paste a list'}
            </button>
          ))}
        </div>

        {mode === 'ai' ? (
          <form onSubmit={generate} className="space-y-3">
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="90s sitcoms, Argentine rock bands, pasta shapes…"
              maxLength={80}
              required
              autoFocus
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">You have {credits} credits</span>
              <div className="flex gap-2">
                <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
                <Button type="submit" disabled={busy || credits < 1}>
                  {busy ? 'Generating…' : 'Generate · 1 credit'}
                </Button>
              </div>
            </div>
          </form>
        ) : (
          <form onSubmit={addList} className="space-y-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Set name"
              maxLength={60}
              required
            />
            <Textarea
              value={list}
              onChange={(e) => setList(e.target.value)}
              placeholder={'One item per line\nPizza\nSushi\nTacos'}
              rows={8}
              required
            />
            <div className="flex items-center justify-between gap-2">
              <span
                className={cn(
                  'text-xs',
                  parsed && 'error' in parsed ? 'text-tier-s' : 'text-muted-foreground',
                )}
              >
                {parsed ? ('error' in parsed ? parsed.error : `${parsed.items.length} items`) : 'Free'}
              </span>
              <div className="flex gap-2">
                <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
                <Button type="submit" disabled={!parsed || 'error' in parsed}>
                  Add set
                </Button>
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </DialogRoot>
  )
}
