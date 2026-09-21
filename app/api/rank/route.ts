import { SETS } from '@/data/sets'
import { pickSet, rankItems } from '@/lib/jev'
import { hashKey, normalize, parseSet } from '@/lib/parse'
import { clientIp, rateLimited } from '@/lib/ratelimit'
import { redis } from '@/lib/redis'
import type { RankResponse } from '@/lib/types'

const LIMIT_PER_HOUR = 30
const CACHE_TTL = 60 * 60 * 24

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const query = typeof body?.query === 'string' ? normalize(body.query) : ''
  if (!query || query.length > 200) return Response.json({ error: 'Tell me what to rank.' }, { status: 400 })
  const given = body?.set === undefined ? undefined : parseSet(body.set)
  if (given === null) return Response.json({ error: 'Invalid set' }, { status: 400 })

  const key = await hashKey('rank', query, given?.items.map((it) => it.name) ?? 'auto')
  const cached = await redis?.get<RankResponse>(key)
  if (cached) return Response.json(cached)

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
    const set = given ?? (await pickSet(query, SETS))
    const result: RankResponse = set
      ? { set, placements: await rankItems(query, set.items) }
      : { needsSet: true }
    await redis?.set(key, result, { ex: CACHE_TTL })
    return Response.json(result)
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Jev is unavailable right now.' }, { status: 502 })
  }
}
