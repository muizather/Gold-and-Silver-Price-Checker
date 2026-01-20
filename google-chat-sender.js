import 'dotenv/config';
import axios from 'axios';

// Google Chat Webhook URL - Loaded from .env file
const GOOGLE_CHAT_WEBHOOK_URL = process.env.GOOGLE_CHAT_WEBHOOK_URL || '';
// GitHub Pages URL - Replace with actual URL or use env var
const GITHUB_PAGES_URL = process.env.GITHUB_PAGES_URL || 'https://muizather.github.io/Gold-and-Silver-Price-Checker/';

/**
 * Send message to Google Chat via webhook
 */
async function sendToGoogleChat(message) {
  if (!GOOGLE_CHAT_WEBHOOK_URL) {
    console.error('Google Chat webhook URL not configured!');
    return false;
  }

  try {
    const payload = { text: message };

    await axios.post(GOOGLE_CHAT_WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
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
 * Send the updated graph link to Google Chat
 */
async function sendUpdateLink() {
  console.log('=== Sending Update Link to Google Chat ===\n');

  const message = `🏅 *Gold & Silver Prices Updated*

📊 View the latest chart and stats here:
${GITHUB_PAGES_URL}

(Please pin this link in the group for easy access)`;

  return await sendToGoogleChat(message);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  sendUpdateLink().catch(console.error);
}

export { sendToGoogleChat, sendUpdateLink };
