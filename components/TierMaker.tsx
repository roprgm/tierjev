'use client'

import { type FormEvent, useState } from 'react'
import { GitHubIcon } from '@/components/GitHubIcon'
import { NewSetDialog } from '@/components/NewSetDialog'
import { SetPicker } from '@/components/SetPicker'
import { TierBoard } from '@/components/TierBoard'
import { Toast, useToast } from '@/components/Toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SETS } from '@/data/sets'
import { ApiError, createShare, rank } from '@/lib/api'
import { useCredits } from '@/lib/credits'
import type { Placement, Share, Tier, TierSet } from '@/lib/types'
import { formatCountdown, useCountdown } from '@/lib/use-countdown'

export function TierMaker() {
  const [sets, setSets] = useState<TierSet[]>(SETS)
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

  function addSet(created: TierSet, paid: boolean) {
    if (paid) spend(1)
    setSets((prev) => [...prev.filter((s) => s.id !== created.id), created])
    selectSet(created)
    setCreating(false)
  }

  // Lets a tile without an emoji take one, on the selected set and in the list.
  function setEmoji(name: string, emoji: string) {
    const updated = { ...set, items: set.items.map((it) => (it.name === name ? { ...it, emoji } : it)) }
    setSet(updated)
    setSets((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      setPlacements((await rank({ query: criterion, set })).placements)
    } catch (err) {
      fail(err)
    } finally {
      setLoading(false)
    }
  }

  function move(name: string, tier: Tier | null) {
    setPlacements((prev) => {
      const rest = prev.filter((p) => p.name !== name)
      return tier ? [...rest, { name, tier }] : rest
    })
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
          <GitHubIcon />
        </a>
      </header>

      <SetPicker sets={sets} selected={set} onSelect={selectSet} onNew={() => setCreating(true)} />

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
        poolLabel={placements.length > 0 ? 'Not applicable' : undefined}
        onMove={canDrag ? move : undefined}
        onEmoji={setEmoji}
      />

      <footer className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>
          Ranked by{' '}
          <a className="underline" href="https://vercel.com/ai-gateway/models/jev">
            Jev
          </a>
          , TypeSafe AI's classifier. Hover a tile for confidence.
        </span>
        {lockSeconds > 0 ? (
          <span className="shrink-0">Drag tiles to sort while Jev rests</span>
        ) : (
          <button
            type="button"
            onClick={() => setManual((m) => !m)}
            className="shrink-0 underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            {manual ? 'Done sorting' : 'Customize'}
          </button>
        )}
      </footer>

      <NewSetDialog
        open={creating}
        credits={credits}
        onOpenChange={setCreating}
        onCreate={addSet}
        onError={notify}
      />
      <Toast message={message} />
    </main>
  )
}
