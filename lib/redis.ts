import { Redis } from '@upstash/redis'

// Null in local dev without Upstash: caching and rate limiting are skipped.
export const redis = process.env.UPSTASH_REDIS_REST_URL ? Redis.fromEnv() : null
