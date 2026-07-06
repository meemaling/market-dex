import Image from "next/image";
import { getMovers, type Mover } from "@market-dex/db";

// Data only changes once a day (jobs/daily-sync), but this page is otherwise
// static - revalidate hourly so a deploy isn't required to pick up new data.
export const revalidate = 3600;

function DeltaPill({ pctChange }: { pctChange: number }) {
  const isPositive = pctChange >= 0;
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-sm font-semibold tabular-nums ${
        isPositive
          ? "bg-good/10 text-good dark:bg-good/15"
          : "bg-critical/10 text-critical dark:bg-critical/15"
      }`}
    >
      <span aria-hidden>{isPositive ? "▲" : "▼"}</span>
      {Math.abs(pctChange).toFixed(1)}%
    </span>
  );
}

function MoverCard({ mover }: { mover: Mover }) {
  return (
    <li className="flex items-center gap-4 rounded-xl border border-foreground/10 bg-surface p-3 shadow-sm shadow-foreground/[0.03]">
      <Image
        src={mover.imageUrl}
        alt={mover.name}
        width={56}
        height={78}
        className="rounded-md"
        unoptimized
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{mover.name}</p>
        <p className="truncate text-sm text-muted">
          {mover.setName} · #{mover.cardNumber}
        </p>
        <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground/80">
          ${mover.price.toFixed(2)}
        </p>
      </div>
      <DeltaPill pctChange={mover.pctChange} />
    </li>
  );
}

function MoverSection({
  title,
  emptyMessage,
  movers,
  accent,
}: {
  title: string;
  emptyMessage: string;
  movers: Mover[];
  accent: "good" | "critical";
}) {
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-1.5 text-lg font-semibold text-foreground">
        <span aria-hidden className={accent === "good" ? "text-good" : "text-critical"}>
          {accent === "good" ? "▲" : "▼"}
        </span>
        {title}
      </h2>
      <ul className="flex flex-col gap-3">
        {movers.length === 0 && (
          <p className="rounded-xl border border-dashed border-foreground/15 p-4 text-sm text-muted">
            {emptyMessage}
          </p>
        )}
        {movers.map((mover) => (
          <MoverCard key={mover.tcgPlayerId} mover={mover} />
        ))}
      </ul>
    </section>
  );
}

export default async function Home() {
  const { gainers, losers } = await getMovers();

  return (
    <div className="min-h-screen bg-background px-6 py-12 sm:px-12">
      <main className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Market Dex
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Today&apos;s Pokémon Card Movers
        </h1>
        <p className="mt-2 text-sm text-muted">
          Biggest gainers and losers from the last few days, tracked across a starter watchlist.
        </p>

        <div className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <MoverSection
            title="Top Gainers"
            emptyMessage="No gainers matched the ranking filters today."
            movers={gainers}
            accent="good"
          />
          <MoverSection
            title="Top Losers"
            emptyMessage="No losers matched the ranking filters today."
            movers={losers}
            accent="critical"
          />
        </div>
      </main>
    </div>
  );
}
