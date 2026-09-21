import type { Post } from '@/bot/answer/types'

export const MAX_PARENTS = 6
export const PARENT_CHARS = 280

const truncate = (text: string) =>
  text.length <= PARENT_CHARS ? text : `${text.slice(0, PARENT_CHARS).replace(/\s+\S*$/, '')}…`

// Keeps the summons whole and only the nearest parents, each cut to a classic tweet at a word boundary.
export function trimThread(posts: Post[]): Post[] {
  const kept = posts.slice(-1 - MAX_PARENTS)
  return kept.map((post, i) => (i === kept.length - 1 ? post : { ...post, text: truncate(post.text) }))
}
