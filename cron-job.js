#!/usr/bin/env node

/**
 * Cron-friendly script to send gold/silver prices to Google Chat
 * This script is designed to be run from cron jobs
 * It loads .env automatically and sends prices
 */

import 'dotenv/config';
import { fetchPricesFromGoldAPI } from './goldapi-fetcher.js';
import { calculateTolaPrices } from './fetch-prices.js';
import { updateHistory } from './history-manager.js';
import { sendUpdateLink } from './google-chat-sender.js';

async function run() {
  try {
    // 1. Fetch Prices
    console.log('Fetching prices...');
    const prices = await fetchPricesFromGoldAPI();

    if (!prices) {
      console.error('Failed to fetch prices.');
      process.exit(1);
    }

    // 2. Calculate Tola Prices (needed for history)
    const calculated = calculateTolaPrices(prices.gold, prices.silver);

    // 3. Update History File
    console.log('Updating history...');
    await updateHistory(calculated);

    // 4. Send Link to Chat (Short message)
    console.log('Notifying chat...');
    await sendUpdateLink();

    process.exit(0);
  } catch (error) {
    console.error('Error in cron job:', error);
    process.exit(1);
  }
}

run();
