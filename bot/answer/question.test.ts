import { expect, test } from 'bun:test'
import { choiceQuestion, decide, INSTRUCTIONS, NONE } from '@/bot/answer/question'

const candidates = new Map([
  ['lionel messi', 'Lionel Messi'],
  ['1969', '1969'],
])

const answer = (choice: string, probabilities: Record<string, number>) => ({
  type: 'choice' as const,
  choice,
  probabilities,
})

test('builds one null-described option per candidate with the escape option last', () => {
  expect(choiceQuestion(candidates)).toEqual({
    type: 'choice',
    instructions: INSTRUCTIONS,
    criteria: {
      'lionel messi': null,
      '1969': null,
      [NONE]: 'None of the options correctly answers the question',
    },
  })
})

test('caps the options at 255 including the escape option', () => {
  const many = new Map(Array.from({ length: 300 }, (_, i) => [`option${i}`, `option${i}`]))
  const keys = Object.keys(choiceQuestion(many).criteria)
  expect(keys).toHaveLength(255)
  expect(keys).toContain('option253')
  expect(keys).not.toContain('option254')
  expect(keys.at(-1)).toBe(NONE)
})

test('replies with the candidate text of a likely choice', () => {
  expect(decide(answer('lionel messi', { 'lionel messi': 0.7, '1969': 0.3 }), candidates)).toBe(
    'Lionel Messi',
  )
  expect(decide(answer('1969', { 'lionel messi': 0.5, '1969': 0.5 }), candidates)).toBe('1969')
})

test('stays quiet on the escape option, a low probability or an unknown choice', () => {
  expect(decide(answer(NONE, { [NONE]: 0.9, '1969': 0.1 }), candidates)).toBeNull()
  expect(decide(answer('1969', { '1969': 0.49, 'lionel messi': 0.51 }), candidates)).toBeNull()
  expect(decide(answer('paris', { paris: 1 }), candidates)).toBeNull()
  expect(decide({ type: 'choice', choice: '1969' }, candidates)).toBeNull()
})
