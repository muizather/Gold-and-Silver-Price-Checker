import 'dotenv/config';
import axios from 'axios';
import { calculateTolaPrices } from './fetch-prices.js';

// GoldAPI.io configuration
const GOLDAPI_BASE_URL = 'https://www.goldapi.io/api';

/**
 * Get all available API keys from environment variables
 * Looks for any env var starting with 'GOLDAPI_KEY'
 * @returns {string[]} Array of API keys
 */
function getAvailableApiKeys() {
  const keys = Object.keys(process.env)
    .filter(key => key.startsWith('GOLDAPI_KEY'))
    .map(key => process.env[key])
    .filter(val => val && val.trim() !== ''); // Ensure value is not empty

  return keys;
}

/**
 * Shuffle array in place
 * @param {Array} array
 * @returns {Array} Shuffled array
 */
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Fetch gold price from GoldAPI.io
 * Format: GET https://www.goldapi.io/api/XAU/{currency}
 * @param {string} currency
 * @param {string} apiKey - Optional specific key to use
 */
async function fetchGoldPrice(currency = 'PKR', apiKey = null) {
  // If no specific key provided, pick a random one (legacy behavior)
  const keyToUse = apiKey || shuffleArray(getAvailableApiKeys())[0];

  if (!keyToUse) {
    console.error('Error: No GOLDAPI_KEY environment variables found.');
    throw new Error('No API keys available');
  }

  try {
    const response = await axios.get(`${GOLDAPI_BASE_URL}/XAU/${currency}`, {
      headers: {
        'x-access-token': keyToUse,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    // Propagate error for the caller to handle (e.g., retry logic)
    throw error;
  }
}

/**
 * Fetch silver price from GoldAPI.io
 * Format: GET https://www.goldapi.io/api/XAG/{currency}
 * @param {string} currency
 * @param {string} apiKey - Optional specific key to use
 */
async function fetchSilverPrice(currency = 'PKR', apiKey = null) {
  // If no specific key provided, pick a random one (legacy behavior)
  const keyToUse = apiKey || shuffleArray(getAvailableApiKeys())[0];

  if (!keyToUse) {
    console.error('Error: No GOLDAPI_KEY environment variables found.');
    throw new Error('No API keys available');
  }

  try {
    const response = await axios.get(`${GOLDAPI_BASE_URL}/XAG/${currency}`, {
      headers: {
        'x-access-token': keyToUse,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    // Propagate error for the caller to handle (e.g., retry logic)
    throw error;
  }
}

/**
 * Get USD to PKR exchange rate
 * Uses ExchangeRate-API v6 open access endpoint (no API key required)
 * https://open.er-api.com/v6/latest/USD
 */
async function getUSDtoPKR() {
  try {
    const response = await axios.get('https://open.er-api.com/v6/latest/USD', {
      timeout: 5000
    });
    return response.data.rates.PKR || 282.81; // Fallback to approximate rate
  } catch (error) {
    console.warn('Could not fetch USD/PKR rate, using fallback: 282.81');
    return 282.81; // Approximate fallback (current rate as of Nov 2025)
  }
}

/**
 * Helper to check if error is a quota error
 */
function isQuotaError(error) {
  const data = error.response?.data;
  if (data && data.error && typeof data.error === 'string' && data.error.includes('quota exceeded')) {
    return true;
  }
  return false;
}

/**
 * Fetch both gold and silver prices from GoldAPI.io
 * Returns prices in PKR per gram (gold) and PKR per kg (silver)
 * Uses USD prices and converts to PKR (PKR is not available in GoldAPI.io)
 *
 * Implements retry logic with key rotation on quota failure.
 */
async function fetchPricesFromGoldAPI() {
  console.log('Fetching prices from GoldAPI.io (USD) and converting to PKR...\n');

  // Get all keys and randomize order
  const keys = shuffleArray(getAvailableApiKeys());

  if (keys.length === 0) {
    console.error('No API keys configured!');
    return null;
  }

  let goldData = null;
  let silverData = null;
  let success = false;

  // Try keys one by one
  for (const key of keys) {
    const maskedKey = key.substring(0, 4) + '...' + key.substring(key.length - 4);
    console.log(`Attempting to fetch with key: ${maskedKey}`);

    try {
      // Fetch USD prices directly (PKR is not available)
      // Must use the SAME key for both calls to ensure consistency/validity
      goldData = await fetchGoldPrice('USD', key);
      silverData = await fetchSilverPrice('USD', key);

      if (goldData && !goldData.error && silverData && !silverData.error) {
        success = true;
        console.log(`Successfully fetched prices using key: ${maskedKey}`);
        break; // Exit loop on success
      }
    } catch (error) {
      const errorMsg = error.response?.data || error.message;
      console.error(`Error with key ${maskedKey}:`, errorMsg);

      // Continue to next key
      if (isQuotaError(error)) {
        console.log('Quota exceeded for this key. Switching to next key...');
      } else {
        console.log('Request failed. Switching to next key...');
      }
    }
  }

  if (!success) {
    console.error('Failed to fetch prices with all available keys.');
    return null;
  }

  // Get USD to PKR exchange rate
  const pkrRate = await getUSDtoPKR();

  // GoldAPI.io provides price_gram_24k directly in the response
  // Use that if available, otherwise convert from price (which is per ounce)
  let goldPerGram, silverPerKg;

  if (goldData.price_gram_24k) {
    // Already in USD per gram, convert to PKR
    goldPerGram = goldData.price_gram_24k * pkrRate;
  } else {
    // Convert from per ounce to per gram
    goldPerGram = (goldData.price / 31.1035) * pkrRate;
  }

  if (silverData.price_gram_24k) {
    // Already in USD per gram, convert to PKR per kg
    silverPerKg = silverData.price_gram_24k * 1000 * pkrRate;
  } else {
    // Convert from per ounce to per kg
    silverPerKg = ((silverData.price * 1000) / 31.1035) * pkrRate;
  }

  return {
    gold: goldPerGram,
    silver: silverPerKg,
    goldRaw: goldData,
    silverRaw: silverData,
    source: 'GoldAPI.io'
  };
}

/**
 * Format prices for display
 */
function formatPriceMessage(goldPerGram, silverPerKg, source = 'GoldAPI.io') {
  const calculated = calculateTolaPrices(goldPerGram, silverPerKg);

  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Karachi',
    dateStyle: 'full',
    timeStyle: 'short'
  });

  const message = `🏅 *Gold & Silver Prices - ${timestamp}*

📊 *Gold Prices:*
• Per gram: *${calculated.gold.perGram.toFixed(2)} PKR*
• Per tola: *${calculated.gold.perTola.toFixed(2)} PKR*

🥈 *Silver Prices:*
• Per kg: *${calculated.silver.perKg.toFixed(2)} PKR*
• Per tola: *${calculated.silver.perTola.toFixed(2)} PKR*

📈 *Gold/Silver Ratio:* *${calculated.ratio.toFixed(4)}*
(1 tola gold = ${calculated.ratio.toFixed(2)} tola silver)

_Source: ${source}_`;

  return message;
}

export { fetchPricesFromGoldAPI, fetchGoldPrice, fetchSilverPrice, formatPriceMessage };
