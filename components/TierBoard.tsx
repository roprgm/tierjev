'use client'

import {
  DndContext,
  type DragEndEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { type ComponentProps, type ReactNode, useRef, useState } from 'react'
import { ItemTile } from '@/components/ItemTile'
import { TooltipContent, TooltipProvider, TooltipRoot, TooltipTrigger } from '@/components/ui/tooltip'
import { type Item, type Placement, TIERS, type Tier } from '@/lib/types'
import { useFlip } from '@/lib/use-flip'
import { cn } from '@/lib/utils'

const COLORS: Record<Tier, string> = {
  S: 'bg-tier-s',
  A: 'bg-tier-a',
  B: 'bg-tier-b',
  C: 'bg-tier-c',
  D: 'bg-tier-d',
  F: 'bg-tier-f',
}

type Props = {
  items: Item[]
  placements: Placement[]
  loading?: boolean
  onMove?: (name: string, tier: Tier | null) => void
}

export function TierBoard({ items, placements, loading = false, onMove }: Props) {
  const boardRef = useRef<HTMLDivElement>(null)
  useFlip(boardRef, [placements])
  const [dragging, setDragging] = useState<Item | null>(null)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )
  const interactive = Boolean(onMove)
  const byName = new Map(items.map((it) => [it.name, it]))
  const placed = new Set(placements.map((p) => p.name))
  const pool = items.filter((it) => !placed.has(it.name))
  const inTier = (tier: Tier) =>
    placements.filter((p) => p.tier === tier).sort((a, b) => (b.score ?? -1) - (a.score ?? -1))

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragging(null)
    onMove?.(String(active.id), over && over.id !== 'pool' ? (over.id as Tier) : null)
  }

  return (
    <DndContext
      id="tiers"
      sensors={sensors}
      onDragStart={({ active }) => setDragging(byName.get(String(active.id)) ?? null)}
      onDragCancel={() => setDragging(null)}
      onDragEnd={handleDragEnd}
    >
      <TooltipProvider>
        <div ref={boardRef} className="select-none space-y-6">
          <div className="overflow-hidden rounded-xl border">
            {TIERS.map((tier) => (
              <Row key={tier} tier={tier} droppable={interactive}>
                {inTier(tier).map((p) => (
                  <Tile
                    key={p.name}
                    item={byName.get(p.name) ?? { name: p.name }}
                    tooltip={
                      p.confidence == null ? undefined : `${Math.round(p.confidence * 100)}% confident`
                    }
                    draggable={interactive}
                  />
                ))}
              </Row>
            ))}
          </div>
          {pool.length > 0 && (
            <Pool droppable={interactive}>
              {pool.map((it) => (
                <Tile
                  key={it.name}
                  item={it}
                  draggable={interactive}
                  className={loading ? 'animate-pulse' : undefined}
                />
              ))}
            </Pool>
          )}
        </div>
      </TooltipProvider>
      <DragOverlay dropAnimation={null}>
        {dragging && <ItemTile item={dragging} data-flip={undefined} className="shadow-lg" />}
      </DragOverlay>
    </DndContext>
  )
}

type RowProps = { tier: Tier; droppable: boolean; children: ReactNode }

function Row({ tier, droppable, children }: RowProps) {
  const { setNodeRef, isOver } = useDroppable({ id: tier, disabled: !droppable })
  return (
    <div className="flex h-22 border-b last:border-b-0">
      <div
        className={cn(
          'flex w-14 shrink-0 items-center justify-center text-2xl font-bold text-black/80 sm:w-20',
          COLORS[tier],
        )}
      >
        {tier}
      </div>
      <div
        ref={setNodeRef}
        data-clip
        className={cn(
          'scrollbar-none flex min-w-0 flex-1 gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain bg-muted/40 p-1 transition-colors',
          isOver && 'bg-muted',
        )}
      >
        {children}
      </div>
    </div>
  )
}

function Pool({ droppable, children }: { droppable: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'pool', disabled: !droppable })
  return (
    <div
      ref={setNodeRef}
      className={cn('flex min-h-20 flex-wrap gap-1 rounded-xl transition-colors', isOver && 'bg-muted/40')}
    >
      {children}
    </div>
  )
}

type TileProps = ComponentProps<typeof ItemTile> & { draggable: boolean; tooltip?: string }

function Tile({ draggable, tooltip, className, ...props }: TileProps) {
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: props.item.name,
    disabled: !draggable,
  })
  const tile = (
    <ItemTile
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      {...props}
      className={cn(draggable && 'cursor-grab active:cursor-grabbing', isDragging && 'opacity-30', className)}
    />
  )
  if (!tooltip) return tile
  return (
    <TooltipRoot>
      <TooltipTrigger render={tile} />
      <TooltipContent>{tooltip}</TooltipContent>
    </TooltipRoot>
  )
}
