# 🔧 Self-Hosting Guide - Pet Simulator 99 API

## ✅ What You Have

- **All API data stored in Firestore** (private, secure)
- **Self-hosted Node.js API server** (serves all 10 endpoints)
- **Complete documentation website**
- **Automatic daily data sync** (keeps data fresh)

---

## 🚀 Quick Start (Localhost)

### 1. Prerequisites
```bash
node --version  # Must be 18.x or higher
npm --version   # Must be 8.x or higher
```

### 2. Navigate to project
```bash
cd /var/www/petdataapi
```

### 3. Install dependencies (one-time)
```bash
npm install
```

### 4. Start the server
```bash
npm start
# OR
node server.js
```

Expected output:
```
🚀 Pet Simulator 99 API Server
📍 Listening on port 3000
📚 Documentation: http://localhost:3000/
🔌 API: http://localhost:3000/api/collections
💪 Health check: http://localhost:3000/health

Ready to serve data from Firestore! 🎉
```

### 5. Test the API
```bash
# In another terminal:
curl http://localhost:3000/api/collections
curl http://localhost:3000/api/rap
curl http://localhost:3000/health
```

---

## 🌍 Deploy to Production Server

### Option A: Linux Server with PM2 (Recommended)

#### 1. Install PM2 globally
```bash
npm install -g pm2
```

#### 2. Start with PM2
```bash
cd /var/www/petdataapi
pm2 start server.js --name "pet-api"
pm2 save
pm2 startup
```

#### 3. View logs
```bash
pm2 logs pet-api
pm2 status
```

#### 4. Auto-restart on reboot
```bash
pm2 startup systemd -u root --hp /root
pm2 save
```

#### 5. Stop/restart server
```bash
pm2 restart pet-api
pm2 stop pet-api
pm2 delete pet-api
```

---

### Option B: Docker Container

#### 1. Create Dockerfile
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["node", "server.js"]
```

#### 2. Build image
```bash
docker build -t pet-api .
```

#### 3. Run container
```bash
docker run -d \
  --name pet-api \
  -p 3000:3000 \
  -v $(pwd)/functions/serviceAccountKey.json:/app/functions/serviceAccountKey.json:ro \
  pet-api
```

#### 4. Check logs
```bash
docker logs -f pet-api
```

---

### Option C: Nginx Reverse Proxy

#### 1. Install Nginx
```bash
sudo apt update
sudo apt install nginx
```

#### 2. Create config
```bash
sudo nano /etc/nginx/sites-available/pet-api
```

Paste:
```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

#### 3. Enable site
```bash
sudo ln -s /etc/nginx/sites-available/pet-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## 🔐 Environment Variables

Create `.env` file in `/var/www/petdataapi`:

```env
PORT=3000
NODE_ENV=production
FIREBASE_PROJECT_ID=petssim
```

Update `server.js` to use:
```javascript
require('dotenv').config();
const PORT = process.env.PORT || 3000;
```

Install dotenv:
```bash
npm install dotenv
```

---

## 📊 API Endpoints

All endpoints return standard response format:

```javascript
{
  "status": "ok",
  "data": { ... }
}
```

### Available Endpoints

| Endpoint | Description | Example |
|----------|-----------|---------|
| `GET /api/collections` | List all collections | `curl http://localhost:3000/api/collections` |
| `GET /api/collection/:name` | Get collection data | `curl http://localhost:3000/api/collection/Potions` |
| `GET /api/rap` | Get all item prices | `curl http://localhost:3000/api/rap` |
| `GET /api/clans` | Get clans data | `curl http://localhost:3000/api/clans` |
| `GET /api/clansList` | Get clans list | `curl http://localhost:3000/api/clansList` |
| `GET /api/clansTotal` | Get clans total | `curl http://localhost:3000/api/clansTotal` |
| `GET /api/clan/:name` | Get specific clan | `curl http://localhost:3000/api/clan/ClanName` |
| `GET /api/activeClanBattle` | Get active battle | `curl http://localhost:3000/api/activeClanBattle` |
| `GET /api/exists` | Get exists data | `curl http://localhost:3000/api/exists` |
| `GET /image/:imageId` | Proxy Roblox images | `curl http://localhost:3000/image/123456` |
| `GET /health` | Health check | `curl http://localhost:3000/health` |

