const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, 'functions/serviceAccountKey.json'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'petssim'
});

const db = admin.firestore();

(async () => {
  const doc = await db.doc('api_data/exists_data').get();
  
  if (!doc.exists) {
    console.log('NOT FOUND');
    process.exit(0);
  }
  
  const data = doc.data();
  console.log({
    keys: Object.keys(data),
    hasMetadata: !!data.metadata,
    chunkCount: data.metadata?.chunkCount,
    hasData: !!data.data,
    dataType: typeof data.data,
    dataLength: Array.isArray(data.data) ? data.data.length : 'N/A',
    statusField: data.status
  });
  
  process.exit(0);
})().catch(e => {
  console.error(e.message);
  process.exit(1);
});
