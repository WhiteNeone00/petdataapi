# Deploy to Render.com

## Step 1: Push to GitHub
```bash
cd /var/www/petdataapi
git init
git add .
git commit -m "Pet Simulator 99 API - Ready for Render"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/petdataapi.git
git push -u origin main
```

## Step 2: Connect to Render
1. Go to [render.com](https://render.com)
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account
4. Select the `petdataapi` repository
5. Render will auto-detect `render.yaml`

## Step 3: Configure Environment
Render will automatically use settings from `render.yaml`:
- **Name**: pet-api
- **Runtime**: Node
- **Build Command**: `npm install`
- **Start Command**: `node server.js`
- **Plan**: Free

## Step 4: Add Secrets
Go to **Environment** and add your Firebase credentials:

**Key**: `FIREBASE_SERVICE_ACCOUNT`  
**Value**: (Copy entire contents of `functions/serviceAccountKey.json`)

Or upload the JSON file directly.

## Step 5: Deploy
Click **"Create Web Service"** - Render will:
1. Clone your repo
2. Install dependencies
3. Start the server
4. Give you a URL like `https://pet-api-xxxx.onrender.com`

## Step 6: Test
```bash
curl https://pet-api-xxxx.onrender.com/api/collections
curl https://pet-api-xxxx.onrender.com/health
```

---

## Free Tier Details
- **Always on** (no cold starts after 15 min idle)
- **512 MB RAM**
- **0.5 CPU**
- Perfect for your API!

---

## Update Package.json (Optional)
If needed, add:
```json
"engines": {
  "node": "20.x"
}
```

---

**Your API will be live in ~2 minutes!** 🚀
