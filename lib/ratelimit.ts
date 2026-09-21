import { redis } from '@/lib/redis'

// Fixed hourly window per scope and IP. Returns seconds until reset once the limit is exceeded, else 0.
export async function rateLimited(scope: string, ip: string, limit: number) {
  if (!redis) return 0
  const window = Math.floor(Date.now() / 3_600_000)
  const key = `rl:${scope}:${ip}:${window}`
  const [count] = await redis.multi().incr(key).expire(key, 3600).exec<[number, number]>()
  if (count <= limit) return 0
  return Math.ceil(((window + 1) * 3_600_000 - Date.now()) / 1000)
}

export function clientIp(request: Request) {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'local'
}
