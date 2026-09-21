import { TIERS, type Item, type Placement, type RankRequest, type RankResponse } from '../shared/types'

const MAX_ITEMS = 40
const LIMIT_PER_HOUR = 30
const RUBRIC = [
  'F: terrible, the worst possible pick',
  'D: bad, clearly below average',
  'C: average, unremarkable',
  'B: good, above average',
  'A: excellent, among the best',
  'S: exceptional, the single best possible pick',
]

// Best effort: counters live per serverless instance. Swap for a KV store if abuse shows up.
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

async function askJev({ criterion, items }: RankRequest): Promise<Placement[]> {
  const questions = Object.fromEntries(
    items.map((it, i) => [
      `i${i}`,
      {
        type: 'score',
        instructions: `Criterion: "${criterion}". Tier "${it.name}" relative to the other items in the list.`,
        criteria: RUBRIC,
      },
    ]),
  )
  const res = await fetch('https://ai-gateway.vercel.sh/v1/evaluate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'typesafe-ai/jev',
      state: { criterion, items: items.map((it) => it.name) },
      questions,
    }),
  })
  if (!res.ok) throw new Error(`Jev ${res.status}: ${await res.text()}`)
  const { answers } = (await res.json()) as {
    answers: Record<string, { score: number; probabilities: Record<string, number> }>
  }
  return items.map((it, i) => {
    const { score, probabilities } = answers[`i${i}`]
    const [rung, confidence] = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0]
    return { name: it.name, tier: TIERS[TIERS.length - 1 - Number(rung)], score, confidence }
  })
}

export async function POST(request: Request): Promise<Response> {
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
