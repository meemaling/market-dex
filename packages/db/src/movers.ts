import { prisma } from "./client";

export interface Mover {
  tcgPlayerId: string;
  name: string;
  setName: string;
  cardNumber: string;
  imageUrl: string;
  price: number;
  pctChange: number;
  volume: number;
}

// Backend constants, tunable without touching the UI - see README's Ranking
// Methodology. Window is still an open question (README's Open Questions):
// 7 days is a starting point, not a tuned value.
const COMPARISON_WINDOW_DAYS = 7;
const MIN_PRICE = 3;
const MIN_VOLUME = 1;

function windowStart(days: number): Date {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - days);
  return start;
}

// Same ranking logic as Phase 0's toMover(), sourced from our own stored
// snapshots instead of the API's own (credit-costly, 3-day-capped) history.
export async function getMovers(): Promise<{ gainers: Mover[]; losers: Mover[] }> {
  const cards = await prisma.card.findMany({
    include: {
      set: true,
      snapshots: {
        where: { date: { gte: windowStart(COMPARISON_WINDOW_DAYS) } },
        orderBy: { date: "asc" },
      },
    },
  });

  const movers: Mover[] = [];

  for (const card of cards) {
    if (card.snapshots.length < 2) continue;

    const first = card.snapshots[0];
    const last = card.snapshots[card.snapshots.length - 1];
    if (first.price <= 0) continue;

    const volume = card.snapshots.reduce((sum, snapshot) => sum + snapshot.volume, 0);
    if (last.price < MIN_PRICE) continue;
    if (volume < MIN_VOLUME) continue;

    movers.push({
      tcgPlayerId: card.tcgPlayerId,
      name: card.name,
      setName: card.set.name,
      cardNumber: card.cardNumber,
      imageUrl: card.imageUrl,
      price: last.price,
      pctChange: ((last.price - first.price) / first.price) * 100,
      volume,
    });
  }

  const gainers = [...movers].sort((a, b) => b.pctChange - a.pctChange).slice(0, 5);
  const losers = [...movers].sort((a, b) => a.pctChange - b.pctChange).slice(0, 5);

  return { gainers, losers };
}
