const admin = require('firebase-admin');
const functions = require('firebase-functions');
const axios = require('axios');

// Initialize Firebase
admin.initializeApp();
const db = admin.firestore();

const BIG_GAMES_API = 'https://ps99.biggamesapi.io';

// Fetch with retry logic
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      return response.data;
    } catch (error) {
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      }
    }
  }
  throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}

// Scheduled Auto-Sync - Runs daily
exports.autoSyncAPIData = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  console.log('🔄 Scheduled sync starting...');
  const timestamp = new Date().toISOString();

  try {
    // Update RAP data (most frequently changing)
    console.log('💰 Syncing RAP data...');
    const rapData = await fetchWithRetry(`${BIG_GAMES_API}/api/rap`);
    if (rapData && rapData.data) {
      await db.collection('api_data').doc('rap_data').set({
        data: rapData.data,
        lastUpdated: timestamp,
        itemCount: Object.keys(rapData.data).length
      }, { merge: true });
    }

    // Update active clan battle
    console.log('⚔️  Syncing active clan battle...');
    const battleData = await fetchWithRetry(`${BIG_GAMES_API}/api/activeClanBattle`);
    if (battleData) {
      await db.collection('api_data').doc('active_clan_battle').set({
        data: battleData,
        lastUpdated: timestamp
      }, { merge: true });
    }

    // Update clans total
    console.log('🔢 Syncing clans total...');
    const clansTotalData = await fetchWithRetry(`${BIG_GAMES_API}/api/clansTotal`);
    if (clansTotalData) {
      await db.collection('api_data').doc('clans_total').set({
        data: clansTotalData,
        lastUpdated: timestamp
      }, { merge: true });
    }

    // Update sync metadata
    await db.collection('_sync').doc('metadata').set({
      lastSync: timestamp,
      status: 'success',
      type: 'scheduled'
    }, { merge: true });

    console.log('✅ Scheduled sync complete!');
    return { success: true, timestamp };
  } catch (error) {
    console.error('❌ Scheduled sync failed:', error.message);
    await db.collection('_sync').doc('metadata').set({
      lastSyncFailed: timestamp,
      error: error.message
    }, { merge: true });
    return { success: false, error: error.message };
  }
});

// Manual Trigger - Call via HTTP to manually sync
exports.manualSyncAPIData = functions.https.onRequest(async (req, res) => {
  // Add optional auth check here
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('🔄 Manual sync triggered...');
  const timestamp = new Date().toISOString();

  try {
    // Get collections list first
    const collectionsData = await fetchWithRetry(`${BIG_GAMES_API}/api/collections`);
    if (!collectionsData.data) throw new Error('No collections found');

    let storedCount = 0;
    let failedCount = 0;

    // Store each collection
    for (const collection of collectionsData.data) {
      try {
        const data = await fetchWithRetry(`${BIG_GAMES_API}/api/collection/${collection}`);
        if (data && data.data) {
          await db.collection('api_data').doc(`collection_${collection}`).set({
            name: collection,
            data: data.data,
            lastUpdated: timestamp,
            itemCount: Array.isArray(data.data) ? data.data.length : 0
          });
          storedCount++;
        }
      } catch (error) {
        console.error(`Failed to store ${collection}:`, error.message);
        failedCount++;
      }
    }

    // Update RAP data
    const rapData = await fetchWithRetry(`${BIG_GAMES_API}/api/rap`);
    if (rapData && rapData.data) {
      await db.collection('api_data').doc('rap_data').set({
        data: rapData.data,
        lastUpdated: timestamp,
        itemCount: Object.keys(rapData.data).length
      }, { merge: true });
    }

    // Update other data
    const battleData = await fetchWithRetry(`${BIG_GAMES_API}/api/activeClanBattle`);
    if (battleData) {
      await db.collection('api_data').doc('active_clan_battle').set({
        data: battleData,
        lastUpdated: timestamp
      }, { merge: true });
    }

    // Update sync metadata
    await db.collection('_sync').doc('metadata').set({
      lastSync: timestamp,
      status: 'success',
      type: 'manual',
      stored: storedCount,
      failed: failedCount
    }, { merge: true });

    res.json({
      success: true,
      stored: storedCount,
      failed: failedCount,
      timestamp
    });
  } catch (error) {
    console.error('❌ Manual sync failed:', error.message);
    await db.collection('_sync').doc('metadata').set({
      lastSyncFailed: timestamp,
      error: error.message
    }, { merge: true });
    res.status(500).json({ success: false, error: error.message });
  }
});