---

## 🔄 Automatic Data Sync

Data is synced daily automatically from official API to your Firestore.

To manually sync:
```bash
cd functions
node sync-api-data.js
```

---

## 📝 Update Your Application

Replace all API calls:

### Before (Official API):
```javascript
const API = 'https://ps99.biggamesapi.io/api/';
fetch(API + 'collections')
  .then(r => r.json())
  .then(d => console.log(d.data));
```

### After (Your Self-Hosted API):
```javascript
const API = 'http://your-server:3000/api/';
// OR for production
const API = 'https://your-domain.com/api/';

fetch(API + 'collections')
  .then(r => r.json())
  .then(d => console.log(d.data));
```

---

## 🆘 Troubleshooting

### "Port 3000 already in use"
```bash
# Find process using port 3000
lsof -i :3000

# Kill it
kill -9 <PID>

# Or use different port
PORT=8080 node server.js
```

### "Cannot find serviceAccountKey.json"
```bash
# Make sure file exists
ls functions/serviceAccountKey.json

# If missing, download from Firebase Console:
# https://console.firebase.google.com/project/petssim/settings/serviceaccounts
```

### "Firestore connection failed"
```bash
# Check Firebase is accessible
curl https://firestore.googleapis.com

# Verify credentials are correct
cat functions/serviceAccountKey.json

# Check network/firewall settings
```

### "API returning empty data"
```bash
# The data might not be synced yet
# Run sync:
cd functions && node sync-api-data.js

# Check Firestore console for data:
# https://console.firebase.google.com/project/petssim/firestore
```

---

## 📈 Performance Optimization

### Enable Response Caching
Requests are already cached in-memory for 5 minutes.

### Add Rate Limiting
```bash
npm install express-rate-limit
```

Add to `server.js`:
```javascript
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);
```

### Enable Gzip Compression
Already enabled in `server.js` with cors and compression.

---

## 🔒 Security Checklist

- [ ] Keep `serviceAccountKey.json` private (never commit to git)
- [ ] Use HTTPS in production (nginx or SSL certificate)
- [ ] Block direct Firebase access (firewall rules)
- [ ] Enable rate limiting on API endpoints
- [ ] Use environment variables for sensitive data
- [ ] Regular backups of Firestore data
- [ ] Monitor API logs for suspicious activity

---

## 📦 File Structure

```
/var/www/petdataapi/
├── server.js                 # Main API server
├── package.json             # Dependencies
├── functions/
│   ├── serviceAccountKey.json  # Firebase credentials (KEEP SECRET!)
│   ├── sync-api-data.js     # Initial sync script
│   ├── auto-sync.js         # Scheduled sync
│   └── index.js             # Cloud Functions code
├── public/                  # Documentation website
│   ├── index.html
│   └── styles.css
└── .gitignore              # Don't commit secrets!
```

---

## 🎯 Next Steps

1. **Deploy to your server** using one of the options above
2. **Update your applications** to use new API URL
3. **Monitor performance** with `pm2 logs pet-api`
4. **Set up SSL** with Let's Encrypt for HTTPS
5. **Configure backups** of serviceAccountKey.json

---

## 🆘 Support

**For API issues:**
- Check logs: `pm2 logs pet-api`
- Verify Firestore data: https://console.firebase.google.com
- Test endpoint: `curl http://localhost:3000/api/collections`

**For Firebase issues:**
- Check project console: https://console.firebase.google.com/project/petssim
- Verify credentials are current
- Check quotas and billing

---

**Your private API is ready! 🚀**

All data is stored securely in Firestore and served through your own infrastructure.
