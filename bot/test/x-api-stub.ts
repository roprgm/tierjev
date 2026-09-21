import { createHmac } from 'node:crypto'
import { ConsoleLogger } from 'chat'

export const CONSUMER_SECRET = 'consumer-secret'
export const silentLogger = new ConsoleLogger('silent')

export type Call = { method: string; path: string; body?: unknown }

// Serves GET /2/tweets/:id from the fixtures and records every request, including reply creation.
export function startXStub(fixtures: Record<string, unknown>, port = 0) {
  const calls: Call[] = []
  const server = Bun.serve({
    port,
    async fetch(request) {
      const { pathname } = new URL(request.url)
      const body = request.method === 'POST' ? await request.json() : undefined
      calls.push({ method: request.method, path: pathname, body })
      if (request.method === 'POST' && pathname === '/2/tweets') {
        return Response.json({ data: { id: '900', text: (body as { text: string }).text } })
      }
      const fixture = fixtures[pathname.match(/^\/2\/tweets\/([^/]+)$/)?.[1] ?? '']
      if (fixture) return Response.json(fixture)
      return Response.json({ errors: [{ title: 'Not Found Error', detail: pathname }] }, { status: 404 })
    },
  })
  return { url: `http://localhost:${server.port}`, calls, stop: () => server.stop(true) }
}

export function signedDelivery(
  event: unknown,
  secret = CONSUMER_SECRET,
  url = 'https://bot.example.com/api/webhooks/x',
) {
  const body = JSON.stringify({ data: event })
  const signature = createHmac('sha256', secret).update(body, 'utf8').digest('base64')
  return new Request(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-twitter-webhooks-signature': `sha256=${signature}` },
    body,
  })
}
