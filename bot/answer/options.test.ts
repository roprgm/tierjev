import { expect, test } from 'bun:test'
import { extractOptions } from '@/bot/answer/options'
import type { Post } from '@/bot/answer/types'

const thread: Post[] = [
  { id: '1', text: 'Largest planet: Mars or Jupiter?', authorUsername: 'alice', lang: 'en' },
  { id: '2', text: '@alice @tierjev', authorUsername: 'bob', lang: 'en' },
]

test('sends the thread state and keeps the proposed options trimmed and deduped', async () => {
  const states: unknown[] = []
  const propose = async (state: unknown) => {
    states.push(state)
    return ['Jupiter', ' Mars ', 'jupiter', '']
  }
  const { candidates, source } = await extractOptions(thread, propose)
  expect(source).toBe('deepseek')
  expect([...candidates]).toEqual([
    ['jupiter', 'Jupiter'],
    ['mars', 'Mars'],
  ])
  expect(states[0]).toEqual({
    thread: [{ from: '@alice', text: 'Largest planet: Mars or Jupiter?' }],
    summons: { from: '@bob', text: '@alice @tierjev' },
  })
})

test('returns no candidates when the model proposes none', async () => {
  expect((await extractOptions(thread, async () => [])).candidates.size).toBe(0)
})

test('falls back to the words of the thread when the model fails', async () => {
  const { candidates, source } = await extractOptions(thread, async () => {
    throw new Error('gateway down')
  })
  expect(source).toBe('words')
  expect([...candidates.keys()]).toEqual(['largest', 'planet', 'mars', 'jupiter'])
})
