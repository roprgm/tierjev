import { afterAll, beforeEach, expect, test } from 'bun:test'
import { createMemoryState } from '@chat-adapter/state-memory'
import { CONSUMER_SECRET, signedDelivery, silentLogger, startXStub } from '@/bot/test/x-api-stub'
import { ThreadXAdapter } from '@/bot/x/adapter'
import { listAnswers } from '@/bot/x/answers'
import { createBot } from '@/bot/x/bot'

const BOT_ID = '999'
const TEXT = '@jevbot which planet is the largest?'
const ids = ['501', ...Array.from({ length: 21 }, (_, i) => String(600 + i))]
const stub = startXStub(
  Object.fromEntries(
    ids.map((id) => [
      id,
      {
        data: { id, text: TEXT, author_id: '111', lang: 'en' },
        includes: { users: [{ id: '111', username: 'ada' }] },
      },
    ]),
  ),
)
afterAll(() => stub.stop())
beforeEach(() => stub.calls.splice(0))

const mention = (overrides: Record<string, unknown> = {}) => ({
  event_type: 'post.mention.create',
  filter: { user_id: BOT_ID },
  includes: { users: [{ id: '111', name: 'Ada', username: 'ada' }] },
  payload: { id: '501', text: TEXT, author_id: '111', conversation_id: '500', ...overrides },
})

const verdict = (reply: string | null) => async () => ({
  reply,
  source: 'deepseek' as const,
  options: ['Jupiter'],
  confidence: 0.9,
})

function botWith(answer: ReturnType<typeof verdict>) {
  const x = new ThreadXAdapter({
    consumerSecret: CONSUMER_SECRET,
    userAccessToken: 'token',
    userId: BOT_ID,
    userName: 'jevbot',
    apiBaseUrl: stub.url,
    logger: silentLogger,
  })
  const state = createMemoryState()
  return Object.assign(createBot({ x, state, answer, logger: 'silent' }), { state })
}

async function deliver(bot: ReturnType<typeof botWith>, request: Request) {
  const tasks: Promise<unknown>[] = []
  const response = await bot.webhooks.x(request, { waitUntil: (task) => tasks.push(task) })
  await Promise.all(tasks)
  return response
}

const replies = () => stub.calls.filter((c) => c.method === 'POST' && c.path === '/2/tweets')

test('replies to the mention with the answer', async () => {
  const bot = botWith(verdict('Jupiter'))
  const response = await deliver(bot, signedDelivery(mention()))
  expect(response.status).toBe(200)
  expect(stub.calls.map((c) => c.path)).toContain('/2/tweets/501')
  expect(replies().map((c) => c.body)).toEqual([{ reply: { in_reply_to_tweet_id: '501' }, text: 'Jupiter' }])
  const [record] = await listAnswers(bot.state, 10)
  expect(record).toMatchObject({
    id: '501',
    author: 'ada',
    reply: 'Jupiter',
    confidence: 0.9,
    options: ['Jupiter'],
  })
  expect(record.thread.map((p) => p.id)).toEqual(['501'])
})

test('stays quiet when there is no answer', async () => {
  await deliver(botWith(verdict(null)), signedDelivery(mention()))
  expect(replies()).toHaveLength(0)
})

test('handles a delivery only once', async () => {
  const bot = botWith(verdict('Jupiter'))
  await deliver(bot, signedDelivery(mention()))
  await deliver(bot, signedDelivery(mention()))
  expect(replies()).toHaveLength(1)
})

test('ignores posts written by the bot itself', async () => {
  await deliver(botWith(verdict('Jupiter')), signedDelivery(mention({ author_id: BOT_ID })))
  expect(stub.calls).toHaveLength(0)
})

test('rejects a delivery with a bad signature', async () => {
  const response = await deliver(botWith(verdict('Jupiter')), signedDelivery(mention(), 'wrong'))
  expect(response.status).toBe(401)
  expect(stub.calls).toHaveLength(0)
})

test('caps the mentions answered per author and hour', async () => {
  const bot = botWith(verdict('Jupiter'))
  for (let i = 0; i < 21; i++) await deliver(bot, signedDelivery(mention({ id: String(600 + i) })))
  expect(replies()).toHaveLength(20)
})
