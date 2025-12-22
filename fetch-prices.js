/**
 * Calculate Tola prices from standard units
 * 1 Tola = 11.6638038 grams
 */

/**
 * Converts prices from per-gram/per-kg to per-tola
 * @param {number} goldPerGram - Price of gold per gram
 * @param {number} silverPerKg - Price of silver per kilogram
 * @returns {Object} Object containing calculated prices
 */
export function calculateTolaPrices(goldPerGram, silverPerKg) {
  // Standard conversion constant
  const GRAMS_IN_TOLA = 11.6638038;

  const goldPerTola = goldPerGram * GRAMS_IN_TOLA;

  // Convert silver per kg to per gram first
  const silverPerGram = silverPerKg / 1000;
  const silverPerTola = silverPerGram * GRAMS_IN_TOLA;

  // Calculate Gold/Silver ratio (price ratio)
  const ratio = goldPerTola / silverPerTola;

  return {
    gold: {
      perGram: goldPerGram,
      perTola: goldPerTola
    },
    silver: {
      perKg: silverPerKg,
      perTola: silverPerTola
    },
    ratio: ratio
  };
}
