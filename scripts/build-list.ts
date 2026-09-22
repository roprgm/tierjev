// Turns a scraped catalogue into a ranked, shareable tier list.
// Enriched items are checkpointed to data/<name>-items.json so a failed run resumes instead of repeating work.
// Usage: bun --env-file=.env.local scripts/build-list.ts [--limit N] [--batch N] [--criterion "..."]
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import { pickColors, type Scored, scoreItems, toTiers } from '@/lib/jev'
import { truncate } from '@/lib/parse'
import { redis } from '@/lib/server'
import type { Item, Share } from '@/lib/types'

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const LIMIT = Number(arg('limit', '10'))
const BATCH = Number(arg('batch', '40'))
const PAUSE = Number(arg('pause', '1500'))
const CRITERION = arg('criterion', 'Most impressive use of Jev')
const TITLE = arg('title', 'Built with Jev')
const CHECKPOINT = 'data/shipwithjev-items.json'
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

type Build = { name: string; slug: string; kind: string; category: string; description: string }

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const emojiSchema = z.object({ items: z.array(z.object({ name: z.string(), emoji: z.string().max(8) })) })

// DeepSeek picks one emoji per build; Jev colours whatever it leaves without one.
async function addEmoji(items: Item[]): Promise<Item[]> {
  const out: Item[] = []
  for (let start = 0; start < items.length; start += 25) {
    const batch = items.slice(start, start + 25)
    try {
      const { output } = await generateText({
        model: 'deepseek/deepseek-v4.1-flash',
        output: Output.object({ schema: emojiSchema }),
        maxOutputTokens: 1500,
        providerOptions: { deepseek: { thinking: { type: 'disabled' } } },
        instructions:
          'Give each item the single emoji that best represents what it is. Keep the names exactly as given.',
        prompt: batch.map((it) => `${it.name}: ${it.description ?? ''}`).join('\n'),
      })
      const byName = new Map(output.items.map((i) => [i.name.toLowerCase(), i.emoji]))
      out.push(...batch.map((it) => ({ ...it, emoji: byName.get(it.name.toLowerCase()) })))
    } catch (err) {
      console.warn('  emoji batch failed:', err instanceof Error ? err.message : err)
      out.push(...batch)
    }
    console.log(`  emoji ${out.length}/${items.length}`)
  }
  return out
}

// Ranks a batch, halving it when the provider keeps refusing, so one bad batch cannot end the run.
async function scoreResilient(items: Item[], context: Item[]): Promise<Scored[]> {
  try {
    const scored = await scoreItems(CRITERION, items, context)
    await wait(PAUSE)
    return scored
  } catch (err) {
    if (items.length <= 5) {
      console.warn(`  giving up on ${items.length}: ${err instanceof Error ? err.message.slice(0, 60) : err}`)
      return items.map((it) => ({ name: it.name, score: 0, confidence: 0 }))
    }
    console.warn(`  batch of ${items.length} refused, splitting`)
    await wait(PAUSE * 2)
    const half = Math.ceil(items.length / 2)
    return [
      ...(await scoreResilient(items.slice(0, half), context)),
      ...(await scoreResilient(items.slice(half), context)),
    ]
  }
}

const builds: Build[] = JSON.parse(readFileSync('data/shipwithjev.json', 'utf8'))
const chosen = builds.slice(0, LIMIT)
console.log(`${chosen.length} builds · "${CRITERION}"`)

let items: Item[]
if (existsSync(CHECKPOINT)) {
  const saved: Item[] = JSON.parse(readFileSync(CHECKPOINT, 'utf8'))
  const byName = new Map(saved.map((it) => [it.name, it]))
  if (chosen.every((b) => byName.has(b.name))) {
    items = chosen.map((b) => byName.get(b.name) as Item)
    console.log(`reusing ${items.length} enriched items from ${CHECKPOINT}`)
  }
}
items ??= await (async () => {
  const base = chosen.map((b) => ({
    name: b.name,
    description: truncate(`${b.category}. ${b.description}`, 280),
  }))
  const withEmoji = await addEmoji(base)
  const missing = withEmoji.filter((it) => !it.emoji)
  console.log(`emoji: ${withEmoji.length - missing.length}/${withEmoji.length}`)
  if (missing.length > 0) {
    const colors = await pickColors(
      TITLE,
      missing.map((it) => it.name),
    )
    for (const it of withEmoji) if (!it.emoji && colors[it.name]) it.color = colors[it.name]
    console.log(`colours: ${Object.keys(colors).length}/${missing.length}`)
  }
  writeFileSync(CHECKPOINT, JSON.stringify(withEmoji, null, 2))
  return withEmoji
})()

// Every batch sees the whole list as context, then the curve runs once over every score.
const scored: Scored[] = []
for (let start = 0; start < items.length; start += BATCH) {
  scored.push(...(await scoreResilient(items.slice(start, start + BATCH), items)))
  console.log(`  scored ${scored.length}/${items.length}`)
}
const placements = toTiers(scored)

const share: Share = {
  title: TITLE,
  criterion: CRITERION,
  items,
  placements,
  jev: true,
}
const id = Array.from(crypto.getRandomValues(new Uint8Array(8)), (b) => ALPHABET[b % ALPHABET.length]).join(
  '',
)
if (!redis) throw new Error('Redis is not configured')
await redis.set(`share:${id}`, share, { nx: true })

const spread: Record<string, number> = {}
for (const p of share.placements) spread[p.tier] = (spread[p.tier] ?? 0) + 1
console.log('\ntiers:', spread)
console.log(
  'top:',
  share.placements
    .slice(0, 6)
    .map((p) => `${p.tier} ${p.name}`)
    .join(', '),
)
console.log(`\nhttps://www.tierjev.com/s/${id}`)
