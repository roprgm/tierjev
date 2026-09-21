import { cache } from 'react'
import type { Share } from '@/lib/types'

const ID = /^[a-zA-Z0-9]{8}$/

// Plain fetch with force-cache instead of the SDK: the SDK's no-store requests would make the
// statically cached share pages dynamic. A share never changes, so caching the read forever is safe.
export const getShare = cache(async (id: string): Promise<Share | null> => {
  const url = process.env.KV_REST_API_URL
  const token = process.env.KV_REST_API_TOKEN
  if (!url || !token || !ID.test(id)) return null
  const res = await fetch(`${url}/get/share:${id}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'force-cache',
  })
  const { result } = (await res.json()) as { result: string | null }
  return result ? JSON.parse(result) : null
})
