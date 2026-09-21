import { cache } from 'react'
import { redis } from '@/lib/redis'
import { type Item, type Placement, type Share, TIERS } from '@/lib/types'

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const ID = /^[a-zA-Z0-9]{8}$/

function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

export function parseShare(body: unknown): Share | null {
  if (typeof body !== 'object' || body === null) return null
  const { title, criterion, items, placements, jev } = body as Record<string, unknown>
  if (typeof title !== 'string' || !title.trim() || title.length > 60) return null
  if (typeof criterion !== 'string' || !criterion.trim() || criterion.length > 200) return null
  if (!Array.isArray(items) || items.length === 0 || items.length > 40) return null
  if (!Array.isArray(placements) || placements.length === 0 || placements.length > items.length) return null

  const cleanItems: Item[] = []
  for (const it of items) {
    const name = typeof it?.name === 'string' ? it.name.trim() : ''
    const emoji = typeof it?.emoji === 'string' && it.emoji.length <= 8 ? it.emoji : undefined
    if (!name || name.length > 60) return null
    cleanItems.push(emoji ? { name, emoji } : { name })
  }
  const names = new Set(cleanItems.map((it) => it.name))

  const cleanPlacements: Placement[] = []
  for (const p of placements) {
    if (!names.has(p?.name) || !TIERS.includes(p?.tier)) return null
    const confidence = typeof p.confidence === 'number' ? p.confidence : undefined
    const score = typeof p.score === 'number' ? p.score : undefined
    cleanPlacements.push({ name: p.name, tier: p.tier, score, confidence })
  }

  return {
    title: title.trim(),
    criterion: criterion.trim(),
    items: cleanItems,
    placements: cleanPlacements,
    jev: jev === true,
  }
}

export async function createShare(share: Share) {
  if (!redis) throw new Error('Redis is not configured')
  const id = newId()
  await redis.set(`share:${id}`, share, { nx: true })
  return id
}

export const getShare = cache(async (id: string) => {
  if (!redis || !ID.test(id)) return null
  return redis.get<Share>(`share:${id}`)
})
