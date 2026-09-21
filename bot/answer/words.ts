import { removeStopwords } from 'stopword'
import { stopwordsFor } from '@/bot/answer/lang'
import type { Candidates, Post } from '@/bot/answer/types'

const NOISE = /https?:\/\/\S+|@\w+/g
const WORD = /[\p{L}\p{M}\p{N}]+(?:-[\p{L}\p{M}\p{N}]+)*/gu
const MIN_LENGTH = 2
const DIGIT = /\p{N}/u

function tokens({ text, lang }: Post) {
  const clean = text.replace(NOISE, ' ').normalize('NFC')
  const all = [...clean.matchAll(WORD)]
    .map((m) => m[0])
    .filter((t) => t.length >= MIN_LENGTH || DIGIT.test(t))
  return removeStopwords(all, stopwordsFor(lang))
}

// Every word of the thread, newest post first, keyed by its lowercase NFC form.
export function extractWords(posts: Post[]): Candidates {
  const words: Candidates = new Map()
  for (const post of posts.toReversed()) {
    for (const token of tokens(post)) {
      const key = token.toLowerCase()
      if (!words.has(key)) words.set(key, token)
    }
  }
  return words
}
