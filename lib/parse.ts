import { type Item, type Placement, TIERS, type TierSet } from '@/lib/types'

export const MAX_ITEMS = 40

export function parseItems(value: unknown): Item[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ITEMS) return null
  const items: Item[] = []
  for (const it of value) {
    const name = typeof it?.name === 'string' ? it.name.trim() : ''
    const emoji = typeof it?.emoji === 'string' && it.emoji.length <= 8 ? it.emoji : undefined
    const color = typeof it?.color === 'string' && /^#[0-9a-f]{6}$/i.test(it.color) ? it.color : undefined
    if (!name || name.length > 60) return null
    items.push({ name, ...(emoji && { emoji }), ...(color && { color }) })
  }
  return items
}

export function parseSet(value: unknown): TierSet | null {
  if (typeof value !== 'object' || value === null) return null
  const { id, title, emoji, criterion } = value as Record<string, unknown>
  const items = parseItems((value as Record<string, unknown>).items)
  if (!items || typeof title !== 'string' || !title.trim() || title.length > 60) return null
  return {
    id: typeof id === 'string' ? id.slice(0, 80) : 'custom',
    title: title.trim(),
    emoji: typeof emoji === 'string' ? emoji.slice(0, 8) : '',
    criterion: typeof criterion === 'string' ? criterion.slice(0, 200) : '',
    items,
  }
}

export function parsePlacements(value: unknown, items: Item[]): Placement[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > items.length) return null
  const names = new Set(items.map((it) => it.name))
  const placements: Placement[] = []
  for (const p of value) {
    if (!names.has(p?.name) || !TIERS.includes(p?.tier)) return null
    const confidence = typeof p.confidence === 'number' ? p.confidence : undefined
    const score = typeof p.score === 'number' ? p.score : undefined
    placements.push({ name: p.name, tier: p.tier, score, confidence })
  }
  return placements
}

const MIN = 3

// Turns a pasted "one item per line" list into items, or explains the first problem found.
export function parseList(text: string): { items: Item[] } | { error: string } {
  const lines = text.split('\n')
  const items: Item[] = []
  const seen = new Set<string>()
  for (const [i, raw] of lines.entries()) {
    const line = raw.trim()
    const at = `Line ${i + 1}`
    if (!line) {
      if (i === lines.length - 1) continue
      return { error: `${at} is empty.` }
    }
    if (line.includes(',')) return { error: `${at} has a comma. Put one item per line.` }
    if (line.length > 40) return { error: `${at} is longer than 40 characters.` }
    const key = line.toLowerCase()
    if (seen.has(key)) return { error: `${at} repeats "${line}".` }
    seen.add(key)
    items.push({ name: line })
  }
  if (items.length < MIN) return { error: `Add at least ${MIN} items.` }
  if (items.length > MAX_ITEMS) return { error: `Keep it to ${MAX_ITEMS} items or fewer.` }
  return { items }
}
