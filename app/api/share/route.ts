import { clientIp, rateLimited } from '@/lib/ratelimit'
import { createShare, parseShare } from '@/lib/shares'

const LIMIT_PER_HOUR = 20

export async function POST(request: Request) {
  const share = parseShare(await request.json().catch(() => null))
  if (!share) return Response.json({ error: 'Invalid request' }, { status: 400 })

  if (await rateLimited('share', clientIp(request), LIMIT_PER_HOUR)) {
    return Response.json({ error: 'Too many shares for now. Try again in a bit.' }, { status: 429 })
  }

  try {
    return Response.json({ id: await createShare(share) })
  } catch (err) {
    console.error(err)
    return Response.json({ error: 'Sharing is unavailable right now.' }, { status: 502 })
  }
}
