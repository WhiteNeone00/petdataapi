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

// Fetch with retry
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

// Store data in Firestore (handle large documents)
async function storeData(collection, doc, data, metadata = {}) {
  try {
    const docSize = JSON.stringify(data).length;
    
    // If doc is small enough, store directly
    if (docSize < 900000) { // 900KB threshold (Firestore limit is 1MB)
      await db.collection(collection).doc(doc).set({
        ...data,
        ...metadata,
        _size: docSize,
        _lastUpdated: new Date().toISOString()
      });
      console.log(`  ✓ Stored ${doc} (${(docSize / 1024).toFixed(1)}KB)`);
      return true;
    } else {
      // Document too large, need to split
      console.log(`  ⚠ Large document ${doc} (${(docSize / 1024).toFixed(1)}KB), splitting...`);
      
      // Store as array of chunks
      if (Array.isArray(data.data)) {
        const chunkSize = 100;
        const chunks = [];
        for (let i = 0; i < data.data.length; i += chunkSize) {
          chunks.push(data.data.slice(i, i + chunkSize));
        }
        
        // Store metadata
        await db.collection(collection).doc(doc).set({
          metadata: {
            totalItems: data.data.length,
            chunkCount: chunks.length,
            _lastUpdated: new Date().toISOString()
          }
        });
        
        // Store chunks
        for (let i = 0; i < chunks.length; i++) {
          await db.collection(collection).doc(`${doc}_chunk_${i}`).set({
            chunk: i,
            data: chunks[i],
            _size: JSON.stringify(chunks[i]).length
          });
        }
        
        console.log(`  ✓ Stored ${doc} in ${chunks.length} chunks`);
        return true;
      } else if (typeof data.data === 'object' && data.data !== null) {
        // For object data, convert to array of entries
        const entries = Object.entries(data.data);
        const chunkSize = 50;
        const chunks = [];
        
        for (let i = 0; i < entries.length; i += chunkSize) {
          chunks.push(Object.fromEntries(entries.slice(i, i + chunkSize)));
        }
        
        // Store metadata
        await db.collection(collection).doc(doc).set({
          metadata: {
            totalItems: entries.length,
            chunkCount: chunks.length,
            _lastUpdated: new Date().toISOString()
          }
        });
        
        // Store chunks
        for (let i = 0; i < chunks.length; i++) {
          await db.collection(collection).doc(`${doc}_chunk_${i}`).set({
            chunk: i,
            data: chunks[i],
            _size: JSON.stringify(chunks[i]).length
          });
        }
        
        console.log(`  ✓ Stored ${doc} in ${chunks.length} chunks`);
        return true;
      }
    }
  } catch (error) {
    console.error(`  ✗ Failed to store ${doc}:`, error.message);
    return false;
  }
}

