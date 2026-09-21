import { type Item, type Placement, TIERS, type TierSet } from '@/lib/types'

export const MAX_ITEMS = 40

export function parseItems(value: unknown): Item[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_ITEMS) return null
  const items: Item[] = []
  for (const it of value) {
    const name = typeof it?.name === 'string' ? it.name.trim() : ''
    const emoji = typeof it?.emoji === 'string' && it.emoji.length <= 8 ? it.emoji : undefined
    if (!name || name.length > 60) return null
    items.push(emoji ? { name, emoji } : { name })
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

export const normalize = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase()

export async function hashKey(prefix: string, ...parts: unknown[]) {
  const bytes = new TextEncoder().encode(JSON.stringify(parts))
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return `${prefix}:${Buffer.from(hash).toString('base64url')}`
}
