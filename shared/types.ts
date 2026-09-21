export const TIERS = ['S', 'A', 'B', 'C', 'D', 'F'] as const
export type Tier = (typeof TIERS)[number]

export type Item = { name: string; emoji?: string; image?: string }

export type TierSet = {
  id: string
  title: string
  emoji: string
  criterion: string
  items: Item[]
}

export type RankRequest = { criterion: string; items: Item[] }

export type Placement = { name: string; tier: Tier; score: number; confidence: number }

export type RankResponse = { placements: Placement[] }
