# tierjev bot

Mention [@tierjev](https://x.com/tierjev) on X and it replies with one answer taken from the thread. DeepSeek proposes the candidate answers, [Jev](https://vercel.com/ai-gateway/models/jev) picks one or abstains. Everything lives in this folder; the rest of the repo only contributes `app/api/webhooks/x/route.ts`.

## How it works

X delivers `post.mention.create` events to `/api/webhooks/x`, where the [Chat SDK](https://chat-sdk.dev) X adapter verifies the signature and dedupes deliveries. The handler (`x/bot.ts`) fetches the mention and up to six parent posts with `GET /2/tweets/:id` (`x/adapter.ts`, one request covers two hops thanks to the `referenced_tweets.id` expansion), then `answerThread` (`answer/verdict.ts`) does the rest: parents are cut to 280 characters, the thread goes to DeepSeek as JSON and it lists the candidate answers as written in the thread, short phrases included (`answer/options.ts`); those candidates become the options of one Jev `choice` question with `none_of_the_above` as the escape option (`answer/question.ts`). The winning option is posted as a reply when its probability is at least 0.5; otherwise the bot stays quiet. When DeepSeek fails, the candidates fall back to the words of the thread minus handles, links, emoji and the stopwords of each post's language (`answer/words.ts`).

Redis (the Upstash instance of the site, through `REDIS_URL`) holds the dedupe keys, the per-thread locks, the OAuth refresh token that X rotates on every refresh, and a log of every handled mention: the thread as sent to the models, the candidates and where they came from, Jev's choice, the full probability distribution, Jev's confidence, the reply and the timing (`x/answers.ts`, last 1000 mentions, one key per mention id for a future permalink).

## Try it locally

`bun run bot:ask` runs a thread through DeepSeek and Jev and prints the reply; the `options` and `jev` log lines show the candidates and the probabilities. Each argument is one post and the last one is the mention; it only needs `AI_GATEWAY_API_KEY`:

```bash
bun run bot:ask "Which is the largest planet: Mars, Jupiter or Venus?" "Venus obviously" "@tierjev"
```

`bun run bot:simulate` exercises the whole webhook path without X. It starts a dev server on port 5210 with fake X credentials and a fake X API serving the thread, delivers a signed `post.mention.create` event, prints the bot's log lines and the reply it posted, then stops everything:

```bash
bun run bot:simulate "Which is the largest planet: Mars, Jupiter or Venus?" "Venus obviously" "@tierjev"
```

`bun test` runs the unit tests next to each module.

## X setup

The X app lives in the developer account of `@tierjev` (pay-per-use). Variables, all documented in `.env.example`:

1. Keys & Tokens of the app: API Key Secret (`X_CONSUMER_SECRET`), Bearer Token (`X_BEARER_TOKEN`), OAuth 2.0 Client ID and Secret (`X_CLIENT_ID`, `X_CLIENT_SECRET`). User authentication settings: Read and Write, confidential client, callback `http://localhost:5201/callback`.
2. Tokens of the bot account: "Token de acceso" in the same page generates them for the console owner (scopes `tweet.read tweet.write users.read offline.access`), or run `bun run bot:auth` in a browser signed in as the bot. Production uses `X_REFRESH_TOKEN`; local runs use the two-hour `X_USER_ACCESS_TOKEN` so they never rotate production's token. `X_USER_ID` and `X_USERNAME` identify the account.
3. The account is labelled automated in its settings and carries the site link in the bio, never in replies.
4. With the site deployed, `bun run bot:webhook register https://www.tierjev.com/api/webhooks/x` registers the webhook (X validates it with a CRC request right away, so the URL must answer 200 directly: the bare domain redirects to `www` and is rejected) and subscribes the account to mentions. The subscription call needs the bot user's own token, `X_USER_ACCESS_TOKEN`; without a fresh one, create it from the Subscriptions tab of the app in the developer console (category Post, event Post Mention Create, handle `@tierjev`, the webhook). `bun run bot:webhook list` shows the result and `delete <webhookId>` removes a webhook.
5. Mention the bot from another account and watch for the reply. `bun run bot:answers [limit]` prints the latest stored mentions as JSON lines (needs `REDIS_URL`, which `vercel env pull .env.local` provides).

## Cost per mention

X bills pay-per-use: about $0.005 for the delivered event, $0.005 per post read (one to seven) and $0.010 to $0.015 for the reply, so roughly $0.02 for a short thread and $0.055 at the depth limit. Never put a link in a reply: X charges $0.20 for a post with a URL. DeepSeek and Jev cost a fraction of a cent per thread.

## Limits

- Public posts only; direct messages are ignored.
- Six parent posts plus the quoted post of the mention, if any. The mention is always sent whole, parents are truncated.
- One answer per mention, copied as written in the thread (a word or a short phrase).
- 20 answered mentions per author per hour. A second mention in the same conversation within a few seconds is dropped by the thread lock.
- Redis is required in production because X rotates refresh tokens; with in-memory state the rotated token is lost on every cold start.
