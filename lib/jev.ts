import { experimental_evaluate as evaluate } from 'ai'
import { type Placement, type RankRequest, TIERS } from '@/lib/types'

const RUBRIC = [
  'F: terrible, the worst possible pick',
  'D: bad, clearly below average',
  'C: average, unremarkable',
  'B: good, above average',
  'A: excellent, among the best',
  'S: exceptional, the single best possible pick',
]

export async function askJev({ criterion, items }: RankRequest): Promise<Placement[]> {
  const { answers } = await evaluate({
    model: 'typesafe-ai/jev',
    state: { criterion, items: items.map((it) => it.name) },
    questions: Object.fromEntries(
      items.map((it, i) => [
        `i${i}`,
        {
          type: 'score' as const,
          instructions: `Criterion: "${criterion}". Tier "${it.name}" relative to the other items in the list.`,
          criteria: RUBRIC,
        },
      ]),
    ),
  })
  return items.map((it, i) => {
    const answer = answers[`i${i}`]
    const ranked = Object.entries(answer.probabilities ?? {}).sort((a, b) => b[1] - a[1])
    const [rung, confidence] = ranked[0] ?? [String(Math.round(answer.score)), 1]
    return { name: it.name, tier: TIERS[TIERS.length - 1 - Number(rung)], score: answer.score, confidence }
  })
}
