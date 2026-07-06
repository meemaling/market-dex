import Image from "next/image";
import { getMovers, type Mover } from "@market-dex/db";

// Data only changes once a day (jobs/daily-sync), but this page is otherwise
// static - revalidate hourly so a deploy isn't required to pick up new data.
export const revalidate = 3600;

function MoverCard({ mover }: { mover: Mover }) {
  const isPositive = mover.pctChange >= 0;
  return (
    <li className="flex items-center gap-4 rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
      <Image
        src={mover.imageUrl}
        alt={mover.name}
        width={56}
        height={78}
        className="rounded-sm"
        unoptimized
      />
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium text-zinc-900 dark:text-zinc-50">{mover.name}</p>
        <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
          {mover.setName} · #{mover.cardNumber}
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-300">${mover.price.toFixed(2)}</p>
      </div>
      <span
        className={`shrink-0 font-semibold ${
          isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        }`}
      >
        {isPositive ? "+" : ""}
        {mover.pctChange.toFixed(1)}%
      </span>
    </li>
  );
}

export default async function Home() {
  const { gainers, losers } = await getMovers();

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-12 dark:bg-black sm:px-12">
      <main className="mx-auto max-w-3xl">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Today&apos;s Pokémon Card Movers
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Biggest gainers and losers from the last few days, tracked across a starter watchlist.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Top Gainers
            </h2>
            <ul className="flex flex-col gap-3">
              {gainers.length === 0 && (
                <p className="text-sm text-zinc-500">No gainers matched the ranking filters today.</p>
              )}
              {gainers.map((mover) => (
                <MoverCard key={mover.tcgPlayerId} mover={mover} />
              ))}
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Top Losers
            </h2>
            <ul className="flex flex-col gap-3">
              {losers.length === 0 && (
                <p className="text-sm text-zinc-500">No losers matched the ranking filters today.</p>
              )}
              {losers.map((mover) => (
                <MoverCard key={mover.tcgPlayerId} mover={mover} />
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
