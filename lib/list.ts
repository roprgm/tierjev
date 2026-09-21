import type { Item } from '@/lib/types'

const MIN = 3
const MAX = 40

// Turns a pasted "one item per line" list into items, or explains the first problem found.
export function parseList(text: string): { items: Item[] } | { error: string } {
  const lines = text.split('\n')
  const items: Item[] = []
  const seen = new Set<string>()
  for (const [i, raw] of lines.entries()) {
    const line = raw.trim()
    const at = `Line ${i + 1}`
    if (!line) {
      if (i === lines.length - 1) continue
      return { error: `${at} is empty.` }
    }
    if (line.includes(',')) return { error: `${at} has a comma. Put one item per line.` }
    if (line.length > 40) return { error: `${at} is longer than 40 characters.` }
    const key = line.toLowerCase()
    if (seen.has(key)) return { error: `${at} repeats "${line}".` }
    seen.add(key)
    items.push({ name: line })
  }
  if (items.length < MIN) return { error: `Add at least ${MIN} items.` }
  if (items.length > MAX) return { error: `Keep it to ${MAX} items or fewer.` }
  return { items }
}
