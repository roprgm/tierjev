import { expect, test } from 'bun:test'
import { MAX_PARENTS, PARENT_CHARS, trimThread } from '@/bot/answer/thread'
import type { Post } from '@/bot/answer/types'

const post = (id: string, text = `post ${id}`): Post => ({ id, text })

test('leaves a single post untouched', () => {
  const summons = post('1')
  expect(trimThread([summons])).toEqual([summons])
})

test('keeps only the nearest parents', () => {
  const posts = Array.from({ length: 10 }, (_, i) => post(String(i)))
  expect(trimThread(posts).map((p) => p.id)).toEqual(['3', '4', '5', '6', '7', '8', '9'])
  expect(MAX_PARENTS).toBe(6)
})

test('truncates parents at a word boundary with an ellipsis', () => {
  const [parent] = trimThread([post('1', 'lorem '.repeat(60).trim()), post('2', 'x')])
  expect(parent.text.length).toBeLessThanOrEqual(PARENT_CHARS + 1)
  expect(parent.text.endsWith('lorem…')).toBe(true)
})

test('leaves a parent of exactly the limit alone', () => {
  const text = 'a'.repeat(PARENT_CHARS)
  expect(trimThread([post('1', text), post('2', 'x')])[0].text).toBe(text)
})

test('never touches the summons', () => {
  const text = 'word '.repeat(200)
  expect(trimThread([post('1'), post('2', text)])[1].text).toBe(text)
})
