import { type Item, type Placement, TIERS } from '@/lib/types'

const MODEL = 'typesafe-ai/jev'

const TIER_CRITERIA = {
  S: 'exceptional, the single best possible pick',
  A: 'excellent, among the best',
  B: 'good, above average',
  C: 'average, unremarkable',
  D: 'bad, clearly below average',
  F: 'terrible, the worst possible pick',
  skip: 'does not apply: this item is not something the request can meaningfully rate',
}

type Choice = { type: 'choice'; instructions: string; criteria: Record<string, string> }
type Answer = { choice: string; probabilities: Record<string, number> }

// Raw HTTP instead of the AI SDK's experimental `evaluate`: the SDK rejects answers whose top
// probabilities tie after rounding, which Jev produces regularly for 7-way tier questions.
async function evaluate(state: unknown, questions: Record<string, Choice>) {
  const res = await fetch('https://ai-gateway.vercel.sh/v1/evaluate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, state, questions }),
  })
  if (!res.ok) throw new Error(`Jev ${res.status}: ${await res.text()}`)
  const { answers } = (await res.json()) as { answers: Record<string, Answer> }
  return answers
}

// Tiers every item for the request. Items Jev marks as not applicable are left out.
export async function rankItems(query: string, items: Item[]): Promise<Placement[]> {
  const answers = await evaluate(
    { request: query, items: items.map((it) => it.name) },
    Object.fromEntries(
      items.map((it, i) => [
        `i${i}`,
        {
          type: 'choice',
          instructions: `Tier "${it.name}" for the request, relative to the other items. Pick skip if it does not apply.`,
          criteria: TIER_CRITERIA,
        },
      ]),
    ),
  )
  const placements: Placement[] = []
  items.forEach((it, i) => {
    const { choice, probabilities } = answers[`i${i}`]
    if (choice === 'skip') return
    const tier = choice as (typeof TIERS)[number]
    let weight = 0
    let score = 0
    for (const [index, t] of [...TIERS].reverse().entries()) {
      weight += probabilities[t] ?? 0
      score += (probabilities[t] ?? 0) * index
    }
    placements.push({
      name: it.name,
      tier,
      score: weight ? score / weight : 0,
      confidence: probabilities[tier] ?? 0,
    })
  })
  return placements
}
