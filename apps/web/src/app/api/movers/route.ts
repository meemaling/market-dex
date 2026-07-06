import { NextResponse } from "next/server";
import { WATCHLIST, fetchTopPrinting } from "@market-dex/pokemon-price-tracker";
import { toMover, type Mover } from "@/lib/ranking";

export async function GET() {
  const cards = await Promise.all(WATCHLIST.map(fetchTopPrinting));

  const movers = cards
    .filter((card): card is NonNullable<typeof card> => card !== null)
    .map(toMover)
    .filter((mover): mover is Mover => mover !== null);

  const gainers = [...movers].sort((a, b) => b.pctChange - a.pctChange).slice(0, 5);
  const losers = [...movers].sort((a, b) => a.pctChange - b.pctChange).slice(0, 5);

  return NextResponse.json({ gainers, losers });
}
