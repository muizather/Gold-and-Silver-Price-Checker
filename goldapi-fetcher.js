import 'dotenv/config';
import axios from 'axios';
import { calculateTolaPrices } from './fetch-prices.js';

// GoldAPI.io configuration
const GOLDAPI_BASE_URL = 'https://www.goldapi.io/api';

/**
 * Get a random API key from available environment variables
 * Looks for any env var starting with 'GOLDAPI_KEY'
 */
function getRandomApiKey() {
  const keys = Object.keys(process.env)
    .filter(key => key.startsWith('GOLDAPI_KEY'))
    .map(key => process.env[key])
    .filter(val => val && val.trim() !== ''); // Ensure value is not empty

  if (keys.length === 0) {
    return null;
  }

  const randomIndex = Math.floor(Math.random() * keys.length);
  const selectedKey = keys[randomIndex];

  // Log masked key for debugging
  const maskedKey = selectedKey.substring(0, 4) + '...' + selectedKey.substring(selectedKey.length - 4);
  console.log(`Using API Key: ${maskedKey} (pool size: ${keys.length})`);

  return selectedKey;
}

// Select a key once per execution
const SELECTED_API_KEY = getRandomApiKey();

/**
 * Fetch gold price from GoldAPI.io
 * Format: GET https://www.goldapi.io/api/XAU/{currency}
 */
async function fetchGoldPrice(currency = 'PKR') {
  if (!SELECTED_API_KEY) {
    console.error('Error: No GOLDAPI_KEY environment variables found.');
    return null;
  }

  try {
    const response = await axios.get(`${GOLDAPI_BASE_URL}/XAU/${currency}`, {
      headers: {
        'x-access-token': SELECTED_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching gold price:', error.response?.data || error.message);
    return null;
  }
}

/**
 * Fetch silver price from GoldAPI.io
 * Format: GET https://www.goldapi.io/api/XAG/{currency}
 */
async function fetchSilverPrice(currency = 'PKR') {
  if (!SELECTED_API_KEY) {
    console.error('Error: No GOLDAPI_KEY environment variables found.');
    return null;
  }

  try {
    const response = await axios.get(`${GOLDAPI_BASE_URL}/XAG/${currency}`, {
      headers: {
        'x-access-token': SELECTED_API_KEY,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching silver price:', error.response?.data || error.message);
    return null;
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
 * Fetch both gold and silver prices from GoldAPI.io
 * Returns prices in PKR per gram (gold) and PKR per kg (silver)
 * Uses USD prices and converts to PKR (PKR is not available in GoldAPI.io)
 *
 * API Calls: 2 (one for gold, one for silver)
 */
async function fetchPricesFromGoldAPI() {
  console.log('Fetching prices from GoldAPI.io (USD) and converting to PKR...\n');

  // Fetch USD prices directly (PKR is not available)
  const goldData = await fetchGoldPrice('USD');
  const silverData = await fetchSilverPrice('USD');

  if (!goldData || goldData.error || !silverData || silverData.error) {
    console.error('Failed to fetch prices from GoldAPI.io');
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
