'use client'

import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  type DragOverEvent,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  SortableContext,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { type ComponentProps, type ReactNode, type RefObject, useLayoutEffect, useRef, useState } from 'react'
import { ItemTile } from '@/components/item-tile'
import { TooltipContent, TooltipProvider, TooltipRoot, TooltipTrigger } from '@/components/ui/popup'
import { type Item, type Placement, TIERS, type Tier } from '@/lib/types'
import { cn } from '@/lib/utils'

const COLORS: Record<Tier, string> = {
  S: 'bg-tier-s',
  A: 'bg-tier-a',
  B: 'bg-tier-b',
  C: 'bg-tier-c',
  D: 'bg-tier-d',
  F: 'bg-tier-f',
}

const DURATION = 450
const EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)'

type Rect = { left: number; top: number; width: number; height: number }

const docRect = (el: Element): Rect => {
  const r = el.getBoundingClientRect()
  return { left: r.left + scrollX, top: r.top + scrollY, width: r.width, height: r.height }
}

// Animates elements marked with data-flip="<key>" from where they were on the previous render to
// where they are now. Each clone flies inside its destination's data-flip-host, so a row's overflow
// clips the whole flight and the tile appears to enter through the row's edge.
function useFlip(container: RefObject<HTMLElement | null>, deps: unknown[], enabled = true) {
  const previous = useRef(new Map<string, Rect>())

  useLayoutEffect(() => {
    const root = container.current
    if (!root) return
    const tiles = [...root.querySelectorAll<HTMLElement>('[data-flip]')]
    const next = new Map(tiles.map((el) => [el.dataset.flip as string, docRect(el)]))
    const before = previous.current
    previous.current = next
    if (!enabled || before.size === 0 || matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const cleanups: (() => void)[] = []
    tiles.forEach((el, i) => {
      const key = el.dataset.flip as string
      const from = before.get(key)
      const to = next.get(key)
      const host = el.closest<HTMLElement>('[data-flip-host]')
      if (!from || !to || !host || (from.left === to.left && from.top === to.top)) return

      const hostRect = docRect(host)
      const clone = el.cloneNode(true) as HTMLElement
      clone.removeAttribute('data-flip')
      clone.style.cssText += `;position:absolute;margin:0;z-index:1;pointer-events:none;left:${from.left - hostRect.left + host.scrollLeft}px;top:${from.top - hostRect.top + host.scrollTop}px;width:${from.width}px;height:${from.height}px`
      host.appendChild(clone)
      el.style.visibility = 'hidden'

      const animation = clone.animate(
        [
          { transform: 'translate(0, 0)' },
          { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px)` },
        ],
        { duration: DURATION, delay: i * 15, easing: EASING, fill: 'forwards' },
      )
      const finish = () => {
        el.style.visibility = ''
        clone.remove()
      }
      animation.onfinish = finish
      cleanups.push(finish)
    })
    return () => {
      for (const cleanup of cleanups) cleanup()
    }
  }, deps)
}

const POOL = 'pool'
type Container = Tier | typeof POOL
type Layout = Record<Container, string[]>

type Props = {
  items: Item[]
  placements: Placement[]
  loading?: boolean
  hint?: string
  onChange?: (layout: Record<Tier, string[]>) => void
  onIcon?: (name: string, look: Pick<Item, 'emoji' | 'color'>) => void
}

function toLayout(items: Item[], placements: Placement[]): Layout {
  const layout = Object.fromEntries([...TIERS, POOL].map((c) => [c, [] as string[]])) as Layout
  const placed = new Set(placements.map((p) => p.name))
  for (const p of placements) layout[p.tier].push(p.name)
  layout[POOL] = items.filter((it) => !placed.has(it.name)).map((it) => it.name)
  return layout
}

const containerOf = (layout: Layout, id: string): Container | undefined =>
  id in layout ? (id as Container) : (Object.keys(layout) as Container[]).find((c) => layout[c].includes(id))

export function TierBoard({ items, placements, loading = false, hint, onChange, onIcon }: Props) {
  const boardRef = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  // While dragging, dnd-kit animates the siblings itself; the FLIP hook only runs for other updates.
  useFlip(boardRef, [placements], !dragging)
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )
  const interactive = Boolean(onChange)
  const byName = new Map(items.map((it) => [it.name, it]))
  const confidence = new Map(placements.map((p) => [p.name, p.confidence]))
  const layout = toLayout(items, placements)

  function emit(next: Layout) {
    const { pool: _, ...tiers } = next
    onChange?.(tiers)
  }

  // Moving over another container inserts the item there so the gap opens where it will land.
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const from = containerOf(layout, String(active.id))
    const to = containerOf(layout, String(over.id))
    if (!from || !to || from === to) return
    const next = { ...layout, [from]: layout[from].filter((n) => n !== active.id) }
    const index = layout[to].indexOf(String(over.id))
    const target = [...layout[to]]
    target.splice(index === -1 ? target.length : index, 0, String(active.id))
    emit({ ...next, [to]: target })
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setDragging(null)
    if (!over) return
    const container = containerOf(layout, String(active.id))
    if (!container || containerOf(layout, String(over.id)) !== container) return
    const list = layout[container]
    const from = list.indexOf(String(active.id))
    const to = list.indexOf(String(over.id))
    if (from !== to && to !== -1) emit({ ...layout, [container]: arrayMove(list, from, to) })
  }

  const tile = (name: string) => (
    <Tile
      key={name}
      item={byName.get(name) ?? { name }}
      tooltip={
        confidence.get(name) == null
          ? undefined
          : `${Math.round((confidence.get(name) ?? 0) * 100)}% confident`
      }
      draggable={interactive}
      className={loading ? 'animate-pulse' : undefined}
      onIcon={onIcon && ((look) => onIcon(name, look))}
    />
  )

  return (
    <DndContext
      id="tiers"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => setDragging(String(active.id))}
      onDragOver={handleDragOver}
      onDragCancel={() => setDragging(null)}
      onDragEnd={handleDragEnd}
    >
      <TooltipProvider>
        <div ref={boardRef} className="select-none space-y-6">
          <div className="overflow-hidden rounded-xl border">
            {TIERS.map((tier) => (
              <Row key={tier} tier={tier} names={layout[tier]} droppable={interactive}>
                {layout[tier].map(tile)}
              </Row>
            ))}
          </div>
          {hint && layout.pool.length > 0 && <p className="text-xs text-muted-foreground">{hint}</p>}
          {layout.pool.length > 0 && (
            <Pool names={layout.pool} droppable={interactive}>
              {layout.pool.map(tile)}
            </Pool>
          )}
        </div>
      </TooltipProvider>
      <DragOverlay dropAnimation={null}>
        {dragging && <ItemTile item={byName.get(dragging) ?? { name: dragging }} className="shadow-lg" />}
      </DragOverlay>
    </DndContext>
  )
}

type RowProps = { tier: Tier; names: string[]; droppable: boolean; children: ReactNode }

function Row({ tier, names, droppable, children }: RowProps) {
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
        data-flip-host
        className={cn(
          'scrollbar-none relative flex min-w-0 flex-1 gap-1 overflow-x-auto overflow-y-hidden overscroll-x-contain bg-muted/40 p-1 transition-colors',
          isOver && 'bg-muted',
        )}
      >
        <SortableContext id={tier} items={names} strategy={horizontalListSortingStrategy}>
          {children}
        </SortableContext>
      </div>
    </div>
  )
}

function Pool({ names, droppable, children }: { names: string[]; droppable: boolean; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: POOL, disabled: !droppable })
  return (
    <div
      ref={setNodeRef}
      data-flip-host
      className={cn(
        'relative flex min-h-20 flex-wrap gap-1 rounded-xl transition-colors',
        isOver && 'bg-muted/40',
      )}
    >
      <SortableContext id={POOL} items={names} strategy={rectSortingStrategy}>
        {children}
      </SortableContext>
    </div>
  )
}

type TileProps = ComponentProps<typeof ItemTile> & { draggable: boolean; tooltip?: string }

function Tile({ draggable, tooltip, className, style, ...props }: TileProps) {
  const { setNodeRef, listeners, attributes, transform, transition, isDragging } = useSortable({
    id: props.item.name,
    disabled: !draggable,
  })
  const tile = (
    <ItemTile
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      {...props}
      style={{ ...style, transform: CSS.Transform.toString(transform), transition }}
      className={cn(draggable && 'cursor-grab active:cursor-grabbing', isDragging && 'opacity-0', className)}
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
