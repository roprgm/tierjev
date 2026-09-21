import { $ } from 'bun'
import { signedDelivery, startXStub } from '@/bot/test/x-api-stub'
import { required } from './env'

const BOT_PORT = 5210
const API_PORT = 5301
const SECRET = 'local-secret'
const START_TIMEOUT_MS = 60_000
const REPLY_TIMEOUT_MS = 30_000

const texts = process.argv.slice(2)
if (texts.length === 0) {
  console.error('Usage: bun run bot:simulate "<post>" ["<reply>" ...] "<post that mentions the bot>"')
  process.exit(1)
}
required('AI_GATEWAY_API_KEY')

// A fresh thread per run, so the bot's dedupe and per-author cap never see the same ids twice.
const base = Date.now()
const users = texts.map((_, i) => ({ id: String(base + i), username: `user${i + 1}` }))
const posts = texts.map((text, i) => ({
  id: String(base + 100 + i),
  conversation_id: String(base + 100),
  text,
  author_id: users[i].id,
  referenced_tweets: i ? [{ type: 'replied_to', id: String(base + 100 + i - 1) }] : [],
}))
const fixtures = Object.fromEntries(
  posts.map((post, i) => [
    post.id,
    {
      data: post,
      includes: { tweets: i ? [posts[i - 1]] : [], users: users.slice(Math.max(0, i - 1), i + 1) },
    },
  ]),
)

// The dev server gets fake X credentials and the fake API; only AI_GATEWAY_API_KEY comes from .env.
const stub = startXStub(fixtures, API_PORT)
const server = Bun.spawn(['./node_modules/.bin/next', 'dev', '--port', String(BOT_PORT)], {
  env: {
    ...process.env,
    X_API_BASE_URL: `http://localhost:${API_PORT}`,
    X_CONSUMER_SECRET: SECRET,
    X_USER_ACCESS_TOKEN: 'local-token',
    X_USER_ID: '1',
    X_USERNAME: 'tierjev',
    X_CLIENT_ID: '',
    X_REFRESH_TOKEN: '',
    REDIS_URL: '',
  },
  stdout: 'pipe',
  stderr: 'pipe',
})
const output: string[] = []
forwardEvents(server.stdout, output)
forwardEvents(server.stderr, output)

try {
  await waitForServer(`http://localhost:${BOT_PORT}/`).catch((error) => {
    console.error(output.slice(-20).join('\n'))
    throw error
  })
  const mention = posts[posts.length - 1]
  const event = {
    event_type: 'post.mention.create',
    filter: { user_id: '1' },
    includes: { users },
    payload: mention,
  }
  const response = await fetch(signedDelivery(event, SECRET, `http://localhost:${BOT_PORT}/api/webhooks/x`))
  console.log(`Webhook: ${response.status} ${await response.text()}`)

  const deadline = Date.now() + REPLY_TIMEOUT_MS
  let reply: { text: string } | undefined
  while (!reply && Date.now() < deadline) {
    reply = stub.calls.find((call) => call.method === 'POST' && call.path === '/2/tweets')
      ?.body as typeof reply
    await Bun.sleep(250)
  }
  console.log(
    reply
      ? `Reply: ${reply.text}`
      : 'No reply within 30s: the bot stayed quiet or failed, see the events above',
  )
} finally {
  server.kill()
  await $`lsof -ti tcp:${BOT_PORT} | xargs kill`.quiet().nothrow()
  stub.stop()
}

async function waitForServer(url: string) {
  const deadline = Date.now() + START_TIMEOUT_MS
  while (Date.now() < deadline) {
    const ok = await fetch(url).then(
      (res) => res.ok,
      () => false,
    )
    if (ok) return
    await Bun.sleep(500)
  }
  throw new Error(`Dev server did not start within ${START_TIMEOUT_MS / 1000}s`)
}

// Prints the bot's JSON log lines (options, jev, mention) while the server runs and keeps the rest for errors.
async function forwardEvents(stream: ReadableStream<Uint8Array>, output: string[]) {
  const decoder = new TextDecoder()
  let rest = ''
  for await (const chunk of stream) {
    const lines = (rest + decoder.decode(chunk)).split('\n')
    rest = lines.pop() ?? ''
    for (const line of lines) {
      if (line.startsWith('{"event"') || line.includes('[Vercel Web Analytics]')) console.log(line)
      else if (line.trim()) output.push(line)
    }
  }
}
