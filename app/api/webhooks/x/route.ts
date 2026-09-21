import { after } from 'next/server'
import { withRequest } from '@/bot/x/analytics'
import { getBot } from '@/bot/x/bot'

export const runtime = 'nodejs'
export const maxDuration = 30

export function GET(request: Request) {
  return getBot().webhooks.x(request)
}

export function POST(request: Request) {
  return withRequest(request, () => getBot().webhooks.x(request, { waitUntil: (task) => after(() => task) }))
}
