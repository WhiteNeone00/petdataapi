# 🚀 DEPLOYMENT GUIDE - Pet Simulator 99 API on Firebase

## Complete Setup & Deployment Instructions

### Prerequisites
- Node.js 18+ installed
- npm installed
- Firebase account (free or paid)
- Firebase CLI installed (`npm install -g firebase-tools`)

---

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

Verify installation:
```bash
firebase --version
```

---

## Step 2: Create a Firebase Project

### Option A: Use Existing Project (petssim)
If you already have a Firebase project, you can use it.

### Option B: Create New Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Name it (e.g., "pet99api")
4. Accept the terms
5. Disable Google Analytics
6. Click "Create project"

---

## Step 3: Important - Upgrade to Blaze Plan

**⚠️ Cloud Functions need Blaze plan to make external HTTP requests**

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Click "Upgrade" button or go to Billing → Upgrade to Blaze
4. Choose Blaze plan (pay-as-you-go, usually free with generous limits)

---

## Step 4: Prepare the Project

```bash
# Navigate to the API project directory
cd /var/www/petdataapi

# Install function dependencies
cd functions
npm install
cd ..
```

---

## Step 5: Connect to Firebase

```bash
# Login to Firebase (opens browser)
firebase login

# Initialize Firebase in the project
firebase init

# When prompted:
# - Select "Functions" and "Hosting"
# - Choose existing project if using petssim
# - Use defaults for most questions
# - Public directory: public
# - Rewrite all URLs to index.html: No
```

Or use the .firebaserc file already provided:

```bash
# Just run
firebase use petssim  # or your project name
```

---

## Step 6: Deploy

```bash
# Deploy everything (functions + hosting)
firebase deploy

# Or deploy separately:
firebase deploy --only functions
firebase deploy --only hosting
```

**This will take 2-5 minutes. Wait for completion.**

---

## Step 7: Get Your Deployment URLs

After deployment completes, you'll see:

```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/your-project/overview
Hosting URL: https://your-project.web.app
Function URL: https://your-project.firebaseapp.com/api
```

---

## Step 8: Test Your API

Open your browser and test the endpoints:

```
# Collections endpoint
https://your-project.web.app/api/collections

# Test response
{
  "status": "ok",
  "data": [
    "Achievements", "Boosts", "Booths", ...
  ]
}
```

---

## Step 9: Configure Your Application

Update your application code to use your new API:

### Before (Old BIG Games API):
```javascript
const API = 'https://ps99.biggamesapi.io/api/';
```

### After (Your Firebase API):
```javascript
const API = 'https://your-project.web.app/api/';
```

---

## Manual Deployment Steps (If Issues Occur)

```bash
# Clear Firebase cache
firebase delete

# Reinitialize
firebase init

# Deploy step by step
cd functions
npm install
cd ..

firebase deploy --only functions
firebase deploy --only hosting

# View logs
firebase functions:log
```

---

## Common Issues & Solutions

### ❌ "Cannot make external requests"
**Solution:** Upgrade to Blaze plan (see Step 3)

### ❌ "Deployment timed out"
**Solution:** Try deploying functions separately:
```bash
firebase deploy --only functions
firebase deploy --only hosting
```

### ❌ "Node modules too large"
**Solution:** Recreate node_modules:
```bash
cd functions
rm -rf node_modules
npm install
cd ..
firebase deploy
```

### ❌ "Function crashes on deployment"
**Solution:** Check logs:
```bash
firebase functions:log
```

### ❌ "404 errors on API calls"
**Solution:** Make sure you're using the correct URL:
- Hosting: `https://your-project.web.app`
- Functions: `https://your-project.firebaseapp.com/api`

---

## Monitoring & Maintenance

### View Live Logs
```bash
firebase functions:log
```

### Check Dashboard
```bash
firebase open console
```

### Monitor Usage
In Firebase Console → Functions → Metrics

---

## API Endpoints After Deployment

All endpoints will be available at:

```
https://your-project.web.app/api/collections
https://your-project.web.app/api/collection/{name}
https://your-project.web.app/api/clans
https://your-project.web.app/api/clansList
https://your-project.web.app/api/clansTotal
https://your-project.web.app/api/clan/{name}
https://your-project.web.app/api/exists
https://your-project.web.app/api/rap
https://your-project.web.app/api/activeClanBattle
https://your-project.web.app/image/{imageId}
```

---

## Update Deployment

After making changes to the API:

```bash
# Redeploy
firebase deploy

# Or selective deployment
firebase deploy --only functions  # For API changes
firebase deploy --only hosting    # For documentation changes
```

---

## Performance Optimization

### 1. Enable Firebase CDN Caching
In `firebase.json`, add headers:

```json
{
  "hosting": {
    "headers": [
      {
        "source": "/api/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=300"
          }
        ]
      }
    ]
  }
}
```

### 2. Monitor Cloud Function Performance
- Check memory usage in Firebase Console
- Default is 256MB, good for this API
- Increase to 512MB if slow: Edit `firebase.json`

```json
{
  "functions": {
    "memory": 512,
    "timeoutSeconds": 60
  }
}
```

### 3. Enable Logging
Already configured in `index.js` with `console.log` statements

---

## Scaling to Production

Your Firebase deployment automatically scales, but for production:

1. **Upgrade Memory**: Set to 512MB or 1GB
2. **Enable CDN**: Firebase Hosting includes CDN
3. **Add Custom Domain**: In Firebase Console → Hosting
4. **Setup Monitoring**: Install Firebase Performance plugin
5. **Add Security**: Setup Firebase Security Rules

---

## Rollback

If something goes wrong:

```bash
# View deployment history
firebase functions:list

# Redeploy previous version or fix code and redeploy
firebase deploy
```

---

## Get Your Firebase Hosting URL

After successful deployment:

```bash
firebase open hosting:site
```

Or find it in:
- Firebase Console → Hosting → Domain

---

## Final Checklist

- [x] Firebase project created
- [x] Project upgraded to Blaze plan
- [x] Firebase CLI installed and logged in
- [x] Dependencies installed
- [x] Deployment completed successfully
- [x] API endpoints tested and working
- [ ] Application code updated with new API URL
- [ ] Monitoring setup completed
- [ ] Team notified of new API endpoints

---

## Support

If you encounter issues:

1. Check Firebase Console for error messages
2. View function logs: `firebase functions:log`
3. Verify project is on Blaze plan
4. Ensure Node.js 18+ is installed
5. Clear cache: `firebase delete && firebase deploy`

---

## Next Steps

1. **Update your applications** to use the new API URL
2. **Monitor performance** in Firebase Console
3. **Setup custom domain** (optional, for production)
4. **Configure backups** of the API
5. **Add team members** in Firebase Console

---

**Your API is now live! 🚀**

Start integrating with:
```javascript
const API_URL = 'https://your-project.web.app/api/';
```

---

*For original API documentation, visit: https://github.com/BIG-Games-LLC/ps99-public-api-docs*
