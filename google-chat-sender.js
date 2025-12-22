import 'dotenv/config';
import axios from 'axios';
import { fetchPricesFromGoldAPI, formatPriceMessage } from './goldapi-fetcher.js';

// Google Chat Webhook URL - Loaded from .env file
const GOOGLE_CHAT_WEBHOOK_URL = process.env.GOOGLE_CHAT_WEBHOOK_URL || '';

/**
 * Send message to Google Chat via webhook
 *
 * To set up webhook:
 * 1. Open Google Chat
 * 2. Go to the space where you want to receive messages
 * 3. Click on the space name > Manage webhooks
 * 4. Add a webhook and copy the URL
 * 5. Set GOOGLE_CHAT_WEBHOOK_URL environment variable
 */
async function sendToGoogleChat(message) {
  if (!GOOGLE_CHAT_WEBHOOK_URL) {
    console.error('Google Chat webhook URL not configured!');
    console.log('Please set GOOGLE_CHAT_WEBHOOK_URL environment variable');
    console.log('Or pass it as: GOOGLE_CHAT_WEBHOOK_URL=your_url node google-chat-sender.js');
    return false;
  }

  try {
    // Google Chat webhook accepts simple text or card format
    const payload = {
      text: message
    };

    const response = await axios.post(GOOGLE_CHAT_WEBHOOK_URL, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✓ Message sent to Google Chat successfully');
    return true;
  } catch (error) {
    console.error('Error sending to Google Chat:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Fetch prices and send to Google Chat
 */
async function fetchAndSend() {
  console.log('=== Fetching Prices and Sending to Google Chat ===\n');

  // Fetch prices from GoldAPI.io
  const prices = await fetchPricesFromGoldAPI();

  if (!prices) {
    console.error('Failed to fetch prices. Cannot send message.');
    return false;
  }

  // Format message
  const message = formatPriceMessage(prices.gold, prices.silver, prices.source);

  console.log('\n=== Message to be sent ===');
  console.log(message);
  console.log('\n');

  // Send to Google Chat
  const sent = await sendToGoogleChat(message);

  if (sent) {
    console.log('✓ Successfully sent price update to Google Chat');
    return true;
  } else {
    console.error('✗ Failed to send message to Google Chat');
    return false;
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fetchAndSend().catch(console.error);
}

export { sendToGoogleChat, fetchAndSend };
