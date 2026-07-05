# Pokémon Card Daily Movers

A daily digest of the Pokémon card market — the biggest gaining and losing cards, computed from real price data, delivered as a page you can check (and share) in under a minute.

## Problem

Collectors currently have to check multiple price trackers, marketplaces, and social accounts to understand what happened in the market that day. This product collapses that into one page, updated automatically, once a day.

## Product Principle

Start with the smallest thing people would actually return to. Validate that before adding anything else. Every feature below "V1" is explicitly deferred until V1 proves people care.

## V1 Scope

**One feature: a daily Top Movers report.**

- Top gaining cards (by % price change)
- Top losing cards (by % price change)
- Computed once a day from a scheduled job, no manual curation
- Public page, no login, no accounts, no personalization
- Auto-posted summary to the existing social media account, linking back to the page

That's the entire V1 surface. No news, no restock tracking, no filters, no categories, no watchlists.

### Why this one feature

- Needs exactly one data source (price data), not several.
- Pure computation — no editorial judgment or NLP required.
- Inherently shareable, which plugs directly into the distribution channel already in hand (the social account).
- Directly tests the core hypothesis: do collectors care enough about daily price movement to come back? If not, no other feature saves the product.

### Explicitly out of scope for V1 (and why)

| Feature | Why deferred |
|---|---|
| Market news aggregation | Curation problem — multiple sources, dedup, relevance filtering. A second product, not a feature. |
| Restock / product announcements | No single clean data source; means scraping multiple retailers with high maintenance cost. |
| User accounts / watchlists / portfolio tracking | No reason to persist per-user data until there's a concrete feature that needs it (e.g. "notify me about my cards"). |
| Filters / category sections (vintage vs. modern, etc.) | Solved at the data layer instead (see Ranking Methodology) so the UI stays a single glanceable list. |
| Mobile apps | Not needed to validate the idea; architecture just needs to not block it later. |

## Ranking Methodology

Naive "biggest $ change" ranking is dominated by expensive, illiquid cards and doesn't reflect what collectors can actually act on. Fixed at the data/query layer, not the UI, so the page stays a single simple list:

1. **Rank by % change, not $ change** — a card moving $500→$520 is noise; $15→$22 is the story.
2. **Minimum price floor** (e.g. $2–5) — filters out bulk-bin noise like $0.10→$0.20 registering as "100%."
3. **Liquidity proxy** — true sales-volume data isn't available from the free pricing APIs evaluated so far, so V1 approximates it using our own accumulating daily snapshots (a card with smooth, consistent day-over-day pricing is more likely actively traded than one with erratic single-sale jumps). This is a placeholder for a real sales-volume signal once a second data source is added post-V1.

These are backend constants, tunable without touching the UI — not user-facing filters.

## Data Source

**Primary (V1): [PokemonPriceTracker](https://www.pokemonpricetracker.com/pokemon-card-price-api)**

- Free tier: 100 credits/day, 60 requests/min, 3-day price history, no card required
- Aggregates from TCGPlayer, eBay, and CardMarket
- Returns pre-computed 7-day deltas and ROI%, reducing pipeline work
- No commercial-use restriction found (unlike alternatives evaluated)

**Evaluated and rejected for V1:**

- *PriceCharting* — subscription-gated, no free tier, current-value only (no historical API), no sales-volume field.
- *TCG API (tcgapi.dev)* — free tier explicitly restricted to non-commercial use, which a promoted public site doesn't qualify as.
- *pokemon-api.com (RapidAPI)* — free tier too small to be usable (30 calls/day), materially more expensive per call at paid tiers than PokemonPriceTracker, run by a small/indie operation with no visible commercial-use terms.

**Future (post-V1):** a transaction-level source (e.g. eBay sold listings) to replace the liquidity proxy with real sales-volume data, combined with the existing source for compounding data value.

## Technical Architecture

**Principles:** simple to build now, doesn't block scaling later, works well with AI coding agents, frontend/backend separated enough that a future mobile app reuses the same backend.

**Language:** TypeScript across the stack (frontend, backend, shared types). One language reduces context-switching for a small team and matches where AI coding agents are strongest. An isolated data-ingestion script may use Python instead if scraping/parsing work benefits from it — it's a standalone job, not a shared library, so the language choice there doesn't leak into the rest of the stack.

**Structure (monorepo):**

```
/apps
  /web         — Next.js frontend, calls the API over HTTP only (no direct DB access)
  /api         — API service (Fastify or Next.js route handlers), owns all DB access and business logic
/packages
  /db          — Prisma schema + client, single source of truth for the data model
  /types       — shared TypeScript types / Zod schemas used by web, api, and (later) mobile
/jobs
  /daily-sync  — scheduled script: pulls prices, computes deltas, writes snapshots — isolated so it can fail/retry independently of the API
```

A future mobile app becomes `apps/mobile` (Expo/React Native), consuming `apps/api` and `packages/types` the same way the web app does — no backend rewrite required.

**Database:** Postgres (Neon or Supabase — hosted, free tier, minimal ops). Cards, sets, and daily price snapshots are naturally relational, and "compare against N days ago" is a straightforward SQL query.

**Scheduling:** a simple daily cron (Vercel Cron, scheduled GitHub Action, or Supabase Edge Function). No job queue or orchestrator — not needed at this scale.

**Hosting:** Vercel for the web app; API starts as Vercel serverless functions for speed of shipping, and can move to a dedicated host (Railway, Fly.io) later without a rewrite, since it's already structurally separate.

## Open Questions / Next Steps

- [ ] Confirm PokemonPriceTracker's terms explicitly allow commercial/public use before launch
- [ ] Design the exact data model (cards, sets, daily price snapshots)
- [ ] Decide the daily comparison window (24h vs. 7-day) — test which produces a more useful/less noisy list
- [ ] Tune ranking thresholds (price floor, liquidity proxy) against real data once the sync job is running
- [ ] Design the social auto-post format (what makes a good daily share)
