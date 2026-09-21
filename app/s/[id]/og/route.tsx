import { boardImage } from '@/lib/og'
import { getShare } from '@/lib/shares'
import { TIERS } from '@/lib/types'

// Cached at the CDN for a year per id; the function runs once per id per region.
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const share = await getShare((await params).id)
  const label = (name: string) => {
    const emoji = share?.items.find((it) => it.name === name)?.emoji
    return emoji ? `${emoji} ${name}` : name
  }
  const rows = TIERS.map((tier) => ({
    tier,
    names: (share?.placements ?? []).filter((p) => p.tier === tier).map((p) => label(p.name)),
  }))
  const image = boardImage(rows, {
    title: share?.criterion ?? 'tierjev',
    subtitle: share ? `${share.title} · ranked ${share.jev ? 'by Jev' : 'by hand'}` : '',
  })
  image.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=31536000, immutable')
  return image
}
