import { ItemTile } from '@/components/ItemTile'
import { TIERS, type Item, type Placement, type Tier } from '../../shared/types'

const COLORS: Record<Tier, string> = {
  S: 'bg-tier-s', A: 'bg-tier-a', B: 'bg-tier-b', C: 'bg-tier-c', D: 'bg-tier-d', F: 'bg-tier-f',
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
          <div key={tier} className="flex min-h-22 border-b last:border-b-0">
            <div className={`flex w-20 shrink-0 items-center justify-center text-2xl font-bold text-black/80 ${COLORS[tier]}`}>
              {tier}
            </div>
            <div className="flex flex-1 flex-wrap gap-1 bg-muted/40 p-1">
              {placed.map((p, i) => (
                <ItemTile
                  key={p.name}
                  item={byName.get(p.name) ?? { name: p.name }}
                  title={`${Math.round(p.confidence * 100)}% confident`}
                  className="animate-drop"
                  style={{ animationDelay: `${i * 40}ms` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      {pool.length > 0 && (
        <div className={`flex flex-wrap gap-1 transition-opacity ${loading ? 'animate-pulse opacity-60' : ''}`}>
          {pool.map((it) => <ItemTile key={it.name} item={it} />)}
        </div>
      )}
    </div>
  )
}
