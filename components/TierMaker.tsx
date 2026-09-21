'use client'

import { type FormEvent, useState } from 'react'
import { CreateSet } from '@/components/CreateSet'
import { GitHubIcon } from '@/components/GitHubIcon'
import { SetPicker } from '@/components/SetPicker'
import { TierBoard } from '@/components/TierBoard'
import { Toast, useToast } from '@/components/Toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SETS } from '@/data/sets'
import { RankError, rank } from '@/lib/rank'
import type { Placement, Share, Tier, TierSet } from '@/lib/types'
import { formatCountdown, useCountdown } from '@/lib/use-countdown'

export function TierMaker() {
  const [sets, setSets] = useState<TierSet[]>(SETS)
  const [set, setSet] = useState<TierSet>(SETS[0])
  const [criterion, setCriterion] = useState(set.criterion)
  const [placements, setPlacements] = useState<Placement[]>([])
  const [loading, setLoading] = useState(false)
  const [lockedUntil, setLockedUntil] = useState<number | null>(null)
  const [manual, setManual] = useState(false)
  const lockSeconds = useCountdown(lockedUntil)
  const { message, notify } = useToast()
  const canDrag = manual || lockSeconds > 0

  function selectSet(next: TierSet) {
    setSet(next)
    setCriterion(next.criterion)
    setPlacements([])
  }

  function move(name: string, tier: Tier | null) {
    setPlacements((prev) => {
      const rest = prev.filter((p) => p.name !== name)
      return tier ? [...rest, { name, tier }] : rest
    })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await rank({ criterion, items: set.items })
      setPlacements(res.placements)
    } catch (err) {
      const retryAfter = err instanceof RankError ? err.retryAfter : undefined
      if (retryAfter) setLockedUntil(Date.now() + retryAfter * 1000)
      const text = err instanceof Error ? err.message : 'Something went wrong'
      notify(
        retryAfter ? `${text} Meanwhile, drag the tiles into tiers yourself.` : text,
        retryAfter ? 8000 : 5000,
      )
    } finally {
      setLoading(false)
    }
  }

  async function share() {
    const body: Share = {
      title: set.title,
      criterion,
      items: set.items,
      placements,
      jev: placements.every((p) => p.confidence != null),
    }
    const res = await fetch('/api/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) return notify(data.error ?? 'Could not share')
    const url = `${location.origin}/s/${data.id}`
    if (navigator.share) return navigator.share({ title: criterion, url }).catch(() => {})
    await navigator.clipboard.writeText(url)
    notify('Link copied')
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

      <SetPicker sets={sets} selected={set} onSelect={selectSet} />

      <CreateSet
        onCreate={(created) => {
          setSets((prev) => [...prev.filter((s) => s.id !== created.id), created])
          selectSet(created)
        }}
        onError={notify}
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
      <Toast message={message} />
    </main>
  )
}
