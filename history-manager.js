import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HISTORY_FILE = path.join(__dirname, 'prices.json');

/**
 * Update history file with new price data
 * @param {Object} prices - Calculated price object from fetch-prices.js
 */
export async function updateHistory(prices) {
  try {
    let history = [];

    // Read existing history
    if (fs.existsSync(HISTORY_FILE)) {
      const fileContent = fs.readFileSync(HISTORY_FILE, 'utf8');
      try {
        history = JSON.parse(fileContent);
        if (!Array.isArray(history)) history = [];
      } catch (e) {
        console.error('Error parsing prices.json, starting fresh');
        history = [];
      }
    }

    // Create new entry
    const newEntry = {
      date: new Date().toISOString(),
      gold: {
        perGram: prices.gold.perGram,
        perTola: prices.gold.perTola
      },
      silver: {
        perKg: prices.silver.perKg,
        perTola: prices.silver.perTola
      },
      ratio: prices.ratio
    };

    // Append and save
    history.push(newEntry);

    // Keep reasonable history size? (Optional, maybe keep last 365 days)
    // For now, keep all.

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
    console.log(`✓ Updated prices.json with new entry. Total entries: ${history.length}`);
    return true;
  } catch (error) {
    console.error('Error updating history:', error);
    return false;
  }
}
