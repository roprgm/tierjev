import type {
  Experimental_EvaluationAnswer as EvaluationAnswer,
  Experimental_EvaluationQuestion as EvaluationQuestion,
} from 'ai'
import type { Candidates } from '@/bot/answer/types'

export type ChoiceQuestion = Extract<EvaluationQuestion, { type: 'choice' }>
export type ChoiceAnswer = EvaluationAnswer<ChoiceQuestion>

export const NONE = 'none_of_the_above'
const MAX_OPTIONS = 255
const MIN_PROBABILITY = 0.5

export const INSTRUCTIONS =
  'Which option best answers the question asked in the summons, or the question asked in the thread when the summons only calls the bot? When the question is a matter of opinion, pick the option most people would agree with. Choose none_of_the_above only when no option answers the question at all.'

// One option per candidate, escape option last. Candidates come from the thread, so NONE cannot collide.
export function choiceQuestion(candidates: Candidates): ChoiceQuestion {
  const options = [...candidates.keys()].slice(0, MAX_OPTIONS - 1)
  return {
    type: 'choice',
    instructions: INSTRUCTIONS,
    criteria: {
      ...Object.fromEntries(options.map((option) => [option, null])),
      [NONE]: 'None of the options correctly answers the question',
    },
  }
}

export const topProbability = ({ choice, probabilities }: ChoiceAnswer) => probabilities?.[choice] ?? 0

// The text to reply with, or null when the bot should stay quiet.
export function decide(answer: ChoiceAnswer, candidates: Candidates): string | null {
  if (answer.choice === NONE || topProbability(answer) < MIN_PROBABILITY) return null
  return candidates.get(answer.choice) ?? null
}
