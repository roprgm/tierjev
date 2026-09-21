'use client'

import { useEffect, useRef } from 'react'
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
  'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-[color,background-color,border-color,transform] duration-200 hover:bg-muted active:scale-95'

// One scrolling row: new-set action first, then the user's own sets, then the catalogue.
export function SetPicker({ sets, customIds, selected, onSelect, onNew, onDelete, onClear }: Props) {
  const rowRef = useRef<HTMLDivElement>(null)
  const ordered = [...sets].sort((a, b) => Number(customIds.has(b.id)) - Number(customIds.has(a.id)))

  useEffect(() => {
    rowRef.current
      ?.querySelector<HTMLElement>('[aria-current="true"]')
      ?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' })
  }, [])

  return (
    <div ref={rowRef} className="scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-1">
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
          className="shrink-0 cursor-pointer px-1 text-xs whitespace-nowrap text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
        >
          Clear mine
        </button>
      )}
      {ordered.map((set) => {
        const active = set.id === selected.id
        const own = customIds.has(set.id)
        return (
          <span key={set.id} className="group relative shrink-0">
            <button
              type="button"
              aria-current={active}
              onClick={() => onSelect(set)}
              className={cn(
                chip,
                own && 'pr-7',
                active && 'border-foreground bg-foreground text-background hover:bg-foreground',
              )}
            >
              <span>{set.emoji || '•'}</span>
              {set.title}
            </button>
            {own && (
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
    </div>
  )
}
