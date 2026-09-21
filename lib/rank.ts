import type { RankRequest, RankResponse } from '@/lib/types'

export async function rank(req: RankRequest): Promise<RankResponse> {
  const res = await fetch('/api/classify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error ?? 'Something went wrong')
  return body
}
