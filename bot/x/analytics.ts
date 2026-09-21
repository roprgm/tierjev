import { AsyncLocalStorage } from 'node:async_hooks'
import { track } from '@vercel/analytics/server'
import { logError } from '@/bot/log'
import type { AnswerRecord } from '@/bot/x/answers'

const requestHeaders = new AsyncLocalStorage<Headers>()
const FALLBACK_HEADERS = { 'user-agent': 'tierjev-bot' }

// Runs the webhook handling with the request headers that Vercel Analytics needs on every server event.
export const withRequest = <T>(request: Request, handle: () => T) =>
  requestHeaders.run(request.headers, handle)

export function mentionEvent(record: AnswerRecord) {
  const name = record.error ? 'bot_failed' : record.reply ? 'bot_reply' : 'bot_silent'
  return {
    name,
    properties: {
      source: record.source,
      options: record.options.length,
      posts: record.thread.length,
      confidence: record.confidence ?? null,
      ms: record.ms,
      error: record.error ?? null,
    },
  }
}

export async function trackMention(record: AnswerRecord) {
  const { name, properties } = mentionEvent(record)
  await send(name, properties)
}

export const trackCapped = () => send('bot_capped', {})

async function send(name: string, properties: Record<string, string | number | boolean | null>) {
  if (process.env.NODE_ENV === 'test') return
  try {
    await track(name, properties, { headers: requestHeaders.getStore() ?? FALLBACK_HEADERS })
  } catch (error) {
    logError('analytics.failed', error, { name })
  }
}
