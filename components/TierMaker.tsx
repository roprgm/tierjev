'use client'

import { type FormEvent, useState } from 'react'
import { flushSync } from 'react-dom'
import { GitHubIcon } from '@/components/GitHubIcon'
import { SetPicker } from '@/components/SetPicker'
import { TierBoard } from '@/components/TierBoard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SETS } from '@/data/sets'
import { rank } from '@/lib/rank'
import type { Placement, TierSet } from '@/lib/types'

// Animates DOM moves (pool → tier) where the browser supports it, otherwise applies them at once.
function transition(update: () => void) {
  if (!document.startViewTransition) return update()
  document.startViewTransition(() => flushSync(update))
}

export function TierMaker() {
  const [set, setSet] = useState<TierSet>(SETS[0])
  const [criterion, setCriterion] = useState(set.criterion)
  const [placements, setPlacements] = useState<Placement[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function selectSet(next: TierSet) {
    transition(() => {
      setSet(next)
      setCriterion(next.criterion)
      setPlacements(null)
      setError(null)
    })
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setPlacements(null)
    try {
      const { placements } = await rank({ criterion, items: set.items })
      transition(() => setPlacements(placements))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
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

      <SetPicker sets={SETS} selected={set} onSelect={selectSet} />

      <form onSubmit={submit} className="flex gap-2">
        <Input
          value={criterion}
          onChange={(e) => setCriterion(e.target.value)}
          placeholder="Rank by…"
          maxLength={200}
          required
        />
        <Button type="submit" disabled={loading} className="w-24 shrink-0">
          {loading ? 'Ranking…' : 'Rank'}
        </Button>
      </form>

      <div className="min-h-10">
        {error && (
          <p role="alert" className="rounded-lg border border-tier-s/40 bg-tier-s/10 px-3 py-2 text-sm">
            {error}
          </p>
        )}
      </div>

      <TierBoard items={set.items} placements={placements} loading={loading} />

      <footer className="text-xs text-muted-foreground">
        Ranked by{' '}
        <a className="underline" href="https://vercel.com/ai-gateway/models/jev">
          Jev
        </a>
        , TypeSafe AI's classifier. Hover a tile for confidence.
      </footer>
    </main>
  )
}
