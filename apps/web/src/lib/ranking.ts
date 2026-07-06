import type { CardResult } from "@market-dex/pokemon-price-tracker";

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

const MIN_PRICE = 3;
const MIN_VOLUME = 1;

// Turns a raw card result into a ranked Mover, or null if it fails the
// liquidity/price-floor checks from the README's ranking methodology.
export function toMover(card: CardResult): Mover | null {
  if (card.prices.market < MIN_PRICE) return null;

  const conditions = card.priceHistory?.conditions;
  if (!conditions) return null;

  const conditionKey = "Near Mint" in conditions ? "Near Mint" : Object.keys(conditions)[0];
  const history = conditions[conditionKey]?.history;
  if (!history || history.length < 2) return null;

  const first = history[0];
  const last = history[history.length - 1];
  const volume = history.reduce((sum, point) => sum + (point.volume ?? 0), 0);

  if (volume < MIN_VOLUME) return null;
  if (first.market <= 0) return null;

  const pctChange = ((last.market - first.market) / first.market) * 100;

  return {
    tcgPlayerId: card.tcgPlayerId,
    name: card.name,
    setName: card.setName,
    cardNumber: card.cardNumber,
    imageUrl: card.imageCdnUrl400,
    price: card.prices.market,
    pctChange,
    volume,
  };
}
