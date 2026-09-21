'use client'

import Link from 'next/link'
import { type FormEvent, useEffect, useState } from 'react'
import { NewSetDialog } from '@/components/NewSetDialog'
import { SetPicker } from '@/components/SetPicker'
import { TierBoard } from '@/components/TierBoard'
import { Toast, useToast } from '@/components/Toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/field'
import catalogue from '@/data/catalogue.json'
import { ApiError, createShare, rank } from '@/lib/api'
import { type Item, type Placement, type Share, TIERS, type Tier, type TierSet } from '@/lib/types'

// Pinned first; the rest keep the order they were generated in.
const PINNED = [
  'programming-languages',
  'ai-companies',
  'large-language-models',
  'tech-ceos',
  'frontend-frameworks',
  'cryptocurrencies',
]

// Trims generator verbosity: "… Tier List" suffixes and parenthetical asides in criteria.
const clean = (set: TierSet): TierSet => ({
  ...set,
  title: set.title.replace(/\s*tier list$/i, ''),
  criterion: set.criterion.replace(/\s*\(.*$/, '').trim(),
})

export const SETS: TierSet[] = [...(catalogue as TierSet[])].map(clean).sort((a, b) => {
  const ia = PINNED.indexOf(a.id)
  const ib = PINNED.indexOf(b.id)
  return (ia === -1 ? PINNED.length : ia) - (ib === -1 ? PINNED.length : ib)
})

function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState(initial)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(key)
      if (stored !== null) setValue(JSON.parse(stored))
    } catch {}
  }, [key])
  const save = (next: T) => {
    setValue(next)
    try {
      localStorage.setItem(key, JSON.stringify(next))
    } catch {}
  }
  return [value, save] as const
}

// Placeholder wallet kept in localStorage until real billing exists.
export function useCredits() {
  const [credits, save] = useStored('tierjev.credits', 10)
  return { credits, spend: (amount = 1) => save(Math.max(0, credits - amount)) }
}

// Sets the user created, kept in localStorage until accounts exist.
export function useCustomSets() {
  const [sets, save] = useStored<TierSet[]>('tierjev.sets', [])
  return {
    sets,
    add: (set: TierSet) => save([...sets.filter((s) => s.id !== set.id), set]),
    update: (set: TierSet) => save(sets.map((s) => (s.id === set.id ? set : s))),
    remove: (id: string) => save(sets.filter((s) => s.id !== id)),
    clear: () => save([]),
  }
}

// Seconds left until `until` (epoch ms), ticking once a second. 0 when null or elapsed.
export function useCountdown(until: number | null) {
  const left = () => (until ? Math.max(0, Math.ceil((until - Date.now()) / 1000)) : 0)
  const [seconds, setSeconds] = useState(left)
  useEffect(() => {
    setSeconds(left())
    if (!until) return
    const id = setInterval(() => setSeconds(left()), 1000)
    return () => clearInterval(id)
  }, [until])
  return seconds
}

export const formatCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const footerLink = 'cursor-pointer underline-offset-2 transition-colors hover:text-foreground hover:underline'

