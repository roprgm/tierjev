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
3. Add Upstash Redis from the Vercel Marketplace (Storage tab). It injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Without it the app still works but nothing is cached or rate limited.

## How ranking works

One request per set. The whole item list is the shared `state`; each item gets a `score` question with the rubric F, D, C, B, A, S. The tier is the rung with the highest probability, the score orders items within a tier, and the probability is shown as confidence on hover.

## Cache and limits

- Rankings are cached in Redis for 24 hours, keyed by a hash of the normalised criterion and the sorted item names. Cache hits never reach Jev and do not count against the rate limit.
- 40 items per request, 30 uncached requests per IP per hour, counted in Redis so the limit holds across function instances.
- Budget: a cache miss costs about four Redis commands, a hit one. The Upstash free tier covers 500K commands a month.

## Next

- Pre-generated sets with images stored in a database (`Item.image` is already rendered when present).
- Jev-powered search over the set catalogue.
