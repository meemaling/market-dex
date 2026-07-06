const BASE_URL = "https://www.pokemonpricetracker.com/api/v2";

export interface PriceHistoryPoint {
  date: string;
  market: number;
  volume: number | null;
}

export interface CardCondition {
  history: PriceHistoryPoint[];
}

export interface CardResult {
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
  // with near-zero trading volume - exactly what callers' liquidity filters
  // are meant to exclude. Default relevance order surfaces more actively
  // traded printings more often.
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

// Pulls the most recent *settled* history point's volume for a card,
// defaulting to 0 when none is available. The API's history always reports
// `volume: null` for the current day (it hasn't settled yet), so this walks
// backward past any trailing nulls rather than trusting the last entry.
export function latestVolume(card: CardResult): number {
  const conditions = card.priceHistory?.conditions;
  if (!conditions) return 0;

  const conditionKey = "Near Mint" in conditions ? "Near Mint" : Object.keys(conditions)[0];
  const history = conditions[conditionKey]?.history;
  if (!history) return 0;

  for (let i = history.length - 1; i >= 0; i--) {
    const volume = history[i].volume;
    if (volume !== null) return volume;
  }
  return 0;
}
