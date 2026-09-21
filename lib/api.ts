import type { RankRequest, RankResponse, TierSet } from '@/lib/types'

export class ApiError extends Error {
  constructor(
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message)
  }
}

async function post<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!res.ok) throw new ApiError(data.error ?? 'Something went wrong', data.retryAfter)
  return data
}

export const rank = (req: RankRequest) => post<RankResponse>('/api/rank', req)
export const createSet = (topic: string) => post<TierSet>('/api/sets', { topic })
export const createShare = (share: unknown) => post<{ id: string }>('/api/share', share)
