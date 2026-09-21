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

        <div role="tablist" className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm shadow-groove">
          <ModeButton active={mode === 'ai'} onClick={() => setMode('ai')}>
            Generate with AI
          </ModeButton>
          <ModeButton active={mode === 'list'} onClick={() => setMode('list')}>
            Paste a list
          </ModeButton>
        </div>

        {/* Both forms share one grid cell so the dialog keeps the taller one's height. */}
        <div className="grid">
          <form
            id="new-set-ai"
            onSubmit={generate}
            className={cn('space-y-5 [grid-area:1/1]', mode !== 'ai' && 'invisible')}
          >
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
            <p className="text-xs leading-5 text-muted-foreground">
              DeepSeek writes 20 to 30 items with emoji. Sets are saved on this device.
            </p>
          </form>
          <form
            id="new-set-list"
            onSubmit={addList}
            className={cn('space-y-5 [grid-area:1/1]', mode !== 'list' && 'invisible')}
          >
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
          </form>
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs whitespace-nowrap text-muted-foreground">
            {mode === 'ai'
              ? `1 credit · you have ${credits}`
              : listItems
                ? `${listItems.length} items · free`
                : 'Free'}
          </span>
          <div className="flex shrink-0 gap-2">
            <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
            <Button
              type="submit"
              form={mode === 'ai' ? 'new-set-ai' : 'new-set-list'}
              disabled={mode === 'ai' ? busy || credits < 1 : !listItems}
              className="whitespace-nowrap"
            >
              {busy ? 'Generating…' : 'Create set'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}

function ModeButton({ active, ...props }: { active: boolean } & ComponentProps<'button'>) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      className={cn(
        'cursor-pointer rounded-md py-1.5 font-medium transition-[background-color,color,box-shadow] duration-150',
        active
          ? 'bg-primary text-primary-foreground shadow-ridge'
          : 'text-muted-foreground hover:text-foreground',
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
