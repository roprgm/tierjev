import { generateSet } from '@/lib/generate-set'
import { clientIp, rateLimited } from '@/lib/ratelimit'
import { redis } from '@/lib/redis'
import type { TierSet } from '@/lib/types'

const LIMIT_PER_HOUR = 10
const CACHE_TTL = 60 * 60 * 24 * 30

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const topic = typeof body?.topic === 'string' ? body.topic.trim().replace(/\s+/g, ' ') : ''
  if (!topic || topic.length > 80)
    return Response.json({ error: 'Describe the set in a few words.' }, { status: 400 })

  const key = `set:${topic.toLowerCase()}`
  const cached = await redis?.get<TierSet>(key)
  if (cached) return Response.json(cached)

  if (await rateLimited('sets', clientIp(request), LIMIT_PER_HOUR)) {
    return Response.json(
      { error: `You've created ${LIMIT_PER_HOUR} sets this hour. Try again later.` },
      { status: 429 },
    )
  }

  try {
    const set = await generateSet(topic)
    await redis?.set(key, set, { ex: CACHE_TTL })
    return Response.json(set)
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Could not create that set right now.' }, { status: 502 })
  }
}
