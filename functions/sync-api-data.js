const admin = require('firebase-admin');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const BIG_GAMES_API = 'https://ps99.biggamesapi.io';

// Initialize Firebase with service account
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
const serviceAccount = require(serviceAccountPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'petssim',
  databaseURL: 'https://petssim-default-rtdb.firebaseio.com'
});

const db = admin.firestore();

// Fetch with retry logic
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, { timeout: 10000 });
      return response.data;
    } catch (error) {
      console.log(`Attempt ${i + 1}/${maxRetries} failed for ${url}: ${error.message}`);
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      }
    }
  }
  throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}

async function syncAllData() {
  console.log('🔄 Starting API data sync to Firestore...\n');
  const timestamp = new Date().toISOString();

  try {
    // Create sync metadata
    const syncMetadata = {
      lastSync: timestamp,
      status: 'in-progress',
      startTime: Date.now()
    };
    await db.collection('_sync').doc('metadata').set(syncMetadata, { merge: true });

    // 1. Fetch and store collections list
    console.log('📦 Fetching collections list...');
    const collectionsData = await fetchWithRetry(`${BIG_GAMES_API}/api/collections`);
    if (collectionsData.data && Array.isArray(collectionsData.data)) {
      const collections = collectionsData.data;
      console.log(`✓ Found ${collections.length} collections`);
      
      // Store collections list
      await db.collection('api_data').doc('collections_list').set({
        collections: collections,
        count: collections.length,
        lastUpdated: timestamp
      });

      // 2. Fetch individual collection data
      console.log(`\n📂 Fetching individual collection data...`);
      for (const collection of collections) {
        try {
          console.log(`  → Fetching ${collection}...`);
          const collectionData = await fetchWithRetry(`${BIG_GAMES_API}/api/collection/${collection}`);
          
          if (collectionData && collectionData.data) {
            await db.collection('api_data').doc(`collection_${collection}`).set({
              name: collection,
              data: collectionData.data,
              lastUpdated: timestamp,
              itemCount: Array.isArray(collectionData.data) ? collectionData.data.length : 0
            });
            console.log(`    ✓ Stored ${collection}`);
          }
        } catch (error) {
          console.error(`    ✗ Error fetching ${collection}: ${error.message}`);
        }
      }
    }

    // 3. Fetch and store clans data
    console.log(`\n👥 Fetching clans data...`);
    try {
      const clansData = await fetchWithRetry(`${BIG_GAMES_API}/api/clans`);
      if (clansData && clansData.data) {
        await db.collection('api_data').doc('clans_full').set({
          data: clansData.data,
          lastUpdated: timestamp,
          clanCount: Object.keys(clansData.data).length
        });
        console.log(`✓ Stored clans data (${Object.keys(clansData.data).length} clans)`);
      }
    } catch (error) {
      console.error(`✗ Error fetching clans: ${error.message}`);
    }

    // 4. Fetch clans list
    console.log(`\n📋 Fetching clans list...`);
    try {
      const clansListData = await fetchWithRetry(`${BIG_GAMES_API}/api/clansList`);
      if (clansListData && clansListData.data) {
        await db.collection('api_data').doc('clans_list').set({
          clans: clansListData.data,
          count: clansListData.data.length,
          lastUpdated: timestamp
        });
        console.log(`✓ Stored clans list (${clansListData.data.length} clans)`);
      }
    } catch (error) {
      console.error(`✗ Error fetching clans list: ${error.message}`);
    }

    // 5. Fetch clans total
    console.log(`\n🔢 Fetching clans total...`);
    try {
      const clansTotalData = await fetchWithRetry(`${BIG_GAMES_API}/api/clansTotal`);
      if (clansTotalData) {
        await db.collection('api_data').doc('clans_total').set({
          data: clansTotalData,
          lastUpdated: timestamp
        });
        console.log(`✓ Stored clans total`);
      }
    } catch (error) {
      console.error(`✗ Error fetching clans total: ${error.message}`);
    }

    // 6. Fetch and store RAP data
    console.log(`\n💰 Fetching RAP (Rarity Adjusted Price) data...`);
    try {
      const rapData = await fetchWithRetry(`${BIG_GAMES_API}/api/rap`);
      if (rapData && rapData.data) {
        await db.collection('api_data').doc('rap_data').set({
          data: rapData.data,
          lastUpdated: timestamp,
          itemCount: Object.keys(rapData.data).length
        });
        console.log(`✓ Stored RAP data (${Object.keys(rapData.data).length} items)`);
      }
    } catch (error) {
      console.error(`✗ Error fetching RAP data: ${error.message}`);
    }

    // 7. Fetch active clan battle
    console.log(`\n⚔️  Fetching active clan battle...`);
    try {
      const battleData = await fetchWithRetry(`${BIG_GAMES_API}/api/activeClanBattle`);
      if (battleData) {
        await db.collection('api_data').doc('active_clan_battle').set({
          data: battleData,
          lastUpdated: timestamp
        });
        console.log(`✓ Stored active clan battle`);
      }
    } catch (error) {
      console.error(`✗ Error fetching active clan battle: ${error.message}`);
    }

    // Update sync metadata - success
    const duration = Math.round((Date.now() - syncMetadata.startTime) / 1000);
    await db.collection('_sync').doc('metadata').set({
      lastSync: timestamp,
      status: 'success',
      duration: `${duration}s`,
      endTime: Date.now()
    }, { merge: true });

    console.log(`\n✅ Sync complete! Duration: ${duration}s`);
    console.log('🎉 All data is now stored in Firestore and will be served privately!\n');

  } catch (error) {
    console.error('\n❌ Sync failed:', error.message);
    await db.collection('_sync').doc('metadata').set({
      status: 'failed',
      error: error.message,
      lastAttempt: timestamp
    }, { merge: true });
    process.exit(1);
  }
}

// Run sync
syncAllData().then(() => {
  console.log('Process completed. Exiting...');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
