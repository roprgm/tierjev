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

// score and confidence come from Jev; a tile the user dragged has neither.
export type Placement = { name: string; tier: Tier; score?: number; confidence?: number }

export type RankRequest = { query: string; set: TierSet }

export type RankResponse = { placements: Placement[] }

export type Share = {
  title: string
  criterion: string
  items: Item[]
  placements: Placement[]
  jev: boolean
}
