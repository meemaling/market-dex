# jobs/daily-sync

The scheduled script that runs once a day: pulls each watchlist card from PokemonPriceTracker and upserts a `PriceSnapshot` row (price + settled volume) per card per day. Delta/ranking computation against stored history is still done at read time (currently in `apps/web`'s API route) - this job's only job is capturing today's numbers.

Run it with `npm run sync -w jobs/daily-sync`. Uses the shared `@market-dex/pokemon-price-tracker` client and `@market-dex/db` Prisma client, reading `DATABASE_URL`/`POKEMON_PRICE_TRACKER_API_KEY` from the repo-root `.env`.

Isolated from `apps/web` so it can fail or retry independently - not wired into a scheduler yet (that's the last Phase 1 step, alongside the actual deploy).
