#!/usr/bin/env node

/**
 * Cron-friendly script to send gold/silver prices to Google Chat
 * This script is designed to be run from cron jobs
 * It loads .env automatically and sends prices
 */

import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { fetchPricesFromGoldAPI } from './goldapi-fetcher.js';
import { calculateTolaPrices } from './fetch-prices.js';
import { updateHistory } from './history-manager.js';
// import { sendUpdateLink } from './google-chat-sender.js'; // Disabled as per user request

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, 'update_log.txt');

/**
 * Log activity to local file
 * @param {Object} prices - The price object
 */
function logActivity(prices) {
  try {
    const timestamp = new Date().toISOString();
    const goldRate = prices.gold.perTola.toFixed(2);
    const silverRate = prices.silver.perTola.toFixed(2);

    const logEntry = `[${timestamp}] Updated prices - Gold: ${goldRate} PKR/Tola, Silver: ${silverRate} PKR/Tola\n`;

    fs.appendFileSync(LOG_FILE, logEntry);
    console.log('✓ Logged activity to update_log.txt');
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

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

    // 4. Log to File (Instead of Chat)
    console.log('Logging activity...');
    logActivity(calculated);

    // Disabled Chat Notification
    // await sendUpdateLink();

    process.exit(0);
  } catch (error) {
    console.error('Error in cron job:', error);
    process.exit(1);
  }
}

run();
