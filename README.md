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

One input. `POST /api/rank` makes two Jev calls over the gateway's `/v1/evaluate` endpoint:

1. A `choice` question over the catalogue picks the set the request is about, with a `none` option. `none` (or a weak pick) returns `{ needsSet: true }`.
2. One `choice` question per item with the tiers S to F plus `skip` for items the request cannot rate. Skipped items land in a "Not applicable" pool. The tier is the top option, the score is the probability-weighted tier index used for ordering, and the top probability is the confidence shown on hover.

Jev is called with plain `fetch` rather than the AI SDK's `experimental_evaluate`, which rejects answers whose top probabilities tie after rounding.

## Custom sets

When no set fits, a dialog offers to create one for 1 credit. Credits are a placeholder wallet in `localStorage` (10 to start) until billing exists. `POST /api/sets` turns the request into a set with `deepseek/deepseek-v4.1-flash` through the AI Gateway (`generateText` + `Output.object`, thinking disabled), cached 30 days by topic and limited to 10 an hour per IP. The client then ranks by sending the new set along with the request. Generated sets are not yet part of the catalogue Jev picks from.

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
