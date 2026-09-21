import type { RankRequest, RankResponse } from '@/lib/types'

export class RankError extends Error {
  constructor(
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message)
  }
}

export async function rank(req: RankRequest): Promise<RankResponse> {
  const res = await fetch('/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  const body = await res.json()
  if (!res.ok) throw new RankError(body.error ?? 'Something went wrong', body.retryAfter)
  return body
}
