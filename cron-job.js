#!/usr/bin/env node

/**
 * Cron-friendly script to send gold/silver prices to Google Chat
 * This script is designed to be run from cron jobs
 * It loads .env automatically and sends prices
 */

import 'dotenv/config';
import { fetchAndSend } from './google-chat-sender.js';

// Run the fetch and send function
fetchAndSend()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error in cron job:', error);
    process.exit(1);
  });