export function TierMaker() {
  const custom = useCustomSets()
  const sets = [...SETS, ...custom.sets]
  const [set, setSet] = useState<TierSet>(SETS[0])
  const [criterion, setCriterion] = useState(set.criterion)
  const [placements, setPlacements] = useState<Placement[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [manual, setManual] = useState(false)
  const lockSeconds = useCountdown(lockedUntil)
  const { credits, spend } = useCredits()
  const { message, notify } = useToast()
  const canDrag = manual || lockSeconds > 0

  // First paint shows a real ranking: the default set's criterion is always a cache hit.
  useEffect(() => {
    void submit()
  }, [])

  function fail(err: unknown) {
    const retryAfter = err instanceof ApiError ? err.retryAfter : undefined
    if (retryAfter) setLockedUntil(Date.now() + retryAfter * 1000)
    const text = err instanceof Error ? err.message : 'Something went wrong'
    notify(
      retryAfter ? `${text} Meanwhile, drag the tiles into tiers yourself.` : text,
      retryAfter ? 8000 : 5000,
    )
  }

  function selectSet(next: TierSet) {
    setSet(next)
    setCriterion(next.criterion)
    setPlacements([])
  }

  const isCustom = custom.sets.some((s) => s.id === set.id)

  function addSet(created: TierSet) {
    custom.add(created)
    selectSet(created)
    setCreating(false)
  }

  function deleteSet(id = set.id) {
    custom.remove(id)
    if (id === set.id) selectSet(SETS[0])
    notify('Set deleted')
  }

  function clearSets() {
    if (!confirm(`Delete your ${custom.sets.length} sets? This cannot be undone.`)) return
    custom.clear()
    if (isCustom) selectSet(SETS[0])
    notify('Your sets were deleted')
  }

  // Restyles a tile of the user's own set, on screen and in storage.
  function setIcon(name: string, look: Pick<Item, 'emoji' | 'color'>) {
    const updated = { ...set, items: set.items.map((it) => (it.name === name ? { ...it, ...look } : it)) }
    setSet(updated)
    custom.update(updated)
  }

  async function submit(e?: FormEvent) {
    e?.preventDefault()
    setLoading(true)
    try {
      const { placements: ranked } = await rank({ query: criterion, set })
      setPlacements([...ranked].sort((a, b) => (b.score ?? 0) - (a.score ?? 0)))
    } catch (err) {
      fail(err)
    } finally {
      setLoading(false)
    }
  }

  // Applies a drag result. Tiles that stay in their tier keep Jev's score; moved ones become manual.
  function applyLayout(layout: Record<Tier, string[]>) {
    const previous = new Map(placements.map((p) => [p.name, p]))
    setPlacements(
      TIERS.flatMap((tier) =>
        layout[tier].map((name) => {
          const before = previous.get(name)
          return before?.tier === tier ? before : { name, tier }
        }),
      ),
    )
  }

  async function share() {
    const body: Share = {
      title: set.title,
      criterion,
      items: set.items,
      placements,
      jev: placements.every((p) => p.confidence != null),
    }
    try {
      const { id } = await createShare(body)
      const url = `${location.origin}/s/${id}`
      if (navigator.share) return navigator.share({ title: criterion, url }).catch(() => {})
      await navigator.clipboard.writeText(url)
      notify('Link copied')
    } catch (err) {
      fail(err)
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">tierjev</h1>
          <p className="text-sm text-muted-foreground">
            Pick a set, state a criterion, let Jev sort it into tiers.
          </p>
        </div>
        <a
          href="https://github.com/roprgm/tierjev"
          aria-label="Source on GitHub"
          className="mt-1 text-muted-foreground transition-colors hover:text-foreground"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true">
            <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.4-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
          </svg>
          <span className="sr-only">GitHub</span>
        </a>
      </header>

      <SetPicker
        sets={sets}
        customIds={new Set(custom.sets.map((s) => s.id))}
        selected={set}
        onSelect={selectSet}
        onNew={() => setCreating(true)}
        onDelete={deleteSet}
        onClear={clearSets}
      />

      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={criterion}
          onChange={(e) => setCriterion(e.target.value)}
          placeholder="Rank by…"
          maxLength={200}
          required
        />
        <Button type="submit" disabled={loading || lockSeconds > 0} className="w-24 shrink-0 tabular-nums">
          {loading ? 'Ranking…' : lockSeconds > 0 ? formatCountdown(lockSeconds) : 'Rank'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={share}
          disabled={placements.length === 0}
          className="shrink-0"
        >
          Share
        </Button>
      </form>

      <TierBoard
        items={set.items}
        placements={placements}
        loading={loading}
        hint={
          placements.length === 0 && !loading
            ? 'Press Rank and Jev sorts these into tiers. Edit the criterion first if you like.'
            : undefined
        }
        onChange={canDrag ? applyLayout : undefined}
        onIcon={isCustom ? setIcon : undefined}
      />

      <footer className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>
          Ranked by{' '}
          <a className="underline" href="https://vercel.com/ai-gateway/models/jev">
            Jev
          </a>
          , TypeSafe AI's classifier. Hover a tile for confidence.{' '}
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            Privacy
          </Link>
        </span>
        <span className="flex shrink-0 gap-3">
          {isCustom && (
            <button type="button" onClick={() => deleteSet()} className={footerLink}>
              Delete set
            </button>
          )}
          {lockSeconds > 0 ? (
            <span>Drag tiles to sort while Jev rests</span>
          ) : (
            <button type="button" onClick={() => setManual((m) => !m)} className={footerLink}>
              {manual ? 'Done sorting' : 'Customize'}
            </button>
          )}
        </span>
      </footer>

      <NewSetDialog
        open={creating}
        credits={credits}
        onOpenChange={setCreating}
        onCreate={addSet}
        onSpend={() => spend(1)}
        onError={notify}
      />
      <Toast message={message} />
    </main>
  )
}
