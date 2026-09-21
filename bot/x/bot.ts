import { createMemoryState } from '@chat-adapter/state-memory'
import { createRedisState } from '@chat-adapter/state-redis'
import type { XRawMessage } from '@chat-adapter/x'
import { Chat, ConsoleLogger, type LogLevel, type StateAdapter } from 'chat'
import { answerThread } from '@/bot/answer/verdict'
import { log, logError } from '@/bot/log'
import { ThreadXAdapter } from '@/bot/x/adapter'
import { saveAnswer } from '@/bot/x/answers'

const MENTIONS_PER_AUTHOR_PER_HOUR = 20
const HOUR_MS = 3_600_000

type Deps = { x: ThreadXAdapter; state: StateAdapter; answer: typeof answerThread; logger?: LogLevel }

export function createBot({ x, state, answer, logger = 'info' }: Deps) {
  const bot = new Chat({ userName: x.userName, adapters: { x }, state, logger })

  bot.onNewMention(async (thread, message) => {
    const raw = message.raw as XRawMessage
    if (raw.kind !== 'post') return
    const { post } = raw
    const author = message.author.userName
    if (post.author_id === x.botUserId) {
      log('mention.self', { id: post.id })
      return
    }
    const started = Date.now()
    try {
      if (await overCap(state, post.author_id)) {
        log('mention.capped', { id: post.id, author })
        return
      }
      const posts = await x.fetchPosts(post.id)
      const verdict = await answer(posts)
      const ms = Date.now() - started
      log('mention', {
        id: post.id,
        author,
        posts: posts.length,
        reply: verdict.reply,
        confidence: verdict.confidence,
        ms,
      })
      if (verdict.reply) await thread.post(verdict.reply)
      await saveAnswer(state, {
        ...verdict,
        id: post.id,
        author,
        thread: posts,
        ms,
        at: new Date().toISOString(),
      })
    } catch (error) {
      logError('mention.failed', error, { id: post.id, author, ms: Date.now() - started })
    }
  })

  return bot
}

// Fixed hourly window per author. The read-then-write is not atomic, which is fine for an abuse cap.
async function overCap(state: StateAdapter, authorId = 'unknown') {
  const key = `cap:${authorId}:${Math.floor(Date.now() / HOUR_MS)}`
  const count = ((await state.get<number>(key)) ?? 0) + 1
  await state.set(key, count, HOUR_MS)
  return count > MENTIONS_PER_AUTHOR_PER_HOUR
}

let bot: ReturnType<typeof createBot> | undefined

export function getBot() {
  bot ??= createBot({
    x: new ThreadXAdapter(xConfig()),
    state: process.env.REDIS_URL ? createRedisState() : createMemoryState(),
    answer: answerThread,
  })
  return bot
}

// Mirrors createXAdapter's env handling, which the subclass cannot reuse.
function xConfig() {
  const { X_CONSUMER_SECRET, X_CLIENT_ID, X_REFRESH_TOKEN, X_USER_ACCESS_TOKEN } = process.env
  if (!X_CONSUMER_SECRET) throw new Error('X_CONSUMER_SECRET is required')
  if (!(X_USER_ACCESS_TOKEN || (X_CLIENT_ID && X_REFRESH_TOKEN))) {
    throw new Error('Set X_USER_ACCESS_TOKEN, or X_CLIENT_ID and X_REFRESH_TOKEN for managed OAuth refresh')
  }
  return {
    apiBaseUrl: process.env.X_API_BASE_URL,
    consumerSecret: X_CONSUMER_SECRET,
    clientId: X_CLIENT_ID,
    clientSecret: process.env.X_CLIENT_SECRET,
    refreshToken: X_REFRESH_TOKEN,
    userAccessToken: X_USER_ACCESS_TOKEN,
    encryptionKey: process.env.X_ENCRYPTION_KEY,
    userId: process.env.X_USER_ID,
    userName: process.env.X_USERNAME,
    logger: new ConsoleLogger('info').child('x'),
  }
}
