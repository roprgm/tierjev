import { cache } from 'react'
import { parseItems, parsePlacements } from '@/lib/parse'
import { redis } from '@/lib/server'
import type { Share } from '@/lib/types'

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
  const cleanItems = parseItems(items)
  const cleanPlacements = cleanItems && parsePlacements(placements, cleanItems)
  if (!cleanItems || !cleanPlacements) return null
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

// Plain fetch with force-cache instead of the SDK: the SDK's no-store requests would make the
// statically cached share pages dynamic. A share never changes, so caching the read forever is safe.
export const getShare = cache(async (id: string): Promise<Share | null> => {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token || !ID.test(id)) return null
  const res = await fetch(`${url}/get/share:${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'force-cache',
  })
  const { result } = (await res.json()) as { result: string | null }
  return result ? JSON.parse(result) : null
})
