import * as Sentry from '@sentry/nextjs'

// No-op until the Sentry integration injects the DSN.
Sentry.init({ dsn: process.env.NEXT_PUBLIC_SENTRY_DSN, tracesSampleRate: 0, sendDefaultPii: false })

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
