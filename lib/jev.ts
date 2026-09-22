import { PALETTE } from '@/lib/palette'
import type { Item, Placement, Tier } from '@/lib/types'

const MODEL = 'typesafe-ai/jev'
const RETRIES = 4

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
  // TypeSafe answers 503 in bursts under load; back off and retry before giving up.
  if (res.status === 503 && attempt < RETRIES) {
    await new Promise((r) => setTimeout(r, 500 * 2 ** attempt))
    return evaluate(state, questions, attempt + 1)
  }
  if (!res.ok) throw new Error(`Jev ${res.status}: ${await res.text()}`)
  const { answers } = (await res.json()) as { answers: Record<string, Answer> }
  return answers
}

// Ordered low to high, the shape Jev's score questions expect.
const RUBRIC = [
  "F: a dud, there is nothing here worth anyone's time",
  'D: weak, a toy or a worse version of something that already exists',
  'C: fine, competent but one of many like it',
  'B: good, a clear step above the usual',
  'A: excellent, people bookmark this one and tell a friend about it',
  'S: outstanding, belongs in the best handful in the whole list',
]

export type Scored = { name: string; score: number; confidence: number }

// Scores every item against the criterion. `context` is the full list a batch belongs to, so scores stay
// comparable when a long list is scored in several calls; descriptions ride along with each question,
// which keeps the shared state small.
export async function scoreItems(
  criterion: string,
  items: Item[],
  context: Item[] = items,
): Promise<Scored[]> {
  const answers = await evaluate(
    { criterion, items: context.map((it) => it.name) },
    Object.fromEntries(
      items.map((it, i) => [
        `i${i}`,
        {
          type: 'score',
          instructions: `Rate ${it.description ? `"${it.name}" (${it.description})` : `"${it.name}"`} on: ${criterion}. Judge it against the other items in the list. Be decisive and use the whole scale: most things are ordinary, a few are genuinely great, and some are duds.`,
          criteria: RUBRIC,
        },
      ]),
    ),
  )
  return items.map((it, i) => {
    const { score = 0, probabilities } = answers[`i${i}`]
    return { name: it.name, score, confidence: Object.values(probabilities).sort((a, b) => b - a)[0] ?? 0 }
  })
}

// Jev's own tier vote is almost always the same middle rung, because its probability mass sits there:
// even its favourites peak on A with S trailing. Taking the argmax would leave S and F permanently empty,
// so tiers come from each item's rank by score, which is what makes a tier list worth looking at.
// Score every batch of a long list first, then curve once over all of them.
const SHAPE: [Tier, number][] = [
  ['S', 0.05],
  ['A', 0.2],
  ['B', 0.5],
  ['C', 0.8],
  ['D', 0.95],
  ['F', 1],
]

export function toTiers(scored: Scored[]): Placement[] {
  const ordered = [...scored].sort((a, b) => b.score - a.score)
  const placements = ordered.map((item, i) => ({
    ...item,
    tier: SHAPE.find(([, upTo]) => (i + 0.5) / ordered.length <= upTo)?.[0] ?? 'F',
  }))
  // A list short enough to miss the top band still has a winner, and a tier list should crown it.
  if (placements.length >= 4 && placements[0].tier !== 'S') placements[0].tier = 'S'
  return placements
}

export async function rankItems(
  criterion: string,
  items: Item[],
  context: Item[] = items,
): Promise<Placement[]> {
  return toTiers(await scoreItems(criterion, items, context))
}

const CRITERIA = Object.fromEntries(Object.entries(PALETTE).map(([name, { label }]) => [name, label]))
// Jev rejects requests with roughly a thousand options in total; 6 items × 130 colours stays under.
const BATCH = 6

// The colour people would associate with each item, chosen by Jev from the palette.
// Batches run sequentially (parallel ones get 503s), and a batch the provider rejects is split down to
// single items so one odd name only loses its own colour.
export async function pickColors(title: string, names: string[]): Promise<Record<string, string>> {
  const colors: Record<string, string> = {}
  for (let start = 0; start < names.length; start += BATCH) {
    Object.assign(colors, await pickBatch(title, names.slice(start, start + BATCH)))
  }
  return colors
}

async function pickBatch(title: string, names: string[]): Promise<Record<string, string>> {
  try {
    const answers = await evaluate(
      { set: title, items: names },
      Object.fromEntries(
        names.map((name, i) => [
          `i${i}`,
          {
            type: 'choice',
            instructions: `Which colour do people most associate with "${name}"? Consider its look, brand, flag, or typical depiction.`,
            criteria: CRITERIA,
          },
        ]),
      ),
    )
    const colors: Record<string, string> = {}
    names.forEach((name, i) => {
      const pick = PALETTE[answers[`i${i}`].choice ?? '']
      if (pick) colors[name] = pick.hex
    })
    return colors
  } catch (err) {
    if (names.length === 1) {
      console.warn(`Jev could not colour "${names[0]}"`, err)
      return {}
    }
    const half = Math.ceil(names.length / 2)
    return {
      ...(await pickBatch(title, names.slice(0, half))),
      ...(await pickBatch(title, names.slice(half))),
    }
  }
}

// One Jev boolean over user-supplied text before it becomes public or feeds a generator.
export async function isUnsafe(text: string): Promise<boolean> {
  const { unsafe } = await evaluate(text, {
    unsafe: {
      type: 'boolean',
      instructions:
        'Is this content targeting private individuals, sexualising anyone, degrading people by protected traits (race, religion, gender, disability, nationality), or promoting violence or self-harm? ' +
        'Ranking public figures, brands, products or fiction on ordinary criteria is fine.',
    },
  })
  return (unsafe.probability ?? 0) > 0.6
}
