'use client'

import { type ComponentProps, type FormEvent, type ReactNode, useState } from 'react'
import { IconPicker } from '@/components/IconPicker'
import { ItemIcon } from '@/components/ItemTile'
import { Button } from '@/components/ui/button'
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogRoot,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input, Textarea } from '@/components/ui/field'
import { ApiError, pickColors, streamSet } from '@/lib/api'
import { MAX_ITEMS } from '@/lib/parse'
import type { Item, TierSet } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  credits: number
  onOpenChange: (open: boolean) => void
  onCreate: (set: TierSet) => void
  onSpend: () => void
  onError: (message: string) => void
}

type Draft = { id: string; title: string; emoji: string; criterion: string; items: Item[] }

const MIN_ITEMS = 3

// Turns a pasted "one item per line" list into items, or explains the first problem found.
function parseList(text: string): { items: Item[] } | { error: string } {
  const lines = text.split('\n')
  const items: Item[] = []
  const seen = new Set<string>()
  for (const [i, raw] of lines.entries()) {
    const line = raw.trim()
    const at = `Line ${i + 1}`
    if (!line) {
      if (i === lines.length - 1) continue
      return { error: `${at} is empty.` }
    }
    if (line.includes(',')) return { error: `${at} has a comma. Put one item per line.` }
    if (line.length > 40) return { error: `${at} is longer than 40 characters.` }
    const key = line.toLowerCase()
    if (seen.has(key)) return { error: `${at} repeats "${line}".` }
    seen.add(key)
    items.push({ name: line })
  }
  if (items.length < MIN_ITEMS) return { error: `Add at least ${MIN_ITEMS} items.` }
  if (items.length > MAX_ITEMS) return { error: `Keep it to ${MAX_ITEMS} items or fewer.` }
  return { items }
}

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function NewSetDialog({ open, credits, onOpenChange, onCreate, onSpend, onError }: Props) {
  const [mode, setMode] = useState<'ai' | 'list'>('ai')
  const [topic, setTopic] = useState('')
  const [title, setTitle] = useState('')
  const [list, setList] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const [streaming, setStreaming] = useState(false)
  const parsed = list.trim() ? parseList(list) : null
  const listError = parsed && 'error' in parsed ? parsed.error : null
  const listItems = parsed && 'items' in parsed ? parsed.items : null

  // Jev colours arrive after the names; merge them into whatever the user has not removed yet.
  async function colorize(setTitle: string, items: Item[]) {
    try {
      const { colors } = await pickColors(
        setTitle,
        items.map((it) => it.name),
      )
      setDraft(
        (d) =>
          d && {
            ...d,
            items: d.items.map((it) =>
              it.color || !colors[it.name] ? it : { ...it, color: colors[it.name] },
            ),
          },
      )
    } catch {}
  }

  async function generate(e: FormEvent) {
    e.preventDefault()
    setStreaming(true)
    setDraft({ id: `custom-${slug(topic)}`, title: topic, emoji: '', criterion: '', items: [] })
    onSpend()
    try {
      const set = await streamSet(topic, (partial) =>
        setDraft((d) => ({
          id: d?.id ?? `custom-${slug(topic)}`,
          title: partial.title ?? topic,
          emoji: partial.emoji ?? '',
          criterion: partial.criterion ?? '',
          items: (partial.items ?? []).flatMap((it) =>
            it?.name ? [{ name: it.name, emoji: it.emoji }] : [],
          ),
        })),
      )
      setDraft(set)
      setStreaming(false)
      void colorize(set.title, set.items)
    } catch (err) {
      setStreaming(false)
      setDraft(null)
      onError(err instanceof ApiError ? err.message : 'Could not create that set.')
    }
  }

  function preview(e: FormEvent) {
    e.preventDefault()
    if (!listItems) return
    const next = {
      id: `list-${slug(title)}`,
      title: title.trim(),
      emoji: '',
      criterion: '',
      items: listItems,
    }
    setDraft(next)
    void colorize(next.title, next.items)
  }

  function create() {
    if (!draft) return
    onCreate(draft)
    setDraft(null)
    setTopic('')
    setTitle('')
    setList('')
  }

  const updateItem = (name: string, patch: Partial<Item>) =>
    setDraft((d) => d && { ...d, items: d.items.map((it) => (it.name === name ? { ...it, ...patch } : it)) })
  const removeItem = (name: string) =>
    setDraft((d) => d && { ...d, items: d.items.filter((it) => it.name !== name) })

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {draft ? (
          <>
            <DialogTitle>
              {draft.emoji} {draft.title}
            </DialogTitle>
            <DialogDescription>
              {streaming
                ? 'Writing the list…'
                : `${draft.items.length} items. Remove any, or click an icon to restyle it.`}
            </DialogDescription>
            <ul className="h-72 divide-y overflow-y-auto rounded-lg border bg-muted/40 shadow-groove">
              {draft.items.map((it) => (
                <li key={it.name} className="flex items-center gap-3 px-3 py-1.5 text-sm">
                  <IconPicker
                    value={it}
                    onChange={(look) => updateItem(it.name, look)}
                    trigger={
                      <button
                        type="button"
                        aria-label="Change icon"
                        className="cursor-pointer rounded-full ring-ring ring-offset-2 ring-offset-control hover:ring-2"
                      >
                        <ItemIcon item={it} size="sm" />
                      </button>
                    }
                  />
                  <span className="flex-1 truncate">{it.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${it.name}`}
                    onClick={() => removeItem(it.name)}
                    className="cursor-pointer rounded px-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs whitespace-nowrap text-muted-foreground">
                {streaming ? 'DeepSeek is writing, Jev colours next' : 'Colours by Jev'}
              </span>
              <div className="flex shrink-0 gap-2">
                <Button variant="ghost" onClick={() => setDraft(null)} disabled={streaming}>
                  Back
                </Button>
                <Button
                  onClick={create}
                  disabled={streaming || draft.items.length < 3}
                  className="whitespace-nowrap"
                >
                  Create set
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <DialogTitle>New set</DialogTitle>
            <DialogDescription>
              Let AI build one, or paste your own list. You curate it before it is created.
            </DialogDescription>

            <div
              role="tablist"
              className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm shadow-groove"
            >
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
                  DeepSeek writes 20 to 30 items with emoji, Jev picks a colour for each. Sets are saved on
                  this device.
                </p>
              </form>
              <form
                id="new-set-list"
                onSubmit={preview}
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
                  disabled={mode === 'ai' ? credits < 1 : !listItems}
                  className="whitespace-nowrap"
                >
                  {mode === 'ai' ? 'Generate' : 'Preview'}
                </Button>
              </div>
            </div>
          </>
        )}
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
