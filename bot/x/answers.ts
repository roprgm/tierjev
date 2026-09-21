import type { StateAdapter } from 'chat'
import type { Post } from '@/bot/answer/types'
import type { Verdict } from '@/bot/answer/verdict'

const LIST = 'answers'
const MAX_RECORDS = 1_000
const RECORD_TTL_MS = 30 * 24 * 3_600_000

export type AnswerRecord = Verdict & {
  id: string
  author?: string
  thread: Post[]
  ms: number
  at: string
  error?: string
}

// Every handled mention, newest last, capped; one key per mention id for a future permalink.
export async function saveAnswer(state: StateAdapter, record: AnswerRecord) {
  await state.appendToList(LIST, record, { maxLength: MAX_RECORDS })
  await state.set(`answer:${record.id}`, record, RECORD_TTL_MS)
}

export async function listAnswers(state: StateAdapter, limit: number): Promise<AnswerRecord[]> {
  const records = await state.getList<AnswerRecord>(LIST)
  return records.slice(-limit).reverse()
}

export const getAnswer = (state: StateAdapter, id: string) => state.get<AnswerRecord>(`answer:${id}`)
