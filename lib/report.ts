import * as Sentry from '@sentry/nextjs'

// Logs for Vercel and forwards to Sentry when configured.
export function reportError(err: unknown, context?: Record<string, unknown>) {
  console.error(err)
  Sentry.captureException(err, context && { extra: context })
}
