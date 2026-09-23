import { logError } from '@/bot/log'
import { getBotContext } from '@/bot/x/bot'
import { pollMentions } from '@/bot/x/poll'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  const { bot, x, state } = getBotContext()
  try {
    await bot.initialize()
    return Response.json(await pollMentions(x, state))
  } catch (error) {
    logError('poll.failed', error)
    return Response.json({ error: 'poll failed' }, { status: 500 })
  }
}
