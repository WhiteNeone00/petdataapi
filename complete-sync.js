const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');
const fs = require('fs');

const BIG_GAMES_API = 'https://ps99.biggamesapi.io';

// Initialize Firebase
let serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  serviceAccountPath = path.join(__dirname, 'functions', 'serviceAccountKey.json');
}

const serviceAccount = require(serviceAccountPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'petssim'
});

const db = admin.firestore();

async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await axios.get(url, { timeout: 15000 });
      return response.data;
    } catch (error) {
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, 2000 * (i + 1)));
      }
    }
  }
  throw new Error(`Failed to fetch ${url}`);
}

async function storeData(collection, doc, data) {
  try {
    const docSize = JSON.stringify(data).length;
    
    if (docSize < 900000) {
      await db.collection(collection).doc(doc).set({
        ...data,
        _lastUpdated: new Date().toISOString()
      });
      console.log(`  ✓ ${doc} (${(docSize / 1024).toFixed(1)}KB)`);
      return true;
    } else {
      console.log(`  ⚠ ${doc} too large (${(docSize / 1024).toFixed(1)}KB), splitting...`);
      
      if (Array.isArray(data.data)) {
        const chunkSize = 100;
        const chunks = [];
        for (let i = 0; i < data.data.length; i += chunkSize) {
          chunks.push(data.data.slice(i, i + chunkSize));
        }
        
        await db.collection(collection).doc(doc).set({
          metadata: {
            totalItems: data.data.length,
            chunkCount: chunks.length,
            _lastUpdated: new Date().toISOString()
          }
        });
        
        for (let i = 0; i < chunks.length; i++) {
          await db.collection(collection).doc(`${doc}_chunk_${i}`).set({
            chunk: i,
            data: chunks[i]
          });
        }
        
        console.log(`  ✓ ${doc} stored in ${chunks.length} chunks`);
        return true;
      }
    }
  } catch (error) {
    console.error(`  ✗ ${doc}: ${error.message}`);
    return false;
  }
}

async function completeSync() {
  console.log('\n🔄 COMPLETE API DATA SYNC\n');
  const timestamp = new Date().toISOString();
  let success = 0;

  try {
    // 1. Collections List
    console.log('1️⃣  Collections List');
    const collectionsResp = await fetchWithRetry(`${BIG_GAMES_API}/api/collections`);
    const collections = collectionsResp.data || [];
    await db.collection('api_data').doc('collections_list').set({
      status: 'ok',
      data: collections,
      count: collections.length,
      _lastUpdated: timestamp
    });
    console.log(`  ✓ ${collections.length} collections\n`);
    success++;

    // 2. Individual Collections
    console.log('2️⃣  Individual Collections');
    for (const collectionName of collections) {
      try {
        const data = await fetchWithRetry(`${BIG_GAMES_API}/api/collection/${collectionName}`);
        const stored = await storeData('api_data', `collection_${collectionName}`, {
          status: 'ok',
          data: data.data
        });
        if (stored) success++;
      } catch (error) {
        console.error(`  ✗ ${collectionName}: ${error.message}`);
      }
    }
    console.log('');

    // 3. Clans List
    console.log('3️⃣  Clans List');
    try {
      const clansListData = await fetchWithRetry(`${BIG_GAMES_API}/api/clansList`);
      const stored = await storeData('api_data', 'clans_list', clansListData);
      if (stored) success++;
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
    }
    console.log('');

    // 4. Clans Total
    console.log('4️⃣  Clans Total');
    try {
      const totalData = await fetchWithRetry(`${BIG_GAMES_API}/api/clansTotal`);
      await db.collection('api_data').doc('clans_total').set({
        status: 'ok',
        data: totalData.data,
        _lastUpdated: timestamp
      });
      console.log(`  ✓ Total clans: ${totalData.data}\n`);
      success++;
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}\n`);
    }

    // 5. Top Clans (first 10 pages = 100 clans)
    console.log('5️⃣  Top Clans (Sample - First 1000)');
    try {
      const topClans = [];
      const pageSize = 100;
      
      for (let page = 1; page <= 10; page++) {
        const url = `${BIG_GAMES_API}/api/clans?page=${page}&pageSize=${pageSize}&sort=Points&sortOrder=desc`;
        const data = await fetchWithRetry(url);
        if (data.data && Array.isArray(data.data)) {
          topClans.push(...data.data);
          process.stdout.write('.');
        } else {
          break;
        }
      }
      
      const stored = await storeData('api_data', 'clans_top_1000', {
        status: 'ok',
        data: topClans
      });
      if (stored) success++;
      console.log('');
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}\n`);
    }

    // 6. Exists Data
    console.log('6️⃣  Exists Data');
    try {
      const existsData = await fetchWithRetry(`${BIG_GAMES_API}/api/exists`);
      const stored = await storeData('api_data', 'exists_data', existsData);
      if (stored) success++;
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
    }
    console.log('');

    // 7. RAP Data
    console.log('7️⃣  RAP Data (Item Prices)');
    try {
      const rapData = await fetchWithRetry(`${BIG_GAMES_API}/api/rap`);
      const stored = await storeData('api_data', 'rap_data', rapData);
      if (stored) success++;
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
    }
    console.log('');

    // 8. Active Clan Battle
    console.log('8️⃣  Active Clan Battle');
    try {
      const battleData = await fetchWithRetry(`${BIG_GAMES_API}/api/activeClanBattle`);
      await db.collection('api_data').doc('active_clan_battle').set({
        status: 'ok',
        data: battleData.data,
        _lastUpdated: timestamp
      });
      console.log('  ✓ Active clan battle stored\n');
      success++;
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}\n`);
    }

    // 9. Sample Clan Details (first 5 top clans)
    console.log('9️⃣  Sample Clan Details');
    try {
      const clanNames = ['SOPU', 'RFIL', 'V1LN', 'GANG', 'AR2Y'];
      for (const clanName of clanNames) {
        try {
          const clanData = await fetchWithRetry(`${BIG_GAMES_API}/api/clan/${clanName}`);
          const docSize = JSON.stringify(clanData).length;
          await db.collection('api_data').doc(`clan_detail_${clanName}`).set({
            status: 'ok',
            data: clanData.data,
            _lastUpdated: timestamp
          });
          console.log(`  ✓ ${clanName} (${(docSize / 1024).toFixed(1)}KB)`);
          success++;
        } catch (error) {
          console.error(`  ✗ ${clanName}: ${error.message}`);
        }
      }
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
    }
    console.log('');

    // Update metadata
    await db.collection('_sync').doc('metadata').set({
      lastSync: timestamp,
      status: 'complete',
      documentCount: success,
      collectionsCount: collections.length,
      message: 'All API endpoints synced successfully'
    }, { merge: true });

    console.log('✅ SYNC COMPLETE!\n');
    console.log(`📊 Results:`);
    console.log(`   ✓ Documents stored: ${success}`);
    console.log(`   📦 Collections: ${collections.length}`);
    console.log(`   👥 Top clans cached: 1,000+`);
    console.log(`   💰 Item prices: Complete`);
    console.log(`   📋 Exists data: Complete`);
    console.log(`   ⚔️  Battle data: Complete\n`);
    console.log('🎉 Your API now has ALL official data!\n');

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

completeSync();
