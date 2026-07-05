// Phase 0 placeholder: a fixed list of well-known cards, tracked by name search.
// The free PokemonPriceTracker tier costs API credits per card returned (more if
// history is included), so "scan the whole market for movers" isn't affordable yet -
// see README's Build Order / API constraints notes. This list is what "movers" is
// computed over for now. Expand it once Phase 1 (own daily snapshots) removes the
// per-request history cost.
export const WATCHLIST = [
  "Charizard",
  "Pikachu",
  "Umbreon",
  "Rayquaza",
  "Mewtwo",
  "Gengar",
  "Blastoise",
  "Venusaur",
  "Lugia",
  "Mew",
  "Gyarados",
  "Eevee",
];
