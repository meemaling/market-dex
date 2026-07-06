# packages/db

Prisma schema and client — the single source of truth for the data model (cards, sets, daily price snapshots).

Used by `apps/web` and `jobs/daily-sync`. Reads `DATABASE_URL` from the repo-root `.env` (see root README's env var notes).

- `npm run generate -w packages/db` — regenerate the Prisma client after editing `prisma/schema.prisma`
- `npm run migrate -w packages/db` — create and apply a new migration
- `npm run studio -w packages/db` — open Prisma Studio to browse data
