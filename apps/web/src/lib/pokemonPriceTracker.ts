const BASE_URL = "https://www.pokemonpricetracker.com/api/v2";

interface PriceHistoryPoint {
  date: string;
  market: number;
  volume: number | null;
}

interface CardCondition {
  history: PriceHistoryPoint[];
}

interface CardResult {
  tcgPlayerId: string;
  name: string;
  setName: string;
  cardNumber: string;
  rarity: string;
  prices: {
    market: number;
    low: number;
  };
  imageCdnUrl400: string;
  priceHistory?: {
    conditions: Record<string, CardCondition>;
  };
}

interface SearchResponse {
  data: CardResult[];
}

// One card per watchlist term: the highest-priced printing, with its recent
// price history (3 days on the free plan). Cached for an hour so repeated page
// loads during development don't burn through the daily API credit budget.
export async function fetchTopPrinting(searchTerm: string): Promise<CardResult | null> {
  const apiKey = process.env.POKEMON_PRICE_TRACKER_API_KEY;
  if (!apiKey) {
    throw new Error("POKEMON_PRICE_TRACKER_API_KEY is not set");
  }

  // Deliberately not sorting by price: the highest-priced printing of any
  // given name tends to be an ultra-rare alternate-art / secret-rare variant
  // with near-zero trading volume - exactly what the liquidity filter in
  // toMover() is designed to exclude. Default relevance order surfaces more
  // actively-traded printings more often.
  const url = `${BASE_URL}/cards?search=${encodeURIComponent(searchTerm)}&limit=1&includeHistory=true`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}` },
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    console.error(`PokemonPriceTracker request failed for "${searchTerm}": ${res.status}`);
    return null;
  }

  const json: SearchResponse = await res.json();
  return json.data[0] ?? null;
}

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
