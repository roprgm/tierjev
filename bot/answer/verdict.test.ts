import { beforeEach, expect, test } from 'bun:test'
import { Experimental_EvaluationMockModelV4 as MockModel } from 'ai/test'
import { type ChoiceQuestion, NONE } from '@/bot/answer/question'
import { answerThread } from '@/bot/answer/verdict'

const calls: unknown[] = []
beforeEach(() => calls.splice(0))

// Answers with the given probabilities, zero for every other option, so the SDK's checks pass.
function jev(pick: Record<string, number>) {
  return new MockModel({
    doEvaluate: async ({ state, questions }) => {
      calls.push({ state, questions })
      const options = Object.keys((questions.answer as ChoiceQuestion).criteria)
      const probabilities = Object.fromEntries(options.map((option) => [option, pick[option] ?? 0]))
      const choice = options.reduce((a, b) => (probabilities[a] >= probabilities[b] ? a : b))
      return {
        answers: { answer: { type: 'choice', choice, probabilities } },
        providerMetadata: { typesafe: { confidence: { answer: 0.75 } } },
        warnings: [],
      }
    },
  })
}

const propose = (options: string[]) => async () => options

const thread = [
  { id: '1', text: 'Largest planet: Mars or Jupiter?', authorUsername: 'alice', lang: 'en' },
  { id: '2', text: '@alice @tierjev', authorUsername: 'bob', lang: 'en' },
]

test('asks jev to pick among the proposed options and replies with the option text', async () => {
  const models = { propose: propose(['Jupiter', 'Mars']), jev: jev({ jupiter: 0.9, mars: 0.1 }) }
  expect(await answerThread(thread, models)).toEqual({
    reply: 'Jupiter',
    source: 'deepseek',
    options: ['Jupiter', 'Mars'],
    choice: 'jupiter',
    probabilities: { jupiter: 0.9, mars: 0.1, [NONE]: 0 },
    confidence: 0.75,
  })
  expect(calls).toHaveLength(1)
  expect(calls[0]).toMatchObject({
    state: {
      thread: [{ from: '@alice', text: 'Largest planet: Mars or Jupiter?' }],
      summons: { from: '@bob', text: '@alice @tierjev' },
    },
    questions: {
      answer: { type: 'choice', criteria: { jupiter: null, mars: null, [NONE]: expect.any(String) } },
    },
  })
})

test('stays quiet without asking jev when nothing is proposed', async () => {
  expect(await answerThread(thread, { propose: propose([]), jev: jev({}) })).toEqual({
    reply: null,
    source: 'none',
    options: [],
  })
  expect(calls).toHaveLength(0)
})

test('commits to the top pick on a close three-way call, the way a poll needs', async () => {
  const options = propose(['Jupiter', 'Mars', 'Venus'])
  const close = await answerThread(thread, {
    propose: options,
    jev: jev({ jupiter: 0.34, mars: 0.33, venus: 0.33 }),
  })
  expect(close.reply).toBe('Jupiter')
})

test('stays quiet on the escape option or when the top pick has too little support', async () => {
  const options = propose(['Jupiter', 'Mars', 'Venus'])
  const escaped = await answerThread(thread, { propose: options, jev: jev({ [NONE]: 0.8, mars: 0.2 }) })
  expect(escaped.reply).toBeNull()
  const unsure = await answerThread(thread, {
    propose: options,
    jev: jev({ jupiter: 0.28, mars: 0.27, venus: 0.25, [NONE]: 0.2 }),
  })
  expect(unsure.reply).toBeNull()
})

test('stays quiet when jev returns a tie the SDK rejects', async () => {
  const tie = new MockModel({
    doEvaluate: async () => ({
      answers: {
        answer: { type: 'choice', choice: 'mars', probabilities: { jupiter: 0.6, mars: 0.4, [NONE]: 0 } },
      },
      warnings: [],
    }),
  })
  expect(await answerThread(thread, { propose: propose(['Jupiter', 'Mars']), jev: tie })).toEqual({
    reply: null,
    source: 'deepseek',
    options: ['Jupiter', 'Mars'],
  })
})
