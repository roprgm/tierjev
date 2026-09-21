import { evaluate } from '@/lib/jev'

// One Jev boolean over user-supplied text before it becomes public or feeds a generator.
export async function isUnsafe(text: string): Promise<boolean> {
  const { unsafe } = await evaluate(text, {
    unsafe: {
      type: 'boolean',
      instructions:
        'Is this content targeting private individuals, sexualising anyone, degrading people by protected traits (race, religion, gender, disability, nationality), or promoting violence or self-harm? ' +
        'Ranking public figures, brands, products or fiction on ordinary criteria is fine.',
    },
  })
  return (unsafe.probability ?? 0) > 0.6
}
