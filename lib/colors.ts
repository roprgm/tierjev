import cssColors from 'color-name'
import { evaluate } from '@/lib/jev'

const SKIP = new Set([
  'white',
  'snow',
  'ghostwhite',
  'whitesmoke',
  'ivory',
  'floralwhite',
  'mintcream',
  'azure',
  'aliceblue',
  'honeydew',
  'seashell',
  'lavenderblush',
  'oldlace',
  'linen',
  'black',
  'grey',
  'darkgrey',
  'dimgrey',
  'lightgrey',
  'slategrey',
  'darkslategrey',
  'lightslategrey',
])
const WORDS =
  /(dark|light|medium|pale|deep|dim|hot|lawn|spring|sky|slate|steel|royal|dodger|cornflower|cadet|powder|midnight|navy|forest|lime|yellow|green|blue|violet|red|orchid|salmon|coral|wood|goldenrod|gray|turquoise|aquamarine|aqua|cyan|magenta|pink|rose|brown|sandy|saddle|olive|drab|indian|fire|brick|lemon|chiffon|papaya|whip|peach|puff|blanched|almond|antique|burly|misty|rosy|sienna|tan|khaki|wheat|bisque|beige|moccasin|thistle|plum|lavender|tomato|orange|gold|crimson|maroon|indigo|purple|teal|silver|chartreuse|chocolate|peru|sea|white)/g

const hex = ([r, g, b]: [number, number, number]) =>
  `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`

// CSS named colours minus whites, blacks and grey spellings, described as spaced words for Jev.
export const PALETTE = Object.fromEntries(
  Object.entries(cssColors)
    .filter(([name]) => !SKIP.has(name))
    .map(([name, rgb]) => [name, { hex: hex(rgb), label: name.replace(WORDS, ' $1').trim() }]),
)

const CRITERIA = Object.fromEntries(Object.entries(PALETTE).map(([name, { label }]) => [name, label]))
// Jev rejects requests with roughly a thousand options in total; 6 items × 130 colours stays under.
const BATCH = 6

// The colour people would associate with each item, chosen by Jev from the palette.
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
