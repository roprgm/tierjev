import { askJev } from '@/lib/jev'
import type { Item, RankRequest, RankResponse } from '@/lib/types'

const MAX_ITEMS = 40
const LIMIT_PER_HOUR = 30

// Best effort: counters live per instance. Swap for a KV store if abuse shows up.
const hits = new Map<string, { count: number; reset: number }>()
function rateLimited(ip: string) {
  const now = Date.now()
  const entry = hits.get(ip)
  if (!entry || entry.reset < now) {
    hits.set(ip, { count: 1, reset: now + 3_600_000 })
    return false
  }
  entry.count += 1
  return entry.count > LIMIT_PER_HOUR
}

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
  return { criterion: criterion.trim(), items: clean }
}

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local'
  if (rateLimited(ip)) return Response.json({ error: 'Rate limit reached. Try again in an hour.' }, { status: 429 })
  const req = parse(await request.json().catch(() => null))
  if (!req) return Response.json({ error: 'Invalid request' }, { status: 400 })
  try {
    const body: RankResponse = { placements: await askJev(req) }
    return Response.json(body)
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Jev is unavailable right now.' }, { status: 502 })
  }
}
