import type { TierSet } from '@/lib/types'
import { cn } from '@/lib/utils'

type Props = {
  sets: TierSet[]
  customIds: Set<string>
  selected: TierSet
  onSelect: (set: TierSet) => void
  onNew: () => void
  onDelete: (id: string) => void
  onClear: () => void
}

const chip =
  'flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-[color,background-color,border-color,transform] duration-200 hover:bg-muted active:scale-95'

export function SetPicker({ sets, customIds, selected, onSelect, onNew, onDelete, onClear }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {sets.map((set) => {
        const active = set.id === selected.id
        return (
          <span key={set.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelect(set)}
              className={cn(
                chip,
                customIds.has(set.id) && 'pr-7',
                active && 'border-foreground bg-foreground text-background hover:bg-foreground',
              )}
            >
              <span>{set.emoji || '•'}</span>
              {set.title}
            </button>
            {customIds.has(set.id) && (
              <button
                type="button"
                aria-label={`Delete ${set.title}`}
                onClick={() => onDelete(set.id)}
                className={cn(
                  'absolute top-1/2 right-1.5 size-5 -translate-y-1/2 cursor-pointer rounded-full text-xs leading-none transition-opacity',
                  'opacity-60 group-hover:opacity-100 focus-visible:opacity-100',
                  active
                    ? 'text-background hover:bg-background/20'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                ×
              </button>
            )}
          </span>
        )
      })}
      <button
        type="button"
        onClick={onNew}
        className={cn(chip, 'border-dashed text-muted-foreground hover:text-foreground')}
      >
        + New set
      </button>
      {customIds.size > 1 && (
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer px-1 text-xs text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Clear mine
        </button>
      )}
    </div>
  )
}
