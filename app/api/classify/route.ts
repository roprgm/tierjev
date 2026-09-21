import { askJev } from '@/lib/jev'
import { redis } from '@/lib/redis'
import type { Item, Placement, RankRequest, RankResponse } from '@/lib/types'

const MAX_ITEMS = 40
const LIMIT_PER_HOUR = 30
const CACHE_TTL = 60 * 60 * 24 * 30

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

// Returns seconds until the hourly window resets when the limit is exceeded.
async function rateLimited(ip: string) {
  if (!redis) return 0
  const window = Math.floor(Date.now() / 3_600_000)
  const key = `rl:${ip}:${window}`
  const [count] = await redis.multi().incr(key).expire(key, 3600).exec<[number, number]>()
  if (count <= LIMIT_PER_HOUR) return 0
  return Math.ceil(((window + 1) * 3_600_000 - Date.now()) / 1000)
}

export async function POST(request: Request) {
  const req = parse(await request.json().catch(() => null))
  if (!req) return Response.json({ error: 'Invalid request' }, { status: 400 })

  const key = await cacheKey(req)
  const cached = await redis?.get<Placement[]>(key)
  if (cached) return Response.json({ placements: cached } satisfies RankResponse)

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local'
  const retryAfter = await rateLimited(ip)
  if (retryAfter) {
    const minutes = Math.max(1, Math.ceil(retryAfter / 60))
    return Response.json(
      {
        error: `You've used the ${LIMIT_PER_HOUR} free rankings for this hour. Try again in ${minutes} min.`,
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
