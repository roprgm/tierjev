import type { Post } from '@/bot/answer/types'

type Message = { text: string } | { from: string; text: string }
export type State = { thread: Message[]; summons: Message }

const message = ({ authorUsername, text }: Post): Message =>
  authorUsername ? { from: `@${authorUsername}`, text } : { text }

export function buildState(posts: Post[]): State {
  const messages = posts.map(message)
  return { thread: messages.slice(0, -1), summons: messages[messages.length - 1] }
}
