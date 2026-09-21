import { evaluate } from '@/lib/jev'
import { PALETTE } from '@/lib/palette'

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
