import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const TIERS = [
  ['S', '#f27272', ['🐍 Python', '🦀 Rust']],
  ['A', '#f2a35c', ['🟨 JavaScript', '🔷 TypeScript', '🐹 Go']],
  ['B', '#efc95a', ['☕ Java', '🎯 Kotlin', '🍎 Swift']],
  ['C', '#e9e35c', ['💎 Ruby', '🐘 PHP']],
  ['D', '#a9df6d', ['λ Haskell']],
] as const

export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#0a0a0a',
        color: '#fafafa',
        padding: 56,
        fontFamily: 'sans-serif',
        gap: 48,
        alignItems: 'center',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', width: 420 }}>
        <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>tierjev</div>
        <div style={{ fontSize: 28, color: '#a1a1a1', marginTop: 12, lineHeight: 1.3 }}>
          Tier lists ranked by Jev, the classifier model. Pick a set, state a criterion, share the result.
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          flex: 1,
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid #262626',
        }}
      >
        {TIERS.map(([tier, color, names]) => (
          <div key={tier} style={{ display: 'flex', height: 80, borderBottom: '1px solid #262626' }}>
            <div
              style={{
                width: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 34,
                fontWeight: 700,
                color: '#111',
                background: color,
              }}
            >
              {tier}
            </div>
            <div
              style={{
                display: 'flex',
                flex: 1,
                alignItems: 'center',
                gap: 8,
                padding: '0 12px',
                background: '#171717',
              }}
            >
              {names.map((name) => (
                <div
                  key={name}
                  style={{
                    display: 'flex',
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #333',
                    background: '#0a0a0a',
                    fontSize: 22,
                  }}
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>,
    size,
  )
}
