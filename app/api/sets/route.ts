import { finalizeSet, streamSet } from '@/lib/generate-set'
import { clientIp, rateLimited } from '@/lib/ratelimit'
import { redis } from '@/lib/redis'
import { reportError } from '@/lib/report'
import { isUnsafe } from '@/lib/safety'
import type { TierSet } from '@/lib/types'

const LIMIT_PER_HOUR = 10
const CACHE_TTL = 60 * 60 * 24 * 30

// Streams NDJSON: partial drafts as they are written, then {"done": set} or {"error": message}.
// A cached set is returned as plain JSON instead.
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

  if (await isUnsafe(topic).catch(() => false)) {
    return Response.json({ error: "That's not a topic we'll build a set for." }, { status: 400 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (value: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(value)}\n`))
      let last: unknown
      try {
        for await (const partial of streamSet(topic)) {
          last = partial
          send(partial)
        }
        const set = finalizeSet(topic, last)
        await redis?.set(key, set, { ex: CACHE_TTL })
        send({ done: set })
      } catch (err) {
        reportError(err)
        send({ error: 'Could not create that set right now.' })
      }
      controller.close()
    },
  })
  return new Response(stream, { headers: { 'Content-Type': 'application/x-ndjson' } })
}
