import type { Item, RankRequest, RankResponse, TierSet } from '@/lib/types'

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
export const createShare = (share: unknown) => post<{ id: string }>('/api/share', share)
export const pickColors = (title: string, items: string[]) =>
  post<{ colors: Record<string, string> }>('/api/colors', { title, items })

export type SetPartial = { title?: string; emoji?: string; criterion?: string; items?: Partial<Item>[] }

// Reads the NDJSON stream from /api/sets, reporting partial drafts, and resolves with the final set.
export async function streamSet(topic: string, onPartial: (draft: SetPartial) => void): Promise<TierSet> {
  const res = await fetch('/api/sets', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  })
  if (res.headers.get('content-type')?.includes('application/json')) {
    const data = await res.json()
    if (!res.ok) throw new ApiError(data.error ?? 'Something went wrong', data.retryAfter)
    return data
  }
  const reader = res.body?.getReader()
  if (!reader) throw new ApiError('No response')
  const decoder = new TextDecoder()
  let buffer = ''
  let final: TierSet | undefined
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line) continue
      const message = JSON.parse(line)
      if (message.error) throw new ApiError(message.error)
      if (message.done) final = message.done
      else onPartial(message)
    }
  }
  if (!final) throw new ApiError('Generation stopped early.')
  return final
}
