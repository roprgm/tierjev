'use client'

import { SetPicker } from '@/components/SetPicker'
import { TierBoard } from '@/components/TierBoard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SETS } from '@/data/sets'
import { rank } from '@/lib/rank'
import type { Placement, TierSet } from '@/lib/types'
import { useState, type FormEvent } from 'react'

export function TierMaker() {
  const [set, setSet] = useState<TierSet>(SETS[0])
  const [criterion, setCriterion] = useState(set.criterion)
  const [placements, setPlacements] = useState<Placement[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function selectSet(next: TierSet) {
    setSet(next)
    setCriterion(next.criterion)
    setPlacements(null)
    setError(null)
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setPlacements(null)
    try {
      setPlacements((await rank({ criterion, items: set.items })).placements)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">tierjev</h1>
        <p className="text-sm text-muted-foreground">Pick a set, state a criterion, let Jev sort it into tiers.</p>
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
        <Button type="submit" disabled={loading} className="shrink-0">
          {loading ? 'Ranking…' : 'Rank'}
        </Button>
      </form>

      {error && <p className="animate-rise text-sm text-tier-s">{error}</p>}

      <TierBoard items={set.items} placements={placements} loading={loading} />

      <footer className="text-xs text-muted-foreground">
        Ranked by <a className="underline" href="https://vercel.com/ai-gateway/models/jev">Jev</a>, TypeSafe AI's classifier. Hover a tile for confidence.
      </footer>
    </main>
  )
}
