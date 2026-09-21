import { createHash, randomBytes } from 'node:crypto'
import { required } from './env'

const PORT = 5201
const REDIRECT_URI = `http://localhost:${PORT}/callback`
const SCOPES = 'tweet.read tweet.write users.read offline.access'

const clientId = required('X_CLIENT_ID')
const clientSecret = process.env.X_CLIENT_SECRET
const verifier = randomBytes(32).toString('base64url')
const state = randomBytes(16).toString('base64url')

const authorizeUrl = new URL('https://x.com/i/oauth2/authorize')
authorizeUrl.search = new URLSearchParams({
  response_type: 'code',
  client_id: clientId,
  redirect_uri: REDIRECT_URI,
  scope: SCOPES,
  state,
  code_challenge: createHash('sha256').update(verifier).digest('base64url'),
  code_challenge_method: 'S256',
}).toString()

type Token = { access_token: string; refresh_token?: string; expires_in: number }

async function exchange(code: string): Promise<Token> {
  const res = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(clientSecret ? { Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}` } : {}),
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: verifier,
      client_id: clientId,
    }),
  })
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status} ${await res.text()}`)
  return res.json()
}

async function whoAmI(accessToken: string) {
  const res = await fetch('https://api.x.com/2/users/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`/2/users/me failed: ${res.status} ${await res.text()}`)
  const { data } = (await res.json()) as { data: { id: string; username: string } }
  return data
}

const server = Bun.serve({
  port: PORT,
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname !== '/callback') return new Response('Not found', { status: 404 })
    if (url.searchParams.get('state') !== state) return new Response('State mismatch', { status: 400 })
    const code = url.searchParams.get('code')
    if (!code) return new Response(`Denied: ${url.searchParams.get('error_description')}`, { status: 400 })
    try {
      const token = await exchange(code)
      const me = await whoAmI(token.access_token)
      console.log(
        [
          '',
          `X_USER_ID=${me.id}`,
          `X_USERNAME=${me.username}`,
          `X_REFRESH_TOKEN=${token.refresh_token}`,
          `X_USER_ACCESS_TOKEN=${token.access_token}`,
          '',
        ].join('\n'),
      )
      return new Response('Done. Go back to the terminal.')
    } catch (error) {
      console.error(error)
      return new Response(String(error), { status: 500 })
    } finally {
      setTimeout(() => server.stop(), 100)
    }
  },
})

console.log(`Open this URL in a browser signed in as the bot account:\n\n${authorizeUrl}\n`)
