// One JSON line per event, searchable in Vercel logs. Silent under `bun test`, where failure paths are exercised on purpose.
const silent = process.env.NODE_ENV === 'test'

export function log(event: string, data: Record<string, unknown> = {}) {
  if (!silent) console.log(JSON.stringify({ event, ...data }))
}

export function logError(event: string, error: unknown, data: Record<string, unknown> = {}) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  if (!silent) console.error(JSON.stringify({ event, ...data, error: message }))
}
