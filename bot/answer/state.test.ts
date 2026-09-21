import { expect, test } from 'bun:test'
import { buildState } from '@/bot/answer/state'

test('splits the thread from the summons and names authors with @', () => {
  expect(
    buildState([
      { id: '1', text: 'a', authorUsername: 'alice' },
      { id: '2', text: 'b', authorUsername: 'carol' },
    ]),
  ).toEqual({ thread: [{ from: '@alice', text: 'a' }], summons: { from: '@carol', text: 'b' } })
})

test('handles a root mention by an unknown author', () => {
  expect(buildState([{ id: '1', text: 'x' }])).toEqual({ thread: [], summons: { text: 'x' } })
})
