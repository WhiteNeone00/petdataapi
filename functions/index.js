const admin = require('firebase-admin');
const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const axios = require('axios');

// Initialize Firebase Admin
admin.initializeApp();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Firestore reference
const db = admin.firestore();

// In-memory cache (optional, for repeated requests in same function instance)
const cache = {};
const CACHE_TTL = {
  collections: 5 * 60 * 1000,   // 5 minutes (local cache)
  collection: 5 * 60 * 1000,    // 5 minutes
  clans: 5 * 60 * 1000,         // 5 minutes
  exists: 60 * 60 * 1000,       // 1 hour
  rap: 60 * 60 * 1000           // 1 hour
};

// Helper function to check local cache
function getCached(key) {
  const cached = cache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL[key]) {
    console.log(`✓ Memory Cache HIT: ${key}`);
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  cache[key] = { data, timestamp: Date.now() };
}

// Helper function to get data from Firestore
async function getFromFirestore(docPath) {
  try {
    const doc = await db.doc(docPath).get();
    if (doc.exists) {
      console.log(`✓ Firestore HIT: ${docPath}`);
      return doc.data();
    }
    return null;
  } catch (error) {
    console.error(`Error reading from Firestore (${docPath}):`, error.message);
    return null;
  }
}

// GET /api/collections - List all collections
app.get('/api/collections', async (req, res) => {
  try {
    const cached = getCached('collections');
    if (cached) return res.json(cached);

    const docData = await getFromFirestore('api_data/collections_list');
    
    if (!docData) {
      return res.status(404).json({
        status: 'error',
        error: 'Collections data not yet synced. Run sync-api-data.js first.',
        ignore: true
      });
    }

    const response = {
      status: 'ok',
      data: docData.collections || []
    };

    setCache('collections', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching collections:', error.message);
    res.status(400).json({
      status: 'error',
      error: 'Failed to fetch collections',
      ignore: true
    });
  }
});

// GET /api/collection/:collectionName - Get specific collection
app.get('/api/collection/:collectionName', async (req, res) => {
  try {
    const { collectionName } = req.params;
    const cacheKey = `collection_${collectionName}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const docData = await getFromFirestore(`api_data/collection_${collectionName}`);
    
    if (!docData) {
      return res.status(404).json({
        status: 'error',
        error: `Collection not found: ${collectionName}`,
        ignore: true
      });
    }

    const response = {
      status: 'ok',
      data: docData.data || []
    };

    setCache(cacheKey, response);
    res.json(response);
  } catch (error) {
    console.error(`Error fetching collection ${req.params.collectionName}:`, error.message);
    res.status(400).json({
      status: 'error',
      error: `Failed to fetch collection: ${req.params.collectionName}`,
      ignore: true
    });
  }
});

// GET /api/clansList - List all clan names
app.get('/api/clansList', async (req, res) => {
  try {
    const cached = getCached('clansList');
    if (cached) return res.json(cached);

    const docData = await getFromFirestore('api_data/clans_list');
    
    if (!docData) {
      return res.status(404).json({
        status: 'error',
        error: 'Clans list data not yet synced',
        ignore: true
      });
    }

    const response = {
      status: 'ok',
      data: docData.clans || []
    };

    setCache('clansList', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching clans list:', error.message);
    res.status(400).json({
      status: 'error',
      error: 'Failed to fetch clans list',
      ignore: true
    });
  }
});

// GET /api/clansTotal - Get total clan count
app.get('/api/clansTotal', async (req, res) => {
  try {
    const cached = getCached('clansTotal');
    if (cached) return res.json(cached);

    const docData = await getFromFirestore('api_data/clans_total');
    
    const response = docData || {
      status: 'ok',
      data: { status: 'ok' }
    };

    setCache('clansTotal', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching clans total:', error.message);
    res.status(400).json({
      status: 'error',
      error: 'Failed to fetch clans total',
      ignore: true
    });
  }
});

// GET /api/clans - List clans
app.get('/api/clans', async (req, res) => {
  try {
    const { page = 1, pageSize = 10 } = req.query;
    const cacheKey = `clans_page`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const docData = await getFromFirestore('api_data/clans_full');
    
    if (!docData) {
      return res.status(404).json({
        status: 'error',
        error: 'Clans data not yet synced',
        ignore: true
      });
    }

    const response = {
      status: 'ok',
      data: docData.data || {}
    };

    setCache(cacheKey, response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching clans:', error.message);
    res.status(400).json({
      status: 'error',
      error: 'Failed to fetch clans',
      ignore: true
    });
  }
});

// GET /api/clan/:clanName - Get specific clan details
app.get('/api/clan/:clanName', async (req, res) => {
  try {
    const { clanName } = req.params;
    const cacheKey = `clan_${clanName}`;
    const cached = getCached(cacheKey);
    if (cached) return res.json(cached);

    const clansData = await getFromFirestore('api_data/clans_full');
    
    if (!clansData || !clansData.data || !clansData.data[clanName]) {
      return res.status(404).json({
        status: 'error',
        error: `Clan not found: ${clanName}`,
        ignore: true
      });
    }

    const response = {
      status: 'ok',
      data: clansData.data[clanName]
    };

    setCache(cacheKey, response);
    res.json(response);
  } catch (error) {
    console.error(`Error fetching clan ${req.params.clanName}:`, error.message);
    res.status(400).json({
      status: 'error',
      error: `Failed to fetch clan: ${req.params.clanName}`,
      ignore: true
    });
  }
});

// GET /api/exists - Get exists data
app.get('/api/exists', async (req, res) => {
  try {
    const cached = getCached('exists');
    if (cached) return res.json(cached);

    const docData = await getFromFirestore('api_data/exists_data');
    
    const response = docData || {
      status: 'ok',
      data: {}
    };

    setCache('exists', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching exists:', error.message);
    res.status(400).json({
      status: 'error',
      error: 'Failed to fetch exists data',
      ignore: true
    });
  }
});

// GET /api/rap - Get RAP (Recent Average Price) data
app.get('/api/rap', async (req, res) => {
  try {
    const cached = getCached('rap');
    if (cached) return res.json(cached);

    const docData = await getFromFirestore('api_data/rap_data');
    
    if (!docData) {
      return res.status(404).json({
        status: 'error',
        error: 'RAP data not yet synced',
        ignore: true
      });
    }

    const response = {
      status: 'ok',
      data: docData.data || {}
    };

    setCache('rap', response);
    res.json(response);
  } catch (error) {
    console.error('Error fetching RAP:', error.message);
    res.status(400).json({
      status: 'error',
      error: 'Failed to fetch RAP data',
      ignore: true
    });
  }
});

// GET /api/activeClanBattle - Get active clan battle
app.get('/api/activeClanBattle', async (req, res) => {
  try {
    const docData = await getFromFirestore('api_data/active_clan_battle');
    
    const response = docData || {
      status: 'ok',
      data: {}
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching active clan battle:', error.message);
    res.status(400).json({
      status: 'error',
      error: 'Failed to fetch active clan battle',
      ignore: true
    });
  }
});

// GET /image/:imageId - Proxy Roblox images
app.get('/image/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const response = await axios.get(`https://www.roblox.com/Thumbs/Avatar.ashx?x=150&y=150&Format=Png&userId=${imageId}`, {
      responseType: 'arraybuffer',
      timeout: 10000
    });
    
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(response.data);
  } catch (error) {
    console.error('Error fetching image:', error.message);
    res.status(404).json({
      status: 'error',
      error: 'Image not found',
      ignore: true
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// Export the Express app as a Cloud Function
exports.api = functions.https.onRequest(app);
// Import and re-export auto-sync functions
const autoSync = require('./auto-sync');
exports.autoSyncAPIData = autoSync.autoSyncAPIData;
exports.manualSyncAPIData = autoSync.manualSyncAPIData;