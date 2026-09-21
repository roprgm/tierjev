import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Privacy' }

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-10 text-sm leading-6">
      <h1 className="text-2xl font-semibold tracking-tight">Privacy</h1>
      <p>
        tierjev is a free tool. There are no accounts and no tracking cookies. Here is exactly what leaves
        your browser and where it goes.
      </p>
      <section className="space-y-2">
        <h2 className="font-medium">What is sent to models</h2>
        <p>
          The set title, item names and your criterion are sent to TypeSafe AI's Jev through the Vercel AI
          Gateway to compute tiers, colours and a safety check. Topics you type to generate a set are sent to
          DeepSeek through the same gateway. Nothing else about you is attached.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">What is stored</h2>
        <p>
          Rankings, generated sets and colours are cached on our side for up to 30 days, keyed by their
          content, so repeated requests are instant. Your own sets and the credit counter live only in your
          browser's local storage. Your IP address is used for hourly rate limits and discarded within the
          hour.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">Sharing</h2>
        <p>
          A shared list is public to anyone with its link and is kept until you ask us to remove it. Do not
          share lists that contain personal information.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">Analytics</h2>
        <p>We use Vercel Web Analytics, which counts page views without cookies or cross-site identifiers.</p>
      </section>
      <p className="text-muted-foreground">
        Questions or removal requests: open an issue on{' '}
        <a className="underline" href="https://github.com/roprgm/tierjev">
          GitHub
        </a>
        .{' '}
        <Link href="/" className="underline">
          Back to tierjev
        </Link>
        .
      </p>
    </main>
  )
}
