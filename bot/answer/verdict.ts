import {
  type Experimental_EvaluationModel as EvaluationModel,
  experimental_evaluate as evaluate,
  InvalidResponseDataError,
} from 'ai'
import { z } from 'zod'
import { extractOptions, type Propose, proposeWithDeepSeek, type Source } from '@/bot/answer/options'
import { choiceQuestion, decide } from '@/bot/answer/question'
import { buildState } from '@/bot/answer/state'
import { trimThread } from '@/bot/answer/thread'
import type { Post } from '@/bot/answer/types'
import { log } from '@/bot/log'

const JEV = 'typesafe-ai/jev'
const TIMEOUT_MS = 10_000
const TOP = 3

type Models = { propose?: Propose; jev?: EvaluationModel }

export type Verdict = {
  reply: string | null
  source: Source | 'none'
  options: string[]
  choice?: string
  probabilities?: Record<string, number>
  confidence?: number
}

// Jev's own confidence statistic travels in the provider metadata, keyed by question id.
const metadataSchema = z.object({ typesafe: z.object({ confidence: z.object({ answer: z.number() }) }) })

// Posts run oldest to newest and end with the post that summoned the bot.
export async function answerThread(posts: Post[], models: Models = {}): Promise<Verdict> {
  const thread = trimThread(posts)
  const { candidates, source } = await extractOptions(thread, models.propose ?? proposeWithDeepSeek)
  const options = [...candidates.values()]
  if (candidates.size === 0) return { reply: null, source: 'none', options }
  const result = await evaluate({
    model: models.jev ?? JEV,
    state: buildState(thread),
    questions: { answer: choiceQuestion(candidates) },
    abortSignal: AbortSignal.timeout(TIMEOUT_MS),
  }).catch((error: unknown) => {
    // The SDK rejects answers whose top probabilities tie after rounding; for the bot a tie means unsure.
    if (InvalidResponseDataError.isInstance(error)) return null
    throw error
  })
  if (!result) {
    log('jev.tie', { options: candidates.size })
    return { reply: null, source, options }
  }
  const { answers, providerMetadata } = result
  const { choice, probabilities = {} } = answers.answer
  const confidence = metadataSchema.safeParse(providerMetadata).data?.typesafe.confidence.answer
  const top = Object.entries(probabilities)
    .sort(([, a], [, b]) => b - a)
    .slice(0, TOP)
  log('jev', { options: candidates.size, choice, confidence, top })
  return { reply: decide(answers.answer, candidates), source, options, choice, probabilities, confidence }
}
