import { prisma } from "@market-dex/db";
import { WATCHLIST, fetchTopPrinting, latestVolume, type CardResult } from "@market-dex/pokemon-price-tracker";

// Free tier allows 60 requests/min; a small delay between requests keeps this
// job well under that regardless of how large the watchlist grows later.
const REQUEST_DELAY_MS = 250;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function writeSnapshot(card: CardResult, date: Date) {
  const set = await prisma.set.upsert({
    where: { name: card.setName },
    create: { name: card.setName },
    update: {},
  });

  const dbCard = await prisma.card.upsert({
    where: { tcgPlayerId: card.tcgPlayerId },
    create: {
      tcgPlayerId: card.tcgPlayerId,
      name: card.name,
      cardNumber: card.cardNumber,
      rarity: card.rarity,
      imageUrl: card.imageCdnUrl400,
      setId: set.id,
    },
    update: {
      name: card.name,
      cardNumber: card.cardNumber,
      rarity: card.rarity,
      imageUrl: card.imageCdnUrl400,
      setId: set.id,
    },
  });

  await prisma.priceSnapshot.upsert({
    where: { cardId_date: { cardId: dbCard.id, date } },
    create: { cardId: dbCard.id, date, price: card.prices.market, volume: latestVolume(card) },
    update: { price: card.prices.market, volume: latestVolume(card) },
  });
}

async function main() {
  const date = todayUTC();
  let succeeded = 0;
  let failed = 0;

  for (const searchTerm of WATCHLIST) {
    try {
      const card = await fetchTopPrinting(searchTerm);
      if (!card) {
        console.error(`No data returned for "${searchTerm}", skipping`);
        failed++;
      } else {
        await writeSnapshot(card, date);
        succeeded++;
      }
    } catch (err) {
      console.error(`Failed to sync "${searchTerm}":`, err);
      failed++;
    }
    await delay(REQUEST_DELAY_MS);
  }

  console.log(`Daily sync for ${date.toISOString().slice(0, 10)}: ${succeeded} succeeded, ${failed} failed.`);
}

main()
  .catch((err) => {
    console.error("Daily sync failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
