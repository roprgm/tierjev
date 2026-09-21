import { afterAll, beforeEach, expect, test } from 'bun:test'
import { MAX_PARENTS } from '@/bot/answer/thread'
import { CONSUMER_SECRET, silentLogger, startXStub } from '@/bot/test/x-api-stub'
import { ThreadXAdapter } from '@/bot/x/adapter'

type Fixture = {
  id: string
  text: string
  author_id: string
  lang?: string
  note_tweet?: { text: string }
  parent?: string
  quoted?: string
}

const users: Record<string, { id: string; username: string }> = {
  '1': { id: '1', username: 'alice' },
  '2': { id: '2', username: 'bob' },
}

const post = ({ parent, quoted, ...rest }: Fixture) => ({
  ...rest,
  referenced_tweets: [
    ...(parent ? [{ type: 'replied_to', id: parent }] : []),
    ...(quoted ? [{ type: 'quoted', id: quoted }] : []),
  ],
})

// Builds the lookup responses the way X does: the post plus its referenced posts and every author.
function lookups(fixtures: Fixture[]) {
  const byId = new Map(fixtures.map((f) => [f.id, f]))
  return Object.fromEntries(
    fixtures.map((f) => {
      const referenced = [f.parent, f.quoted].flatMap((id) =>
        id && byId.has(id) ? [byId.get(id) as Fixture] : [],
      )
      const authors = [f, ...referenced].map((p) => users[p.author_id]).filter(Boolean)
      return [f.id, { data: post(f), includes: { tweets: referenced.map(post), users: authors } }]
    }),
  )
}

const chain = (length: number): Fixture[] =>
  Array.from({ length }, (_, i) => ({
    id: String(100 + i),
    text: `post ${100 + i}`,
    author_id: i % 2 ? '2' : '1',
    lang: 'en',
    parent: i ? String(100 + i - 1) : undefined,
  }))

const stubs: ReturnType<typeof startXStub>[] = []
afterAll(() => {
  for (const stub of stubs) stub.stop()
})

function adapterFor(fixtures: Fixture[]) {
  const stub = startXStub(lookups(fixtures))
  stubs.push(stub)
  const adapter = new ThreadXAdapter({
    consumerSecret: CONSUMER_SECRET,
    userAccessToken: 'token',
    userId: '999',
    userName: 'jevbot',
    apiBaseUrl: stub.url,
    logger: silentLogger,
  })
  return { adapter, calls: stub.calls }
}

beforeEach(() => {
  for (const stub of stubs) stub.calls.splice(0)
})

test('returns the chain oldest to newest with full text and usernames', async () => {
  const fixtures = chain(4)
  fixtures[1].note_tweet = { text: 'the long version of post 101 &amp; more' }
  const { adapter, calls } = adapterFor(fixtures)
  expect(await adapter.fetchPosts('103')).toEqual([
    { id: '100', text: 'post 100', authorUsername: 'alice', lang: 'en' },
    { id: '101', text: 'the long version of post 101 & more', authorUsername: 'bob', lang: 'en' },
    { id: '102', text: 'post 102', authorUsername: 'alice', lang: 'en' },
    { id: '103', text: 'post 103', authorUsername: 'bob', lang: 'en' },
  ])
  expect(calls.map((c) => c.path)).toEqual(['/2/tweets/103', '/2/tweets/101'])
})

test('places the quoted post right before the summons', async () => {
  const fixtures = [...chain(2), { id: '300', text: 'quoted', author_id: '2' }]
  fixtures[1].quoted = '300'
  const { adapter } = adapterFor(fixtures)
  expect((await adapter.fetchPosts('101')).map((p) => p.id)).toEqual(['100', '300', '101'])
})

test('stops at the parent budget', async () => {
  const { adapter } = adapterFor(chain(12))
  const ids = (await adapter.fetchPosts('111')).map((p) => p.id)
  expect(ids).toHaveLength(MAX_PARENTS + 1)
  expect(ids.at(-1)).toBe('111')
})

test('keeps what it has when an ancestor cannot be fetched', async () => {
  const fixtures = chain(4).filter((f) => f.id !== '101')
  const { adapter } = adapterFor(fixtures)
  expect((await adapter.fetchPosts('103')).map((p) => p.id)).toEqual(['102', '103'])
})

test('rejects when the summons itself cannot be fetched', async () => {
  const { adapter } = adapterFor([])
  await expect(adapter.fetchPosts('404')).rejects.toThrow()
})
