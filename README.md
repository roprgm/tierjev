# tierjev

Tier lists ranked by [Jev](https://vercel.com/ai-gateway/models/jev), TypeSafe AI's classifier, through Vercel AI Gateway.

## Run

```bash
cp .env.example .env   # add AI_GATEWAY_API_KEY
bun install
bun dev
```

Next.js App Router. The classifier lives in `src/app/api/classify/route.ts`; payment endpoints go next to it.

## Deploy

1. Import the repo on Vercel. Next.js is detected automatically. The main page is prerendered static and served from the CDN; only `/api/classify` runs as a function.
2. Set `AI_GATEWAY_API_KEY` in the project's environment variables.
3. Add Upstash Redis from the Vercel Marketplace (Storage tab). It injects `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without it the app still works but nothing is cached or rate limited.

## How ranking works

One `evaluate` call per set through the AI SDK. The whole item list is the shared `state`; each item gets a `score` question with the rubric F, D, C, B, A, S. The tier is the rung with the highest probability, the score orders items within a tier, and the probability is shown as confidence on hover.

## Custom sets

`POST /api/sets` turns a short topic into a set with `deepseek/deepseek-v4.1-flash` through the AI Gateway (`generateText` + `Output.object`, thinking disabled). Results are cached in Redis for 30 days by normalised topic, and creation is limited to 10 an hour per IP. Generated sets live only in the client session and the cache for now.

## Sharing

`POST /api/share` stores the list in Redis under an 8-character id. `/s/<id>` renders once, then Vercel serves the cached page from the CDN. Its social image at `/s/<id>/og` is generated with `next/og` and cached at the edge for a year. Shared pages never call Jev.

## Motion

Tiles fly to their destination with a small FLIP hook (`lib/use-flip.ts`): clones animate in a fixed overlay so row clipping cannot cut them off, and a tile whose destination is scrolled out of view stops at the row edge and fades.

## Manual sorting

Tiles become draggable when the rate limit kicks in or after the Customize link in the footer. Manual moves drop the Jev confidence for that tile.

## Cache and limits

- Rankings are cached in Redis for 24 hours, keyed by a hash of the normalised criterion and the sorted item names. Cache hits never reach Jev and do not count against the rate limit.
- 40 items per request, 30 uncached rankings and 20 shares per IP per hour, counted in Redis so the limit holds across function instances. A 429 carries `Retry-After`, and the UI locks the Rank button with a countdown.
- Budget: a cache miss costs about four Redis commands, a hit one. The Upstash free tier covers 500K commands a month.

## Next

- Pre-generated sets with images stored in a database (`Item.image` is already rendered when present).
- Jev-powered search over the set catalogue.
