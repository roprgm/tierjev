import { ImageResponse } from 'next/og'
import type { Tier } from '@/lib/types'

export const OG_SIZE = { width: 1200, height: 630 }

const COLORS: Record<Tier, string> = {
  S: '#f27272',
  A: '#f2a35c',
  B: '#efc95a',
  C: '#e9e35c',
  D: '#a9df6d',
  F: '#8b93b3',
}

type Row = { tier: Tier; names: string[] }

// A dark tier board for social images; `aside` renders left of it when given.
export function boardImage(
  rows: Row[],
  header: { title: string; subtitle: string },
  options?: { rowHeight?: number; aside?: boolean; perRow?: number },
) {
  const rowHeight = options?.rowHeight ?? 74
  // A long list overflows the row and clips names mid-word, so show what fits and count the rest.
  const perRow = options?.perRow ?? 4
  const board = (
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
      {rows.map(({ tier, names }) => (
        <div key={tier} style={{ display: 'flex', height: rowHeight, borderBottom: '1px solid #262626' }}>
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
            {names.slice(0, perRow).map((name) => (
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
                {name.length > 20 ? `${[...name].slice(0, 19).join('')}…` : name}
              </div>
            ))}
            {names.length > perRow && (
              <div
                style={{
                  display: 'flex',
                  padding: '8px 14px',
                  fontSize: 22,
                  color: '#a1a1a1',
                  whiteSpace: 'nowrap',
                }}
              >
                +{names.length - perRow} more
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
  const base = {
    width: '100%',
    height: '100%',
    display: 'flex',
    background: '#0a0a0a',
    color: '#fafafa',
    fontFamily: 'sans-serif',
  } as const
  return new ImageResponse(
    options?.aside ? (
      <div style={{ ...base, padding: 56, gap: 48, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', width: 420 }}>
          <div style={{ fontSize: 72, fontWeight: 700, letterSpacing: -2 }}>{header.title}</div>
          <div style={{ fontSize: 28, color: '#a1a1a1', marginTop: 12, lineHeight: 1.3 }}>
            {header.subtitle}
          </div>
        </div>
        {board}
      </div>
    ) : (
      <div style={{ ...base, flexDirection: 'column', padding: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div
            style={{ fontSize: 40, fontWeight: 700, maxWidth: 950, overflow: 'hidden', whiteSpace: 'nowrap' }}
          >
            {header.title}
          </div>
          <div style={{ fontSize: 24, color: '#a1a1a1' }}>tierjev</div>
        </div>
        <div style={{ fontSize: 22, color: '#a1a1a1', marginTop: 4 }}>{header.subtitle}</div>
        <div style={{ display: 'flex', marginTop: 24 }}>{board}</div>
      </div>
    ),
    OG_SIZE,
  )
}
