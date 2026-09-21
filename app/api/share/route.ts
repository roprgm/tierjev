import { isUnsafe } from '@/lib/jev'
import { parseItems, parsePlacements } from '@/lib/parse'
import { clientIp, rateLimited, redis, reportError } from '@/lib/server'
import type { Share } from '@/lib/types'

const LIMIT_PER_HOUR = 20

const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(8))
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

function parseShare(body: unknown): Share | null {
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

async function createShare(share: Share) {
  if (!redis) throw new Error('Redis is not configured')
  const id = newId()
  await redis.set(`share:${id}`, share, { nx: true })
  return id
}

export async function POST(request: Request) {
  const share = parseShare(await request.json().catch(() => null))
  if (!share) return Response.json({ error: 'Invalid request' }, { status: 400 })

  if (await rateLimited('share', clientIp(request), LIMIT_PER_HOUR)) {
    return Response.json({ error: 'Too many shares for now. Try again in a bit.' }, { status: 429 })
  }

  const text = `${share.title}. ${share.criterion}. ${share.items.map((it) => it.name).join(', ')}`
  if (await isUnsafe(text).catch(() => false)) {
    return Response.json({ error: "That list can't be shared publicly." }, { status: 400 })
  }

  try {
    return Response.json({ id: await createShare(share) })
  } catch (err) {
    reportError(err)
    return Response.json({ error: 'Sharing is unavailable right now.' }, { status: 502 })
  }
}
