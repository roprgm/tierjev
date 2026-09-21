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

Push to Vercel. Set `AI_GATEWAY_API_KEY` in the project's environment variables. Next.js is detected automatically.

## How ranking works

One request per set. The whole item list is the shared `state`; each item gets a `score` question with the rubric F, D, C, B, A, S. The tier is the rung with the highest probability, the score orders items within a tier, and the probability is shown as confidence on hover.

## Limits

- 40 items per request, 30 requests per IP per hour. The counter is per serverless instance, so treat it as a soft limit until a KV store is added.

## Next

- Pre-generated sets with images stored in a database (`Item.image` is already rendered when present).
- Jev-powered search over the set catalogue.