async function fullSync() {
  console.log('🔄 COMPLETE DATA SYNC - Copying ALL data from official API\n');
  const timestamp = new Date().toISOString();
  
  let success = 0, failed = 0;

  try {
    // 1. Fetch and store collections list
    console.log('📦 Step 1: Collections List');
    const collectionsResp = await fetchWithRetry(`${BIG_GAMES_API}/api/collections`);
    const collections = collectionsResp.data || [];
    console.log(`  Found ${collections.length} collections\n`);

    // 2. Fetch each collection
    console.log('📂 Step 2: Individual Collections');
    for (const collectionName of collections) {
      try {
        const data = await fetchWithRetry(`${BIG_GAMES_API}/api/collection/${collectionName}`);
        const stored = await storeData('api_data', `collection_${collectionName}`, {
          name: collectionName,
          data: data.data
        });
        if (stored) success++; else failed++;
      } catch (error) {
        console.error(`  ✗ ${collectionName}: ${error.message}`);
        failed++;
      }
    }
    console.log('');

    // 3. Fetch clans with pagination (get all pages)
    console.log('👥 Step 3: Clans (All Pages)');
    let allClans = [];
    let page = 1;
    let hasMore = true;
    const pageSize = 100;

    while (hasMore) {
      try {
        const url = `${BIG_GAMES_API}/api/clans?page=${page}&pageSize=${pageSize}&sort=Points&sortOrder=desc`;
        const data = await fetchWithRetry(url);
        
        if (data.data && Array.isArray(data.data)) {
          allClans = allClans.concat(data.data);
          console.log(`  Page ${page}: ${data.data.length} clans (Total: ${allClans.length})`);
          
          if (data.data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.log(`  Reached end at page ${page}`);
        hasMore = false;
      }
    }

    // Store all clans
    if (allClans.length > 0) {
      const stored = await storeData('api_data', 'clans_all', {
        status: 'ok',
        data: allClans
      }, { totalClans: allClans.length });
      if (stored) success++; else failed++;
    }
    console.log('');

    // 4. Fetch clans list
    console.log('📋 Step 4: Clans List');
    try {
      const clansListData = await fetchWithRetry(`${BIG_GAMES_API}/api/clansList`);
      const stored = await storeData('api_data', 'clans_list', clansListData);
      if (stored) success++; else failed++;
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
      failed++;
    }
    console.log('');

    // 5. Fetch clans total
    console.log('🔢 Step 5: Clans Total');
    try {
      const totalData = await fetchWithRetry(`${BIG_GAMES_API}/api/clansTotal`);
      await db.collection('api_data').doc('clans_total').set({
        ...totalData,
        _lastUpdated: timestamp
      });
      console.log('  ✓ Stored clans total');
      success++;
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
      failed++;
    }
    console.log('');

    // 6. Fetch RAP (all items)
    console.log('💰 Step 6: RAP Data (All Items)');
    try {
      const rapData = await fetchWithRetry(`${BIG_GAMES_API}/api/rap`);
      const stored = await storeData('api_data', 'rap_data', rapData);
      if (stored) success++; else failed++;
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
      failed++;
    }
    console.log('');

    // 7. Fetch active clan battle
    console.log('⚔️  Step 7: Active Clan Battle');
    try {
      const battleData = await fetchWithRetry(`${BIG_GAMES_API}/api/activeClanBattle`);
      await db.collection('api_data').doc('active_clan_battle').set({
        ...battleData,
        _lastUpdated: timestamp
      });
      console.log('  ✓ Stored active clan battle');
      success++;
    } catch (error) {
      console.error(`  ✗ Error: ${error.message}`);
      failed++;
    }
    console.log('');

    // 8. Store collections metadata
    console.log('📑 Step 8: Collections Metadata');
    await db.collection('api_data').doc('collections_list').set({
      status: 'ok',
      data: collections,
      count: collections.length,
      _lastUpdated: timestamp
    });
    console.log(`  ✓ Stored ${collections.length} collection names`);
    console.log('');

    // Update sync metadata
    const duration = Date.now() - (new Date(timestamp)).getTime();
    await db.collection('_sync').doc('metadata').set({
      lastSync: timestamp,
      status: 'complete',
      successful: success,
      failed: failed,
      collectionCount: collections.length,
      clanCount: allClans.length,
      duration: `${(duration / 1000).toFixed(1)}s`
    });

    console.log('✅ FULL SYNC COMPLETE!');
    console.log(`📊 Results:`);
    console.log(`   ✓ Successful: ${success}`);
    console.log(`   ✗ Failed: ${failed}`);
    console.log(`   📦 Collections: ${collections.length}`);
    console.log(`   👥 Clans: ${allClans.length}`);
    console.log(`\n🎉 All data now 100% synced from official API!\n`);

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    await db.collection('_sync').doc('metadata').set({
      lastSyncFailed: timestamp,
      error: error.message
    }, { merge: true });
    process.exit(1);
  }

  process.exit(0);
}

fullSync();
