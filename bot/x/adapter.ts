import { XAdapter, type XApiResponse, type XPost, type XUser } from '@chat-adapter/x'
import type { WebhookOptions } from 'chat'
import { MAX_PARENTS } from '@/bot/answer/thread'
import type { Post } from '@/bot/answer/types'
import { logError } from '@/bot/log'

const LOOKUP_TIMEOUT_MS = 4_000
const LOOKUP_QUERY = new URLSearchParams({
  'tweet.fields': 'text,author_id,conversation_id,lang,note_tweet,referenced_tweets',
  expansions: 'author_id,referenced_tweets.id,referenced_tweets.id.author_id',
  'user.fields': 'username',
}).toString()
const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>' }
const MENTIONS_QUERY = new URLSearchParams({
  'tweet.fields': 'text,author_id,conversation_id,lang,note_tweet,referenced_tweets,created_at',
  expansions: 'author_id',
  'user.fields': 'username',
  max_results: '10',
}).toString()

type Reference = { type: 'replied_to' | 'quoted' | 'retweeted'; id: string }
type LookupPost = XPost & { note_tweet?: { text: string }; referenced_tweets?: Reference[] }
type Lookup = XApiResponse<LookupPost> & { includes?: { tweets?: LookupPost[]; users?: XUser[] } }
type Mentions = XApiResponse<LookupPost[]> & { includes?: { users?: XUser[] } }
export type Mention = { post: LookupPost; author?: XUser }

const referenceId = (post: LookupPost, type: Reference['type']) =>
  post.referenced_tweets?.find((ref) => ref.type === type)?.id

export class ThreadXAdapter extends XAdapter {
  // Oldest to newest: the ancestors within budget, the summons' quoted post if any, then the summons.
  async fetchPosts(postId: string): Promise<Post[]> {
    const posts = new Map<string, LookupPost>()
    const usernames = new Map<string, string>()
    const remember = (lookup: Lookup) => {
      for (const post of [lookup.data, ...(lookup.includes?.tweets ?? [])]) if (post) posts.set(post.id, post)
      for (const user of lookup.includes?.users ?? [])
        if (user.username) usernames.set(user.id, user.username)
    }
    remember(await this.lookup(postId))
    const summons = posts.get(postId)
    if (!summons) throw new Error(`X API returned no data for post ${postId}`)

    const quoted = referenceId(summons, 'quoted')
    const budget = quoted ? MAX_PARENTS - 1 : MAX_PARENTS
    const ancestors: LookupPost[] = []
    let id = referenceId(summons, 'replied_to')
    while (id && ancestors.length < budget) {
      if (!posts.has(id)) {
        try {
          remember(await this.lookup(id))
        } catch (error) {
          logError('thread.lookup_failed', error, { id, depth: ancestors.length })
          break
        }
      }
      const post = posts.get(id)
      if (!post) break
      ancestors.push(post)
      id = referenceId(post, 'replied_to')
    }

    const quotedPost = quoted ? posts.get(quoted) : undefined
    return [...ancestors.reverse(), ...(quotedPost ? [quotedPost] : []), summons].map((post) => ({
      id: post.id,
      text: decode(post.note_tweet?.text ?? post.text),
      authorUsername: post.author_id ? usernames.get(post.author_id) : undefined,
      lang: post.lang,
    }))
  }

  // Mentions of the bot, newest first. The webhook is the fast path; this is what catches what it drops.
  async fetchMentions(sinceId?: string): Promise<Mention[]> {
    const query = sinceId ? `${MENTIONS_QUERY}&since_id=${encodeURIComponent(sinceId)}` : MENTIONS_QUERY
    const path = `/2/users/${encodeURIComponent(this.botUserId ?? '')}/mentions?${query}`
    const mentions = await withTimeout(
      this.xApiFetch<LookupPost[]>(path, 'GET') as Promise<Mentions>,
      LOOKUP_TIMEOUT_MS,
    )
    const users = new Map((mentions.includes?.users ?? []).map((user) => [user.id, user]))
    return (mentions.data ?? []).map((post) => ({
      post,
      author: post.author_id ? users.get(post.author_id) : undefined,
    }))
  }

  // Hands a post to the Chat SDK exactly as an inbound webhook would, dedupe and thread lock included.
  ingest({ post, author }: Mention, options: WebhookOptions) {
    this.handleIncomingPost(post, author, options)
  }

  // The Activity API manages subscriptions with a user-context token, so expose the refreshed one.
  userToken() {
    return this.resolveAccessToken()
  }

  private lookup(id: string) {
    const path = `/2/tweets/${encodeURIComponent(id)}?${LOOKUP_QUERY}`
    return withTimeout(this.xApiFetch<LookupPost>(path, 'GET') as Promise<Lookup>, LOOKUP_TIMEOUT_MS)
  }
}

// X escapes these three characters in post text.
const decode = (text: string) => text.replace(/&(?:amp|lt|gt);/g, (entity) => ENTITIES[entity] ?? entity)

// The adapter owns the underlying fetch, so the call can only be bounded, not aborted.
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`X API call timed out after ${ms}ms`)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}
