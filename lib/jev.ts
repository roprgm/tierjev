import { type Item, type Placement, TIERS } from '@/lib/types'

const MODEL = 'typesafe-ai/jev'

// Ordered low to high, the shape Jev's score questions expect.
const RUBRIC = [
  'F: terrible, the worst of the list',
  'D: bad, clearly below the rest',
  'C: middling, unremarkable',
  'B: good, above most of the list',
  'A: excellent, among the very best',
  'S: exceptional, the single best pick',
]

export type Question =
  | { type: 'choice'; instructions: string; criteria: Record<string, string> }
  | { type: 'score'; instructions: string; criteria: string[] }
  | { type: 'boolean'; instructions: string }
type Answer = { choice?: string; score?: number; probability?: number; probabilities: Record<string, number> }

// Raw HTTP instead of the AI SDK's experimental `evaluate`: the SDK rejects answers whose top
// probabilities tie after rounding, which Jev produces regularly for 7-way tier questions.
export async function evaluate(state: unknown, questions: Record<string, Question>, attempt = 0) {
  const res = await fetch('https://ai-gateway.vercel.sh/v1/evaluate', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, state, questions }),
  })
  // TypeSafe answers 503 in short bursts; one retry clears most of them.
  if (res.status === 503 && attempt < 1) {
    await new Promise((r) => setTimeout(r, 400))
    return evaluate(state, questions, attempt + 1)
  }
  if (!res.ok) throw new Error(`Jev ${res.status}: ${await res.text()}`)
  const { answers } = (await res.json()) as { answers: Record<string, Answer> }
  return answers
}

// Tiers every item for the criterion. The tier is the most likely rung; the probability-weighted
// rung index orders items inside a tier.
export async function rankItems(criterion: string, items: Item[]): Promise<Placement[]> {
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
