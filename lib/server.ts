import * as Sentry from '@sentry/nextjs'
import { Redis } from '@upstash/redis'

// Null in local dev without Upstash: caching and rate limiting are skipped.
const url = process.env.KV_REST_API_URL
const token = process.env.KV_REST_API_TOKEN
export const redis = url && token ? new Redis({ url, token }) : null

// Fixed hourly window per scope and IP. Returns seconds until reset once the limit is exceeded, else 0.
export async function rateLimited(scope: string, ip: string, limit: number) {
  if (!redis) return 0
  const window = Math.floor(Date.now() / 3_600_000)
  const key = `rl:${scope}:${ip}:${window}`
  const [count] = await redis.multi().incr(key).expire(key, 3600).exec<[number, number]>()
  if (count <= limit) return 0
  return Math.ceil(((window + 1) * 3_600_000 - Date.now()) / 1000)
}

export const clientIp = (request: Request) =>
  request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local'

export const normalize = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase()

export async function hashKey(prefix: string, ...parts: unknown[]) {
  const bytes = new TextEncoder().encode(JSON.stringify(parts))
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return `${prefix}:${Buffer.from(hash).toString('base64url')}`
}

// Logs for Vercel and forwards to Sentry when configured.
export function reportError(err: unknown, context?: Record<string, unknown>) {
  console.error(err)
  Sentry.captureException(err, context && { extra: context })
}
