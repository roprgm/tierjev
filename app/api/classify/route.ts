import { askJev } from '@/lib/jev'
import { clientIp, rateLimited } from '@/lib/ratelimit'
import { redis } from '@/lib/redis'
import type { Item, Placement, RankRequest, RankResponse } from '@/lib/types'

const MAX_ITEMS = 40
const LIMIT_PER_HOUR = 30
const CACHE_TTL = 60 * 60 * 24

function parse(body: unknown): RankRequest | null {
  if (typeof body !== 'object' || body === null) return null
  const { criterion, items } = body as Record<string, unknown>
  if (typeof criterion !== 'string' || !criterion.trim() || criterion.length > 200) return null
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) return null
  const clean: Item[] = []
  for (const it of items) {
    const name = typeof it?.name === 'string' ? it.name.trim() : ''
    if (!name || name.length > 60) return null
    clean.push({ name })
  }
  return { criterion: criterion.trim().replace(/\s+/g, ' ').toLowerCase(), items: clean }
}

async function cacheKey({ criterion, items }: RankRequest) {
  const names = items.map((it) => it.name.toLowerCase()).sort()
  const bytes = new TextEncoder().encode(JSON.stringify([criterion, names]))
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return `rank:${Buffer.from(hash).toString('base64url')}`
}

export async function POST(request: Request) {
  const req = parse(await request.json().catch(() => null))
  if (!req) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const key = await cacheKey(req)
  const cached = await redis?.get<Placement[]>(key)
  if (cached) return Response.json({ placements: cached } satisfies RankResponse)

  const retryAfter = await rateLimited('rank', clientIp(request), LIMIT_PER_HOUR)
  if (retryAfter) {
    const minutes = Math.max(1, Math.ceil(retryAfter / 60))
    return Response.json(
      {
        error: `You've used the ${LIMIT_PER_HOUR} free rankings for this hour. Jev is back in ${minutes} min.`,
        retryAfter,
      },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } },
    )
  }

  try {
    const placements = await askJev(req)
    await redis?.set(key, placements, { ex: CACHE_TTL })
    return Response.json({ placements } satisfies RankResponse)
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Jev is unavailable right now.' }, { status: 502 })
  }
}
