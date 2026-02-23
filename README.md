# 🐾 Pet Simulator 99 Public API

A complete Pet Simulator 99 API replica with real-time data proxying from the official API, deployed on Firebase.

## Features

✅ **All Official Endpoints Implemented**
- Collections & Collection Details
- Clans List, Clans Total, Clans Pagination, Clan Details
- Exists Data (Pet & Item occurrences)
- RAP (Recent Average Price) Data
- Active Clan Battle Information
- Image Proxy for Roblox Assets

✅ **Smart Caching**
- Collections cached for 1 hour
- Clans data cached for 5 minutes  
- Exists/RAP data cached for 4 hours
- Reduces API calls and improves performance

✅ **Beautiful Documentation Website**
- Interactive endpoint documentation
- Code examples in multiple languages
- API information and best practices
- Responsive design

✅ **Firebase Deployment**
- Cloud Functions for API
- Firebase Hosting for documentation
- Automatic scaling
- CDN included

## Quick Start

### Prerequisites
- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Blaze plan (for outbound requests)

### Local Development

```bash
# Install dependencies
cd functions
npm install
cd ..

# Run emulator
firebase emulators:start

# Documentation will be available locally
```

### Deploy to Firebase

```bash
# Login to Firebase
firebase login

# Select your project
firebase use your-project-id

# Deploy
firebase deploy

# Check console for deployment URLs
firebase open console
```

## API Endpoints

### Collections
```
GET /api/collections
GET /api/collection/{name}
```

### Clans
```
GET /api/clansList
GET /api/clansTotal
GET /api/clans?page=1&pageSize=10&sort=Points&sortOrder=desc
GET /api/clan/{clanName}
```

### Game Data
```
GET /api/exists
GET /api/rap
GET /api/activeClanBattle
```

### Assets
```
GET /image/{imageId}
```

## Response Format

All responses follow this format:

**Success:**
```json
{
  "status": "ok",
  "data": {...}
}
```

**Error:**
```json
{
  "status": "error",
  "error": "Error message",
  "ignore": true
}
```

## Caching Strategy

The API implements intelligent caching to reduce external API calls:

- **Collections**: 1 hour TTL
- **Clans**: 5 minutes TTL
- **Game Data (Exists/RAP)**: 4 hours TTL
- **Active Battles**: 1 minute TTL

Cache is stored in-memory and persists for the lifetime of the Cloud Function instance.

## Rate Limiting

- **Limit**: 100 requests per minute per IP
- **Headers**: Rate limit headers included in responses
- **Backoff**: Implement exponential backoff for 429 responses

## Firebase Setup

1. Create a new Firebase project
2. Upgrade to **Blaze plan** (required for making external HTTP requests)
3. Enable Cloud Functions
4. Deploy using `firebase deploy`

## Customization

### Change Data Source
Edit `functions/index.js` to point to a different API:
```javascript
const BIG_GAMES_API = 'your-api-url-here';
```

### Adjust Cache TTL
Modify the `CACHE_TTL` object in `functions/index.js`:
```javascript
const CACHE_TTL = {
  collections: 60 * 60 * 1000, // Adjust in milliseconds
  // ... other values
};
```

### Customize Documentation
Edit `public/index.html` and `public/styles.css` to match your branding.

## Monitoring

View Cloud Function logs:
```bash
firebase functions:log
```

Check Firebase Console:
```bash
firebase open console
```

## Project Structure

```
petdataapi/
├── firebase.json           # Firebase configuration
├── .firebaserc            # Firebase project config
│
├── functions/
│   ├── package.json       # Dependencies
│   └── index.js          # Cloud Functions code
│
└── public/
    ├── index.html        # Documentation site
    ├── styles.css        # Styling
    └── assets/          # Images, logos, etc.
```

## Code Examples

### JavaScript
```javascript
const response = await fetch('https://your-api.firebaseapp.com/api/collections');
const data = await response.json();
console.log(data);
```

### Python
```python
import requests
response = requests.get('https://your-api.firebaseapp.com/api/collections')
data = response.json()
print(data)
```

### Node.js
```javascript
const axios = require('axios');
const data = await axios.get('https://your-api.firebaseapp.com/api/collections');
console.log(data.data);
```

## Performance Tips

1. **Cache locally**: Store responses in your database
2. **Batch requests**: Load multiple collections in parallel
3. **Lazy load**: Only fetch data when needed
4. **CDN**: Use Firebase Hosting's CDN for documentation

## Advanced Configuration

### Custom Headers
Modify `index.js` to add custom headers:
```javascript
axios.get(url, {
  headers: {
    'Custom-Header': 'value'
  },
  timeout: 10000
});
```

### Error Handling
Responses include standard error handling with proper HTTP status codes.

## Troubleshooting

### "Cannot make external requests"
- Your Firebase project must be on **Blaze plan**
- Check that Cloud Functions have internet access enabled

### High latency
- Check Cloud Function memory allocation (2GB recommended)
- Verify cache TTL settings
- Monitor Firebase performance in console

###  Returns 429 (Rate Limited)
- Implement backoff strategy
- Cache responses more aggressively
- Contact data provider for higher limits

## License

This API wrapper maintains compatibility with the original Pet Simulator 99 API terms.

## Support

- 📖 [BIG Games API Docs](https://github.com/BIG-Games-LLC/ps99-public-api-docs)
- 🐛 Report issues
- 💡 Suggest improvements

---

**Built with ❤️ using Firebase Cloud Functions & Hosting**

Happy Coding! 🚀
