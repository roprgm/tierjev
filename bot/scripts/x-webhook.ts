import { createRedisState } from '@chat-adapter/state-redis'
import { ConsoleLogger } from 'chat'
import { answerThread } from '@/bot/answer/verdict'
import { ThreadXAdapter } from '@/bot/x/adapter'
import { createBot } from '@/bot/x/bot'
import { required } from './env'

const EVENT = 'post.mention.create'
const USAGE =
  'Usage: bun run bot:webhook register https://<domain>/api/webhooks/x | list | delete <webhookId>'
const [command, arg] = process.argv.slice(2)
const token = required('X_BEARER_TOKEN')

// Webhooks take the app token; mention subscriptions need the bot user's own OAuth 2.0 access token.
async function api(method: string, path: string, body?: unknown, auth = token) {
  const res = await fetch(`https://api.x.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${auth}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`)
  console.log(`${method} ${path} -> ${res.status} ${text}`)
  return text ? JSON.parse(text) : undefined
}

const commands: Record<string, () => Promise<unknown>> = {
  async register() {
    if (!arg) throw new Error(USAGE)
    const userId = required('X_USER_ID')
    await preflight(arg)
    const webhooks = (await api('GET', '/2/webhooks')).data as { id: string; url: string }[] | undefined
    const webhookId =
      webhooks?.find((w) => w.url === arg)?.id ?? (await api('POST', '/2/webhooks', { url: arg })).data.id
    const subscriptions = (await api('GET', '/2/activity/subscriptions')).data as
      | { event_type: string; filter?: { user_id?: string } }[]
      | undefined
    if (subscriptions?.some((s) => s.event_type === EVENT && s.filter?.user_id === userId)) {
      return console.log('Mention subscription already exists')
    }
    return api(
      'POST',
      '/2/activity/subscriptions',
      { event_type: EVENT, filter: { user_id: userId }, webhook_id: webhookId },
      await userToken(),
    )
  },
  async list() {
    await api('GET', '/2/webhooks')
    return api('GET', '/2/activity/subscriptions')
  },
  async delete() {
    if (!arg) throw new Error(USAGE)
    return api('DELETE', `/2/webhooks/${arg}`)
  },
}

// X rejects a webhook whose CRC answer is not a plain 200, and a bare domain often redirects to www.
async function preflight(url: string) {
  const res = await fetch(`${url}?crc_token=preflight0123456`, { redirect: 'manual' })
  const target = res.headers.get('location')
  if (target) throw new Error(`${url} redirects to ${target.split('?')[0]}; register that URL instead`)
  if (!res.ok) throw new Error(`${url} answered ${res.status} to the CRC check; deploy the bot first`)
}

// The subscription call needs a live user-context token. X deactivates a subscription once the account has
// none, so mint it from the bot's own refresh chain rather than the two-hour X_USER_ACCESS_TOKEN.
async function userToken() {
  const x = new ThreadXAdapter({
    consumerSecret: required('X_CONSUMER_SECRET'),
    clientId: required('X_CLIENT_ID'),
    clientSecret: process.env.X_CLIENT_SECRET,
    refreshToken: required('X_REFRESH_TOKEN'),
    encryptionKey: process.env.X_ENCRYPTION_KEY,
    userId: process.env.X_USER_ID,
    userName: process.env.X_USERNAME,
    logger: new ConsoleLogger('warn').child('x'),
  })
  const state = createRedisState()
  await createBot({ x, state, answer: answerThread, logger: 'silent' }).initialize()
  try {
    return await x.userToken()
  } finally {
    await state.disconnect()
  }
}

const run = commands[command ?? '']
if (!run) {
  console.error(USAGE)
  process.exit(1)
}
await run()
