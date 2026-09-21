// Builds data/catalogue.json from a list of topics with DeepSeek (names, emoji, criterion) and Jev (colours).
// Usage: bun --env-file=.env.local scripts/generate-catalogue.ts

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { finalizeSet, streamSet } from '@/lib/generate-set'
import { pickColors } from '@/lib/jev'
import type { TierSet } from '@/lib/types'

// Pass topics as arguments to regenerate only those and merge into the existing file.
const TOPICS =
  process.argv.length > 2
    ? process.argv.slice(2)
    : [
        'AI companies',
        'AI chatbots and assistants',
        'Large language models',
        'Tech CEOs',
        'Big Tech companies',
        'Programming languages',
        'Frontend frameworks',
        'Databases',
        'Cloud providers',
        'Code editors and IDEs',
        'Cryptocurrencies',
        'Social media apps',
        'Streaming services',
        'Smartphone brands',
        'Electric car brands',
        'Video game consoles of all time',
        'Video game franchises',
        'Nintendo characters',
        'Marvel Cinematic Universe films',
        'Pixar films',
        'Studio Ghibli films',
        'Sitcoms of all time',
        'Netflix original series',
        'Rock bands of all time',
        'Pop stars of the 2020s',
        'Football clubs in Europe',
        'Formula 1 teams',
        'NBA teams',
        'Olympic sports',
        'Martial arts',
        'Fast food chains',
        'Coffee chains',
        'Pizza toppings',
        'Fruits',
        'Breakfast foods',
        'Cuisines of the world',
        'Dog breeds',
        'Countries of South America',
        'European capitals',
        'Planets and moons of the solar system',
        'Sneaker brands',
        'Luxury fashion houses',
        'Airlines',
        'Board games',
        'Philosophers',
      ]

const existing: TierSet[] = existsSync('data/catalogue.json')
  ? JSON.parse(readFileSync('data/catalogue.json', 'utf8'))
  : []
const out: TierSet[] = process.argv.length > 2 ? existing : []
for (const topic of TOPICS) {
  try {
    let last: unknown
    for await (const partial of streamSet(topic, 'English')) last = partial
    const set = finalizeSet(topic, last)
    const colors = await pickColors(
      set.title,
      set.items.map((it) => it.name),
    )
    set.items = set.items.map((it) => (colors[it.name] ? { ...it, color: colors[it.name] } : it))
    set.id = topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    const at = out.findIndex((s) => s.id === set.id)
    if (at === -1) out.push(set)
    else out[at] = set
    console.log(`✓ ${set.emoji} ${set.title} (${set.items.length}) · ${set.criterion}`)
  } catch (err) {
    console.error(`✗ ${topic}:`, err instanceof Error ? err.message : err)
  }
  writeFileSync('data/catalogue.json', JSON.stringify(out, null, 2))
}
console.log(`done: ${out.length}/${TOPICS.length}`)
