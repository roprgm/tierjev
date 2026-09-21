import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import './globals.css'

const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? (productionUrl ? `https://${productionUrl}` : 'http://localhost:3000')

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'tierjev', template: '%s · tierjev' },
  description:
    'Tier lists ranked by Jev, the classifier model. Pick a set, state a criterion, share the result.',
  openGraph: { siteName: 'tierjev', type: 'website' },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
