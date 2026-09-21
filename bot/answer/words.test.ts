import { expect, test } from 'bun:test'
import type { Post } from '@/bot/answer/types'
import { extractWords } from '@/bot/answer/words'

const post = (text: string, lang?: string): Post => ({ id: '1', text, lang })
const words = (text: string, lang?: string) => [...extractWords([post(text, lang)])]

test('drops handles, links, hashtag and cashtag marks, emoji and stopwords', () => {
  expect(
    words(
      '@tierjev @alice what is the capital of France? \u{1F1EB}\u{1F1F7} #geo $TSLA https://t.co/abc123',
      'en',
    ),
  ).toEqual([
    ['capital', 'capital'],
    ['france', 'France'],
    ['geo', 'geo'],
    ['tsla', 'TSLA'],
  ])
})

test('keeps accents, folds NFC and case, keeps the first surface form', () => {
  expect(words('Café or CAFÉ or café', 'en')).toEqual([['café', 'Café']])
})

test('removes the stopwords of the post language', () => {
  expect(words('La respuesta: Sevilla, no Madrid', 'es')).toEqual([
    ['respuesta', 'respuesta'],
    ['sevilla', 'Sevilla'],
    ['madrid', 'Madrid'],
  ])
  expect(words('No, the answer is Madrid', 'en')).toEqual([
    ['no', 'No'],
    ['answer', 'answer'],
    ['madrid', 'Madrid'],
  ])
})

test.each(['und', 'qam', 'xx', undefined])('falls back to English plus Spanish for %s', (lang) => {
  expect(words('the respuesta and la capital', lang)).toEqual([
    ['respuesta', 'respuesta'],
    ['capital', 'capital'],
  ])
})

test('keeps numbers, even single digits, and drops single letters', () => {
  expect(words('Top 10 in 2020, rated 5 by 1 person, grade A', 'en')).toEqual([
    ['top', 'Top'],
    ['10', '10'],
    ['2020', '2020'],
    ['rated', 'rated'],
    ['5', '5'],
    ['1', '1'],
    ['person', 'person'],
    ['grade', 'grade'],
  ])
})

test('splits at apostrophes and keeps inner hyphens only', () => {
  expect(words("Paris’ e-mail and France's covid-19 data — rock - roll", 'en')).toEqual([
    ['paris', 'Paris'],
    ['e-mail', 'e-mail'],
    ['france', 'France'],
    ['covid-19', 'covid-19'],
    ['data', 'data'],
    ['rock', 'rock'],
    ['roll', 'roll'],
  ])
})

test('lists the newest post first and dedupes across posts', () => {
  const thread = [post('Madrid is the capital', 'en'), post('@tierjev madrid or Barcelona?', 'en')]
  expect([...extractWords(thread)]).toEqual([
    ['madrid', 'madrid'],
    ['barcelona', 'Barcelona'],
    ['capital', 'capital'],
  ])
})

test('returns an empty map when nothing survives', () => {
  expect(words('@tierjev @alice https://t.co/x \u{1F64F} the of and a', 'en')).toEqual([])
})

test('keeps non-Latin scripts whole', () => {
  expect(words('Москва и 東京 हिन्दी', 'ru')).toEqual([
    ['москва', 'Москва'],
    ['東京', '東京'],
    ['हिन्दी', 'हिन्दी'],
  ])
})
