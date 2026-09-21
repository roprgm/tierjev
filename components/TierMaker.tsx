'use client'

import { type FormEvent, useState } from 'react'
import { CreateSetDialog } from '@/components/CreateSetDialog'
import { GitHubIcon } from '@/components/GitHubIcon'
import { TierBoard } from '@/components/TierBoard'
import { Toast, useToast } from '@/components/Toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ApiError, createSet, createShare, rank } from '@/lib/api'
import { useCredits } from '@/lib/credits'
import type { Placement, Share, Tier, TierSet } from '@/lib/types'
import { formatCountdown, useCountdown } from '@/lib/use-countdown'

export function TierMaker() {
  const [query, setQuery] = useState('')
  const [set, setSet] = useState<TierSet | null>(null)
  const [placements, setPlacements] = useState<Placement[]>([])
  const [loading, setLoading] = useState(false)
  const [asking, setAsking] = useState(false)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [manual, setManual] = useState(false)
  const lockSeconds = useCountdown(lockedUntil)
  const { credits, spend } = useCredits()
  const { message, notify } = useToast()
  const canDrag = Boolean(set) && (manual || lockSeconds > 0)

  function fail(err: unknown) {
    const retryAfter = err instanceof ApiError ? err.retryAfter : undefined
    if (retryAfter) setLockedUntil(Date.now() + retryAfter * 1000)
    const text = err instanceof Error ? err.message : 'Something went wrong'
    notify(
      retryAfter ? `${text} Meanwhile, drag the tiles into tiers yourself.` : text,
      retryAfter ? 8000 : 5000,
    )
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await rank({ query })
      if ('needsSet' in res) return setAsking(true)
      setSet(res.set)
      setPlacements(res.placements)
    } catch (err) {
      fail(err)
    } finally {
      setLoading(false)
    }
  }

  async function createAndRank() {
    setLoading(true)
    try {
      const created = await createSet(query)
      spend(1)
      setAsking(false)
      setSet(created)
      setPlacements([])
      const res = await rank({ query, set: created })
      if (!('needsSet' in res)) setPlacements(res.placements)
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
    if (!set) return
    const body: Share = {
      title: set.title,
      criterion: query,
      items: set.items,
      placements,
      jev: placements.every((p) => p.confidence != null),
    }
    try {
      const { id } = await createShare(body)
      const url = `${location.origin}/s/${id}`
      if (navigator.share) return navigator.share({ title: query, url }).catch(() => {})
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
            Say what to rank. Jev picks the set and sorts it into tiers.
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

      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Best fruit for a picnic, first language to learn, pizza toppings that belong…"
          maxLength={200}
          required
          autoFocus
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

      <p className="h-5 text-sm text-muted-foreground">
        {set && (
          <>
            {set.emoji} {set.title} · {set.items.length} items
          </>
        )}
      </p>

      <TierBoard
        items={set?.items ?? []}
        placements={placements}
        loading={loading}
        poolLabel={placements.length > 0 ? 'Not applicable' : undefined}
        onMove={canDrag ? move : undefined}
      />

      <footer className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>
          Ranked by{' '}
          <a className="underline" href="https://vercel.com/ai-gateway/models/jev">
            Jev
          </a>
          , TypeSafe AI's classifier. Hover a tile for confidence.
        </span>
        {set &&
          (lockSeconds > 0 ? (
            <span className="shrink-0">Drag tiles to sort while Jev rests</span>
          ) : (
            <button
              type="button"
              onClick={() => setManual((m) => !m)}
              className="shrink-0 underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              {manual ? 'Done sorting' : 'Customize'}
            </button>
          ))}
      </footer>

      <CreateSetDialog
        open={asking}
        query={query}
        credits={credits}
        busy={loading}
        onOpenChange={setAsking}
        onConfirm={createAndRank}
      />
      <Toast message={message} />
    </main>
  )
}
