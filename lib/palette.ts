import cssColors from 'color-name'

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
export const PALETTE: Record<string, { hex: string; label: string }> = Object.fromEntries(
  Object.entries(cssColors)
    .filter(([name]) => !SKIP.has(name))
    .map(([name, rgb]) => [name, { hex: hex(rgb), label: name.replace(WORDS, ' $1').trim() }]),
)

// A hand-picked spread for the picker.
export const SWATCHES = [
  'crimson',
  'tomato',
  'orange',
  'gold',
  'yellow',
  'yellowgreen',
  'limegreen',
  'green',
  'teal',
  'deepskyblue',
  'dodgerblue',
  'royalblue',
  'navy',
  'indigo',
  'purple',
  'orchid',
  'hotpink',
  'brown',
  'saddlebrown',
  'tan',
  'khaki',
  'silver',
  'gray',
  'dimgray',
].map((name) => PALETTE[name].hex)
