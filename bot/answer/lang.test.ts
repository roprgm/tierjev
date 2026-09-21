import { expect, test } from 'bun:test'
import { stopwordsFor } from '@/bot/answer/lang'

test('picks the list of the post language', () => {
  expect(stopwordsFor('es')).toContain('qué')
  expect(stopwordsFor('es')).not.toContain('the')
  expect(stopwordsFor('en')).toContain('the')
  expect(stopwordsFor('en')).not.toContain('qué')
})

test.each(['und', 'qam', 'xx', undefined])('falls back to English plus Spanish for %s', (lang) => {
  expect(stopwordsFor(lang)).toContain('the')
  expect(stopwordsFor(lang)).toContain('qué')
})

test('maps legacy codes', () => {
  expect(stopwordsFor('iw')).toBe(stopwordsFor('he'))
})
