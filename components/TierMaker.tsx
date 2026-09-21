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
import { useCustomSets } from '@/lib/custom-sets'
import type { Item, Placement, Share, Tier, TierSet } from '@/lib/types'
import { formatCountdown, useCountdown } from '@/lib/use-countdown'

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

  function deleteSet() {
    custom.remove(set.id)
    selectSet(SETS[0])
    notify('Set deleted')
  }

  // Restyles a tile of the user's own set, on screen and in storage.
  function setIcon(name: string, look: Pick<Item, 'emoji' | 'color'>) {
    const updated = { ...set, items: set.items.map((it) => (it.name === name ? { ...it, ...look } : it)) }
    setSet(updated)
    custom.update(updated)
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
        onMove={canDrag ? move : undefined}
        onIcon={isCustom ? setIcon : undefined}
      />

      <footer className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
        <span>
          Ranked by{' '}
          <a className="underline" href="https://vercel.com/ai-gateway/models/jev">
            Jev
          </a>
          , TypeSafe AI's classifier. Hover a tile for confidence.
        </span>
        <span className="flex shrink-0 gap-3">
          {isCustom && (
            <button type="button" onClick={deleteSet} className={footerLink}>
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
