# Pokémon Card Daily Movers

A daily digest of the Pokémon card market — the biggest gaining and losing cards, computed from real price data, delivered as a page you can check (and share) in under a minute.

## Problem

Collectors currently have to check multiple price trackers, marketplaces, and social accounts to understand what happened in the market that day. This product collapses that into one page, updated automatically, once a day.

## Product Principle

Start with the smallest thing people would actually return to. Validate that before adding anything else. Every feature below "V1" is explicitly deferred until V1 proves people care.

## V1 Scope

**One feature: a daily Top Movers report.**

- Top gaining cards (by % price change), shown with card image, name, set, and price
- Top losing cards (by % price change), shown with card image, name, set, and price
- Computed once a day from a scheduled job, no manual curation
- Public page, no login, no accounts, no personalization
- Auto-posted summary to the existing social media account, linking back to the page
- Web only for V1 — no native app. Nothing in this scope needs a native capability (no push notifications yet, since that requires accounts/watchlists, which are explicitly deferred). The backend is already structured as a standalone API so a native app can be added later without a rewrite, once a feature actually needs one.

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

- Free tier: 100 credits/day, 60 requests/min, no card required
- Aggregates from TCGPlayer, eBay, and CardMarket
- No commercial-use restriction found (unlike alternatives evaluated)

**Confirmed from real API calls (not just the marketing docs) during Phase 0 build:**

- **Credits are spent per card returned, and double when history is requested**: 1 credit/card for a plain price lookup, 2 credits/card when `includeHistory=true`. At 100 credits/day, that's ~50 cards/day max with history included. This rules out "scan the whole market for movers" on the free tier — V1 tracks a **fixed watchlist** of individual cards instead (see `apps/web/src/lib/watchlist.ts`), not an open scan. Expandable later, bounded by this budget until Phase 1 removes the need for `includeHistory` entirely (see below).
- **Free tier history is capped at 3 days**, not 7 as the marketing page implied — and in practice that's often only 1-2 real data points per card. For many stable cards this shows as 0% change, which isn't a bug, it's a real consequence of a short window. This is the concrete reason Phase 1's own daily snapshots matter: once we're storing our own history over weeks, deltas become meaningful regardless of what window the API gives us, and we stop paying the 2x history credit cost since we compute deltas from our own stored data instead.
- **Real sales volume data does exist**, correcting what was assumed earlier: each history point includes a `volume` field. This makes the liquidity floor in the ranking methodology a real filter, not just a proxy - confirmed working in testing, where it correctly excluded ultra-rare alternate-art/secret cards with near-zero trading volume.
- Picking "the highest-priced printing of a name" (an early attempt at auto-building the watchlist) systematically selects exactly the illiquid chase variants the liquidity filter is meant to exclude. Default relevance search order surfaces more actively-traded printings more often - worth a more deliberate watchlist curation pass later.

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

## Build Order

Two phases, so there's a working page to look at as early as possible without building the full pipeline first.

**Phase 0 — local walking skeleton (no database yet): done**
1. ~~Get a free PokemonPriceTracker API key.~~
2. ~~Scaffold `apps/web` (Next.js) and a minimal API endpoint.~~ Built as a Next.js route handler (`apps/web/src/app/api/movers`) rather than a separate `apps/api` service for now — a pragmatic Phase 0 shortcut, not the final architecture. Splitting it into a real standalone `apps/api` is Phase 1 work.
3. ~~Calls PokemonPriceTracker directly, applies the ranking rules (% change, minimum price floor, minimum volume), returns top gainers/losers as JSON.~~ Working against a fixed watchlist (see Data Source notes above on why).
4. ~~`apps/web` renders that as the actual page, including card images.~~

This is for local development only — it is **not** how the deployed product should work, because calling PokemonPriceTracker live on every page view would burn through the free tier's 100 credits/day almost immediately with any real traffic. (`fetch` calls are cached for an hour during dev to limit this, but that's a band-aid, not the real fix.)

**Phase 1 — before deploying publicly (not started):**
5. Add `packages/db` (Prisma + Postgres via Neon), with tables for cards, sets, and daily price snapshots.
6. Build `jobs/daily-sync` to pull from PokemonPriceTracker once a day and write snapshots — this is what the original pitch's "updates automatically, little to no manual work" actually depends on.
7. Point `apps/api` at the database instead of calling PokemonPriceTracker live per request. Same ranking logic from Phase 0, different data source underneath.
8. Deploy (Vercel + Neon), wire up the social auto-post.

**Designed to absorb a paid API plan later without a rewrite** (not upgrading yet, but building for it):
- The watchlist stays a plain config the sync job reads, not logic with an assumed size baked in — going from a dozen cards to a few hundred is a data change, not a code change.
- `jobs/daily-sync` fetches in small batches with a configurable delay/concurrency limit, so it respects whatever the current plan's rate limit is (60 req/min on free) regardless of watchlist size — it just takes longer on a bigger list, it doesn't need rewriting.
- The `Card`/`PriceSnapshot` schema doesn't encode any assumption about how many cards exist — scanning a bigger watchlist or eventually more of the market is purely "more rows," not a schema change.
- A paid plan mainly changes *how big the watchlist can be* (and possibly unlocks deeper native history), not whether Phase 1's own-database approach is still the right design — see Data Source notes above.

## Open Questions / Next Steps

- [ ] Confirm PokemonPriceTracker's terms explicitly allow commercial/public use before launch
- [ ] Design the exact data model (cards, sets, daily price snapshots)
- [ ] Decide the daily comparison window (24h vs. 7-day) — test which produces a more useful/less noisy list
- [ ] Tune ranking thresholds (price floor, liquidity proxy) against real data once the sync job is running
- [ ] Design the social auto-post format (what makes a good daily share)
