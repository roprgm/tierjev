import type { StateAdapter } from 'chat'
import { log } from '@/bot/log'
import type { ThreadXAdapter } from '@/bot/x/adapter'
import { getAnswer } from '@/bot/x/answers'

const SINCE_KEY = 'x:poll:since'
const MAX_AGE_MS = 24 * 3_600_000

// X deactivates an Activity API subscription as soon as the account has no live OAuth token, and it has been
// seen dropping deliveries outright. This sweep answers whatever the webhook missed, and every call it makes
// refreshes the token, which is what keeps the subscription alive between mentions.
export async function pollMentions(x: ThreadXAdapter, state: StateAdapter) {
  const since = (await state.get<string>(SINCE_KEY)) ?? undefined
  const mentions = await x.fetchMentions(since)
  const newest = mentions[0]?.post.id
  if (newest) await state.set(SINCE_KEY, newest)

  const tasks: Promise<unknown>[] = []
  let handled = 0
  for (const mention of mentions.toReversed()) {
    if (stale(mention.post.created_at) || (await getAnswer(state, mention.post.id))) continue
    x.ingest(mention, { waitUntil: (task) => tasks.push(task) })
    handled += 1
  }
  await Promise.all(tasks)
  log('poll', { since: since ?? null, found: mentions.length, handled })
  return { found: mentions.length, handled }
}

// A mention the bot never saw in a day is not worth answering, and it keeps a first run from replying to a backlog.
const stale = (createdAt?: string) =>
  Boolean(createdAt) && Date.now() - Date.parse(createdAt as string) > MAX_AGE_MS
