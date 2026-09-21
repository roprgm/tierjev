import { expect, test } from 'bun:test'
import { mentionEvent } from '@/bot/x/analytics'
import type { AnswerRecord } from '@/bot/x/answers'

const record: AnswerRecord = {
  id: '1',
  at: '2026-09-21T00:00:00.000Z',
  ms: 1200,
  thread: [
    { id: '0', text: 'Mars or Jupiter?' },
    { id: '1', text: '@tierjev' },
  ],
  reply: 'Jupiter',
  source: 'deepseek',
  options: ['Mars', 'Jupiter'],
  choice: 'jupiter',
  confidence: 0.9,
}

test('maps a record to an analytics event by outcome', () => {
  expect(mentionEvent(record)).toEqual({
    name: 'bot_reply',
    properties: { source: 'deepseek', options: 2, posts: 2, confidence: 0.9, ms: 1200, error: null },
  })
  expect(mentionEvent({ ...record, reply: null }).name).toBe('bot_silent')
  expect(mentionEvent({ ...record, reply: null, error: 'Error: down' })).toMatchObject({
    name: 'bot_failed',
    properties: { error: 'Error: down' },
  })
})
