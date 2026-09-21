import { ItemTile } from '@/components/ItemTile'
import { type Item, type Placement, TIERS, type Tier } from '@/lib/types'

const COLORS: Record<Tier, string> = {
  S: 'bg-tier-s',
  A: 'bg-tier-a',
  B: 'bg-tier-b',
  C: 'bg-tier-c',
  D: 'bg-tier-d',
  F: 'bg-tier-f',
}

type Props = { items: Item[]; placements: Placement[] | null; loading: boolean }

export function TierBoard({ items, placements, loading }: Props) {
  const byName = new Map(items.map((it) => [it.name, it]))
  const rows = TIERS.map((tier) => ({
    tier,
    placed: (placements ?? []).filter((p) => p.tier === tier).sort((a, b) => b.score - a.score),
  }))
  const pool = placements ? [] : items

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border">
        {rows.map(({ tier, placed }) => (
          <div key={tier} className="flex h-22 border-b last:border-b-0">
            <div
              className={`flex w-14 shrink-0 items-center justify-center text-2xl font-bold sm:w-20 text-black/80 ${COLORS[tier]}`}
            >
              {tier}
            </div>
            <div className="scrollbar-none flex min-w-0 flex-1 gap-1 overflow-x-auto overscroll-x-contain bg-muted/40 p-1">
              {placed.map((p) => (
                <ItemTile
                  key={p.name}
                  item={byName.get(p.name) ?? { name: p.name }}
                  title={`${Math.round(p.confidence * 100)}% confident`}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {pool.length > 0 && (
        <div className="flex min-h-20 flex-wrap gap-1">
          {pool.map((it) => (
            <ItemTile key={it.name} item={it} className={loading ? 'animate-pulse' : undefined} />
          ))}
        </div>
      )}
    </div>
  )
}
