import { ImageResponse } from 'next/og'
import { getShare } from '@/lib/shares'
import { TIERS, type Tier } from '@/lib/types'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const COLORS: Record<Tier, string> = {
  S: '#f27272',
  A: '#f2a35c',
  B: '#efc95a',
  C: '#e9e35c',
  D: '#a9df6d',
  F: '#8b93b3',
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const share = await getShare((await params).id)
  const rows = TIERS.map((tier) => ({
    tier,
    names: (share?.placements ?? [])
      .filter((p) => p.tier === tier)
      .sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
      .map((p) => {
        const item = share?.items.find((it) => it.name === p.name)
        return item?.emoji ? `${item.emoji} ${p.name}` : p.name
      }),
  }))

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0a0a0a',
        color: '#fafafa',
        padding: 48,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <div
          style={{ fontSize: 40, fontWeight: 700, maxWidth: 950, overflow: 'hidden', whiteSpace: 'nowrap' }}
        >
          {share?.criterion ?? 'tierjev'}
        </div>
        <div style={{ fontSize: 24, color: '#a1a1a1' }}>tierjev</div>
      </div>
      <div style={{ fontSize: 22, color: '#a1a1a1', marginTop: 4 }}>
        {share ? `${share.title} · ranked ${share.jev ? 'by Jev' : 'by hand'}` : ''}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          marginTop: 24,
          borderRadius: 16,
          overflow: 'hidden',
          border: '1px solid #262626',
        }}
      >
        {rows.map(({ tier, names }) => (
          <div key={tier} style={{ display: 'flex', height: 74, borderBottom: '1px solid #262626' }}>
            <div
              style={{
                width: 80,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 32,
                fontWeight: 700,
                color: '#111',
                background: COLORS[tier],
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
                overflow: 'hidden',
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
                    whiteSpace: 'nowrap',
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
