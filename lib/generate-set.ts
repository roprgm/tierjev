import { Output, streamText } from 'ai'
import { z } from 'zod'
import type { TierSet } from '@/lib/types'

const MODEL = 'deepseek/deepseek-v4.1-flash'

export const setSchema = z.object({
  title: z.string().max(40).describe('Short set title in the language of the topic'),
  emoji: z.string().max(8).describe('One emoji for the set'),
  criterion: z
    .string()
    .max(80)
    .describe(
      'A ranking question for the items, never a description of the set. Start with Best, Most or Worst, e.g. "Best place to retire", "Most overrated"',
    ),
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

export type SetDraft = z.infer<typeof setSchema>

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Streams partial drafts as DeepSeek writes them; the caller finalises the last one.
export function streamSet(topic: string) {
  return streamText({
    model: MODEL,
    output: Output.object({ schema: setSchema }),
    maxOutputTokens: 1200,
    providerOptions: { deepseek: { thinking: { type: 'disabled' } } },
    instructions:
      'You build sets of items for tier lists. Return well-known, real, distinct items that fit the topic. ' +
      'Prefer 20 to 30 items. Use concise names people would recognise. Answer in the language of the topic. ' +
      'The criterion must be something to rank the items by, not a restatement of the topic.',
    prompt: `Topic: ${topic}`,
  }).partialOutputStream
}

export function finalizeSet(topic: string, draft: unknown): TierSet {
  const output = setSchema.parse(draft)
  const seen = new Set<string>()
  const items = output.items.filter((it) => {
    const key = it.name.trim().toLowerCase()
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  return { id: `custom-${slug(topic)}`, ...output, items }
}
