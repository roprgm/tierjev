import { boardImage, OG_SIZE } from '@/lib/og'

export const size = OG_SIZE
export const contentType = 'image/png'

export default function Image() {
  return boardImage(
    [
      { tier: 'S', names: ['🐍 Python', '🦀 Rust'] },
      { tier: 'A', names: ['🟨 JavaScript', '🔷 TypeScript', '🐹 Go'] },
      { tier: 'B', names: ['☕ Java', '🎯 Kotlin', '🍎 Swift'] },
      { tier: 'C', names: ['💎 Ruby', '🐘 PHP'] },
      { tier: 'D', names: ['λ Haskell'] },
    ],
    {
      title: 'tierjev',
      subtitle:
        'Tier lists ranked by Jev, the classifier model. Pick a set, state a criterion, share the result.',
    },
    { rowHeight: 80, aside: true },
  )
}
