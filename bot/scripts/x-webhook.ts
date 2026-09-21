import { required } from './env'

const USAGE =
  'Usage: bun run bot:webhook register https://<domain>/api/webhooks/x | list | delete <webhookId>'
const [command, arg] = process.argv.slice(2)
const token = required('X_BEARER_TOKEN')

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`https://api.x.com${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
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
    const { data } = await api('POST', '/2/webhooks', { url: arg })
    return api('POST', '/2/activity/subscriptions', {
      event_type: 'post.mention.create',
      filter: { user_id: userId },
      webhook_id: data.id,
    })
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

const run = commands[command ?? '']
if (!run) {
  console.error(USAGE)
  process.exit(1)
}
await run()
