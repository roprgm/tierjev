import { type Item, type Placement, TIERS } from '@/lib/types'

export const MAX_ITEMS = 40

// Cuts by code point, so a truncated emoji never leaves a lone surrogate. Jev rejects those outright.
export const truncate = (text: string, max: number) => [...text].slice(0, max).join('')

export function parseItems(value: unknown): Item[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ITEMS) return null
  const items: Item[] = []
  for (const it of value) {
    const name = typeof it?.name === 'string' ? it.name.trim() : ''
    const emoji = typeof it?.emoji === 'string' && it.emoji.length <= 8 ? it.emoji : undefined
    const color = typeof it?.color === 'string' && /^#[0-9a-f]{6}$/i.test(it.color) ? it.color : undefined
    const description = typeof it?.description === 'string' ? truncate(it.description, 300) : undefined
    const url = typeof it?.url === 'string' && /^https:\/\//.test(it.url) ? it.url.slice(0, 300) : undefined
    if (!name || name.length > 60) return null
    items.push({
      name,
      ...(emoji && { emoji }),
      ...(color && { color }),
      ...(description && { description }),
      ...(url && { url }),
    })
  }
  return items
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
