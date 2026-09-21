import { generateText, Output } from 'ai'
import { z } from 'zod'
import { buildState, type State } from '@/bot/answer/state'
import type { Candidates, Post } from '@/bot/answer/types'
import { extractWords } from '@/bot/answer/words'
import { log, logError } from '@/bot/log'

const MODEL = 'deepseek/deepseek-v4.1-flash'
const TIMEOUT_MS = 15_000
const MAX_OPTIONS = 40

const schema = z.object({
  options: z.array(z.string().max(60)).max(MAX_OPTIONS).describe('Candidate answers, copied from the thread'),
})

const INSTRUCTIONS =
  'You receive an X thread as JSON: `thread` holds the earlier posts, `summons` is the post that mentioned the bot. ' +
  'The bot will reply with exactly one of the options you list, so list the candidate answers to the question the summons asks, ' +
  'or to the question asked earlier in the thread when the summons only calls the bot. ' +
  'Only list options that literally appear in the thread; never add answers from your own knowledge. ' +
  'Each option is the thing itself as written there, a name, a number or a phrase of at most four words, ' +
  'without the surrounding words of the post. No duplicates, no @handles, no links. ' +
  'Return an empty list when the thread asks nothing that its own words can answer.'

export type Propose = (state: State) => Promise<string[]>
export type Source = 'deepseek' | 'words'
export type Options = { candidates: Candidates; source: Source }

export const proposeWithDeepSeek: Propose = async (state) => {
  const { output } = await generateText({
    model: MODEL,
    output: Output.object({ schema }),
    instructions: INSTRUCTIONS,
    prompt: JSON.stringify(state),
    maxOutputTokens: 400,
    providerOptions: { deepseek: { thinking: { type: 'disabled' } } },
    abortSignal: AbortSignal.timeout(TIMEOUT_MS),
  })
  return output?.options ?? []
}

// DeepSeek proposes the candidates; the thread's own words are the fallback when it fails.
export async function extractOptions(thread: Post[], propose = proposeWithDeepSeek): Promise<Options> {
  try {
    const candidates = dedupe(await propose(buildState(thread)))
    log('options', { source: 'deepseek', options: [...candidates.values()] })
    return { candidates, source: 'deepseek' }
  } catch (error) {
    logError('options.failed', error)
    return { candidates: extractWords(thread), source: 'words' }
  }
}

function dedupe(options: string[]): Candidates {
  const candidates: Candidates = new Map()
  for (const option of options) {
    const text = option.trim()
    if (text && !candidates.has(text.toLowerCase())) candidates.set(text.toLowerCase(), text)
  }
  return candidates
}
