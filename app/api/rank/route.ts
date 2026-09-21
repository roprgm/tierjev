import { evaluate } from '@/lib/jev'
import { parseItems } from '@/lib/parse'
import { clientIp, hashKey, rateLimited, redis, reportError } from '@/lib/server'
import { type Item, type Placement, type RankResponse, TIERS, type TierSet } from '@/lib/types'

const LIMIT_PER_HOUR = 30
const CACHE_TTL = 60 * 60 * 24

const normalize = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase()

function parseSet(value: unknown): TierSet | null {
  if (typeof value !== 'object' || value === null) return null
  const { id, title, emoji, criterion } = value as Record<string, unknown>
  const items = parseItems((value as Record<string, unknown>).items)
  if (!items || typeof title !== 'string' || !title.trim() || title.length > 60) return null
  return {
    id: typeof id === 'string' ? id.slice(0, 80) : 'custom',
    title: title.trim(),
    emoji: typeof emoji === 'string' ? emoji.slice(0, 8) : '',
    criterion: typeof criterion === 'string' ? criterion.slice(0, 200) : '',
    items,
  }
}

// Ordered low to high, the shape Jev's score questions expect.
const RUBRIC = [
  'F: terrible, the worst of the list',
  'D: bad, clearly below the rest',
  'C: middling, unremarkable',
  'B: good, above most of the list',
  'A: excellent, among the very best',
  'S: exceptional, the single best pick',
]

// Tiers every item for the criterion. The tier is the most likely rung; the probability-weighted
// rung index orders items inside a tier.
async function rankItems(criterion: string, items: Item[]): Promise<Placement[]> {
  const answers = await evaluate(
    { criterion, items: items.map((it) => it.name) },
    Object.fromEntries(
      items.map((it, i) => [
        `i${i}`,
        {
          type: 'score',
          instructions: `Rate "${it.name}" on: ${criterion}. Judge it against the other items in the list and use the whole scale.`,
          criteria: RUBRIC,
        },
      ]),
    ),
  )
  return items.map((it, i) => {
    const { score = 0, probabilities } = answers[`i${i}`]
    const [rung, confidence] = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0] ?? ['0', 0]
    return { name: it.name, tier: TIERS[TIERS.length - 1 - Number(rung)], score, confidence }
  })
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const query = typeof body?.query === 'string' ? normalize(body.query) : ''
  const set = parseSet(body?.set)
  if (!query || query.length > 200 || !set)
    return Response.json({ error: 'Invalid request' }, { status: 400 })

  const key = await hashKey(
    'rank2',
    query,
    set.items.map((it) => it.name),
  )
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
    const result: RankResponse = { placements: await rankItems(query, set.items) }
    await redis?.set(key, result, { ex: CACHE_TTL })
    return Response.json(result)
  } catch (err) {
    reportError(err)
    return Response.json({ error: 'Jev is unavailable right now.' }, { status: 502 })
  }
}
