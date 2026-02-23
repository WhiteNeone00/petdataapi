#!/usr/bin/env node

const admin = require('firebase-admin');
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialize Firebase
let serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (!fs.existsSync(serviceAccountPath)) {
  serviceAccountPath = path.join(__dirname, 'functions', 'serviceAccountKey.json');
}
if (!fs.existsSync(serviceAccountPath)) {
  console.error('❌ ERROR: serviceAccountKey.json not found!');
  console.error('Download it from: https://console.firebase.google.com/project/petssim/settings/serviceaccounts');
  process.exit(1);
}

const serviceAccount = require(serviceAccountPath);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'petssim',
  databaseURL: 'https://petssim-default-rtdb.firebaseio.com'
});

const db = admin.firestore();
const app = express();

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());

// Serve static documentation
app.use(express.static('public'));

// In-memory cache
const cache = {};
const CACHE_TTL = {
  collections: 5 * 60 * 1000,
  collection: 5 * 60 * 1000,
  clans: 5 * 60 * 1000,
  exists: 60 * 60 * 1000,
  rap: 60 * 60 * 1000
};

function getCached(key) {
  const cached = cache[key];
  if (cached && Date.now() - cached.timestamp < (CACHE_TTL[key] || 300000)) {
    console.log(`✓ Cache HIT: ${key}`);
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  cache[key] = { data, timestamp: Date.now() };
}

// Helper to read from Firestore (handles chunked data)
async function getFromFirestore(docPath) {
  try {
    const doc = await db.doc(docPath).get();
    
    // If document has chunks, retrieve all chunks
    if (doc.exists && doc.data().metadata && doc.data().metadata.chunkCount) {
      const chunkCount = doc.data().metadata.chunkCount;
      let combinedData = [];
      
      for (let i = 0; i < chunkCount; i++) {
        const chunkDoc = await db.doc(`${docPath}_chunk_${i}`).get();
        if (chunkDoc.exists && Array.isArray(chunkDoc.data().data)) {
          combinedData = combinedData.concat(chunkDoc.data().data);
        } else if (chunkDoc.exists && typeof chunkDoc.data().data === 'object') {
          combinedData.push(chunkDoc.data().data);
        }
      }
      
      console.log(`✓ Firestore HIT (chunked): ${docPath}`);
      return { status: 'ok', data: combinedData, isChunked: true };
    }
    
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

// Routes
app.get('/api/collections', async (req, res) => {
  try {
    const cached = getCached('collections');
    if (cached) return res.json(cached);

    const docData = await getFromFirestore('api_data/collections_list');
    if (!docData || !docData.data) {
      return res.status(404).json({
        status: 'error',
        error: 'Collections data not synced yet',
        ignore: true
      });
    }

    const response = { status: 'ok', data: Array.isArray(docData.data) ? docData.data : [] };
    setCache('collections', response);
    res.json(response);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ status: 'error', error: error.message });
  }
});

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

    const response = { status: 'ok', data: docData.data || [] };
    setCache(cacheKey, response);
    res.json(response);
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

app.get('/api/clansList', async (req, res) => {
  try {
    const cached = getCached('clansList');
    if (cached) return res.json(cached);

    const docData = await getFromFirestore('api_data/clans_list');
    const response = { status: 'ok', data: docData?.clans || [] };
    setCache('clansList', response);
    res.json(response);
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

app.get('/api/clansTotal', async (req, res) => {
  try {
    const docData = await getFromFirestore('api_data/clans_total');
    let data = 0;
    
    if (docData?.data) {
      data = docData.data;
    } else if (typeof docData === 'number') {
      data = docData;
    }
    
    res.json({ status: 'ok', data });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

app.get('/api/clans', async (req, res) => {
  try {
    const docData = await getFromFirestore('api_data/clans_full');
    const response = { status: 'ok', data: docData?.data || {} };
    res.json(response);
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

app.get('/api/clan/:clanName', async (req, res) => {
  try {
    const { clanName } = req.params;
    const clansData = await getFromFirestore('api_data/clans_full');
    
    if (!clansData?.data?.[clanName]) {
      return res.status(404).json({
        status: 'error',
        error: `Clan not found: ${clanName}`,
        ignore: true
      });
    }

    res.json({ status: 'ok', data: clansData.data[clanName] });
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

app.get('/api/exists', async (req, res) => {
  try {
    const cached = getCached('exists');
    if (cached) return res.json(cached);

    const docData = await getFromFirestore('api_data/exists_data');
    let response;
    
    if (!docData) {
      response = { status: 'ok', data: [] };
    } else if (docData.data && Array.isArray(docData.data)) {
      response = { status: 'ok', data: docData.data };
    } else if (Array.isArray(docData)) {
      response = { status: 'ok', data: docData };
    } else {
      response = { status: 'ok', data: docData.data || [] };
    }
    
    setCache('exists', response);
    res.json(response);
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

app.get('/api/rap', async (req, res) => {
  try {
    const cached = getCached('rap');
    if (cached) return res.json(cached);

    const docData = await getFromFirestore('api_data/rap_data');
    let response;
    
    if (!docData) {
      response = { status: 'ok', data: [] };
    } else if (docData.data && Array.isArray(docData.data)) {
      response = { status: 'ok', data: docData.data };
    } else if (Array.isArray(docData)) {
      response = { status: 'ok', data: docData };
    } else {
      response = { status: 'ok', data: docData.data || [] };
    }
    
    setCache('rap', response);
    res.json(response);
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

app.get('/api/activeClanBattle', async (req, res) => {
  try {
    const docData = await getFromFirestore('api_data/active_clan_battle');
    let response = { status: 'ok', data: {} };
    
    if (docData?.data) {
      response = { status: 'ok', data: docData.data };
    } else if (docData && typeof docData === 'object') {
      response = { status: 'ok', data: docData };
    }
    
    res.json(response);
  } catch (error) {
    res.status(500).json({ status: 'error', error: error.message });
  }
});

app.get('/image/:imageId', async (req, res) => {
  try {
    const { imageId } = req.params;
    const url = `https://www.roblox.com/Thumbs/Avatar.ashx?x=150&y=150&Format=Png&userId=${imageId}`;
    const response = await require('axios').get(url, { responseType: 'arraybuffer', timeout: 10000 });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(response.data);
  } catch (error) {
    res.status(404).json({ status: 'error', error: 'Image not found' });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ status: 'error', error: 'Not found' });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('🚀 Pet Simulator 99 API Server');
  console.log(`📍 Listening on port ${PORT}`);
  console.log(`📚 Documentation: http://localhost:${PORT}/`);
  console.log(`🔌 API: http://localhost:${PORT}/api/collections`);
  console.log(`💪 Health check: http://localhost:${PORT}/health`);
  console.log('');
  console.log('Ready to serve data from Firestore! 🎉');
});
