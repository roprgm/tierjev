export function log(event: string, data: Record<string, unknown> = {}) {
  console.log(JSON.stringify({ event, ...data }))
}

export function logError(event: string, error: unknown, data: Record<string, unknown> = {}) {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  console.error(JSON.stringify({ event, ...data, error: message }))
}
