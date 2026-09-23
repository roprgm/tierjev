import { afterAll, beforeEach, expect, test } from 'bun:test'
import { createMemoryState } from '@chat-adapter/state-memory'
import { CONSUMER_SECRET, silentLogger, startXStub } from '@/bot/test/x-api-stub'
import { ThreadXAdapter } from '@/bot/x/adapter'
import { saveAnswer } from '@/bot/x/answers'
import { createBot } from '@/bot/x/bot'
import { pollMentions } from '@/bot/x/poll'

const BOT_ID = '999'
const mention = {
  id: '501',
  text: '@tierjev which planet is the largest?',
  author_id: '111',
  lang: 'en',
  created_at: new Date().toISOString(),
}
const stub = startXStub({
  mentions: { data: [mention], includes: { users: [{ id: '111', username: 'ada' }] } },
  '501': { data: mention, includes: { users: [{ id: '111', username: 'ada' }] } },
})
afterAll(() => stub.stop())
beforeEach(() => stub.calls.splice(0))

async function polling() {
  const x = new ThreadXAdapter({
    consumerSecret: CONSUMER_SECRET,
    userAccessToken: 'token',
    userId: BOT_ID,
    userName: 'tierjev',
    apiBaseUrl: stub.url,
    logger: silentLogger,
  })
  const state = createMemoryState()
  await state.connect()
  const bot = createBot({
    x,
    state,
    answer: async () => ({ reply: 'Jupiter', source: 'deepseek', options: ['Jupiter'] }),
    logger: 'silent',
  })
  await bot.initialize()
  return { x, state, bot }
}

const replies = () => stub.calls.filter((c) => c.method === 'POST' && c.path === '/2/tweets')

test('answers a mention the webhook never delivered and remembers where it got to', async () => {
  const { x, state } = await polling()
  expect(await pollMentions(x, state)).toEqual({ found: 1, handled: 1 })
  expect(replies().map((c) => c.body)).toEqual([{ reply: { in_reply_to_tweet_id: '501' }, text: 'Jupiter' }])
  expect(await state.get<string>('x:poll:since')).toBe('501')
})

test('skips a mention the webhook already answered', async () => {
  const { x, state } = await polling()
  await saveAnswer(state, {
    id: '501',
    at: new Date().toISOString(),
    ms: 10,
    thread: [],
    reply: 'Jupiter',
    source: 'deepseek',
    options: ['Jupiter'],
  })
  expect(await pollMentions(x, state)).toEqual({ found: 1, handled: 0 })
  expect(replies()).toHaveLength(0)
})

test('ignores a mention older than a day', async () => {
  const old = startXStub({
    mentions: {
      data: [{ ...mention, created_at: new Date(Date.now() - 48 * 3_600_000).toISOString() }],
      includes: { users: [] },
    },
  })
  const x = new ThreadXAdapter({
    consumerSecret: CONSUMER_SECRET,
    userAccessToken: 'token',
    userId: BOT_ID,
    userName: 'tierjev',
    apiBaseUrl: old.url,
    logger: silentLogger,
  })
  const state = createMemoryState()
  await state.connect()
  const bot = createBot({
    x,
    state,
    answer: async () => ({ reply: 'Jupiter', source: 'deepseek', options: [] }),
    logger: 'silent',
  })
  await bot.initialize()
  expect(await pollMentions(x, state)).toEqual({ found: 1, handled: 0 })
  old.stop()
})
