import type { Post } from '@/bot/answer/types'
import { answerThread } from '@/bot/answer/verdict'
import { required } from './env'

const texts = process.argv.slice(2)
if (texts.length === 0) {
  console.error('Usage: bun run bot:ask "<post>" ["<reply>" ...] "<post that mentions the bot>"')
  process.exit(1)
}
required('AI_GATEWAY_API_KEY')

const posts: Post[] = texts.map((text, i) => ({ id: String(i + 1), text, authorUsername: `user${i + 1}` }))
const { reply, confidence } = await answerThread(posts)
console.log(reply ? `Reply: ${reply} (confidence ${confidence})` : 'No reply')
