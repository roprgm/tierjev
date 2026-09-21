import { pickColors } from '@/lib/colors'
import { hashKey } from '@/lib/parse'
import { clientIp, rateLimited } from '@/lib/ratelimit'
import { redis } from '@/lib/redis'

const LIMIT_PER_HOUR = 20
const CACHE_TTL = 60 * 60 * 24 * 30

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const title = typeof body?.title === 'string' ? body.title.slice(0, 60) : ''
  const items: unknown = body?.items
  const valid =
    Array.isArray(items) &&
    items.length > 0 &&
    items.length <= 40 &&
    items.every((n) => typeof n === 'string' && n.length <= 60)
  if (!valid) return Response.json({ error: 'Invalid request' }, { status: 400 })
  const names = items as string[]

  const key = await hashKey('colors', title, names)
  const cached = await redis?.get<Record<string, string>>(key)
  if (cached) return Response.json({ colors: cached })

  if (await rateLimited('colors', clientIp(request), LIMIT_PER_HOUR)) {
    return Response.json({ error: 'Too many new sets for now. Try again in a bit.' }, { status: 429 })
  }

  try {
    const colors = await pickColors(title, names)
    await redis?.set(key, colors, { ex: CACHE_TTL })
    return Response.json({ colors })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Could not pick colours right now.' }, { status: 502 })
  }
}
