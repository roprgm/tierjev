import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TierBoard } from '@/components/TierBoard'
import { getShare } from '@/lib/shares'

// Rendered once per id, then served from the cache. Never calls Jev.
export const dynamicParams = true
export function generateStaticParams() {
  return []
}

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const share = await getShare(id)
  if (!share) return { title: 'Not found' }
  const title = `${share.criterion} · ${share.title}`
  const description = `${share.title} ranked ${share.jev ? 'by Jev' : 'by hand'} on tierjev.`
  const images = [{ url: `/s/${id}/og`, width: 1200, height: 630 }]
  return {
    title,
    description,
    openGraph: { title, description, type: 'article', images },
    twitter: { card: 'summary_large_image', title, description, images },
  }
}

export default async function SharePage({ params }: Props) {
  const share = await getShare((await params).id)
  if (!share) notFound()

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{share.criterion}</h1>
        <p className="text-sm text-muted-foreground">
          {share.title} · ranked {share.jev ? 'by Jev' : 'by hand'}
        </p>
      </header>
      <TierBoard items={share.items} placements={share.placements} />
      <footer className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Made with tierjev</span>
        <Link
          href="/"
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
        >
          Rank your own
        </Link>
      </footer>
    </main>
  )
}
