import { type Placement, type RankRequest, TIERS } from './types'

const RUBRIC = [
  'F: terrible, the worst possible pick',
  'D: bad, clearly below average',
  'C: average, unremarkable',
  'B: good, above average',
  'A: excellent, among the best',
  'S: exceptional, the single best possible pick',
]

type Answer = { score: number; probabilities: Record<string, number> }

export async function askJev({ criterion, items }: RankRequest): Promise<Placement[]> {
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
    headers: {
      Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'typesafe-ai/jev',
      state: { criterion, items: items.map((it) => it.name) },
      questions,
    }),
  })
  if (!res.ok) throw new Error(`Jev ${res.status}: ${await res.text()}`)
  const { answers } = (await res.json()) as { answers: Record<string, Answer> }
  return items.map((it, i) => {
    const { score, probabilities } = answers[`i${i}`]
    const [rung, confidence] = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0]
    return { name: it.name, tier: TIERS[TIERS.length - 1 - Number(rung)], score, confidence }
  })
}
