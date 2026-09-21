import type { TierSet } from '@/lib/types'
import catalogue from './catalogue.json'

// Pinned first; the rest keep the order they were generated in.
const PINNED = [
  'programming-languages',
  'ai-companies',
  'large-language-models',
  'tech-ceos',
  'frontend-frameworks',
  'cryptocurrencies',
]

// Trims generator verbosity: "… Tier List" suffixes and parenthetical asides in criteria.
const clean = (set: TierSet): TierSet => ({
  ...set,
  title: set.title.replace(/\s*tier list$/i, ''),
  criterion: set.criterion.replace(/\s*\(.*$/, '').trim(),
})

export const SETS: TierSet[] = [...(catalogue as TierSet[])].map(clean).sort((a, b) => {
  const ia = PINNED.indexOf(a.id)
  const ib = PINNED.indexOf(b.id)
  return (ia === -1 ? PINNED.length : ia) - (ib === -1 ? PINNED.length : ib)
})
