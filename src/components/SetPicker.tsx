import { cn } from '@/lib/utils'
import type { TierSet } from '../../shared/types'

type Props = { sets: TierSet[]; selected: TierSet; onSelect: (set: TierSet) => void }

export function SetPicker({ sets, selected, onSelect }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {sets.map((set) => (
        <button
          key={set.id}
          onClick={() => onSelect(set)}
          className={cn(
            'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-muted',
            set.id === selected.id && 'border-foreground bg-foreground text-background hover:bg-foreground',
          )}
        >
          <span>{set.emoji}</span>
          {set.title}
        </button>
      ))}
    </div>
  )
}
