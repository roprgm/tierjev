import { generateText, Output } from 'ai'
import { z } from 'zod'
import type { TierSet } from '@/lib/types'

const MODEL = 'deepseek/deepseek-v4.1-flash'

const schema = z.object({
  title: z.string().max(40).describe('Short set title in the language of the topic'),
  emoji: z.string().max(8).describe('One emoji for the set'),
  criterion: z
    .string()
    .max(80)
    .describe('A natural default ranking question for this set, e.g. "Best for beginners"'),
  items: z
    .array(
      z.object({
        name: z.string().max(40),
        emoji: z.string().max(8).describe('One emoji that best represents the item'),
      }),
    )
    .min(12)
    .max(30),
})

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export async function generateSet(topic: string): Promise<TierSet> {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema }),
    maxOutputTokens: 1200,
    providerOptions: { deepseek: { thinking: { type: 'disabled' } } },
    instructions:
      'You build sets of items for tier lists. Return well-known, real, distinct items that fit the topic. ' +
      'Prefer 20 to 30 items. Use concise names people would recognise. Answer in the language of the topic.',
    prompt: `Topic: ${topic}`,
  })
  const seen = new Set<string>()
  const items = output.items.filter((it) => {
    const key = it.name.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  return { id: `custom-${slug(topic)}`, ...output, items }
}
