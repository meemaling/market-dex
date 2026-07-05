# jobs/daily-sync

The scheduled script that runs once a day: pulls prices from PokemonPriceTracker, computes deltas against the previous snapshot, and writes results to the database.

Isolated from `apps/api` so it can fail or retry independently. Not yet scaffolded.
