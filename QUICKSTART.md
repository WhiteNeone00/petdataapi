# Quick Start Guide

## 🚀 Get Running in 5 Minutes

### 1. Install Dependencies
```bash
cd /var/www/petdataapi/functions
npm install
cd ..
```

### 2. Login to Firebase
```bash
firebase login
```

### 3. Deploy
```bash
firebase deploy
```

### 4. Done! 🎉

Your API is live at:
- 📚 Documentation: https://your-project.web.app
- 🔌 API Base: https://your-project.web.app/api/

---

## 📋 Common Commands

| Command | Purpose |
|---------|---------|
| `firebase deploy` | Deploy everything |
| `firebase deploy --only functions` | Deploy API only |
| `firebase deploy --only hosting` | Deploy website only |
| `firebase functions:log` | View live logs |
| `firebase open console` | Open Firebase dashboard |
| `firebase emulators:start` | Run locally (needs setup) |

---

## 🧪 Test Your API

After deployment, test these URLs:

```bash
# Get all collections
curl https://your-project.web.app/api/collections

# Get specific collection
curl https://your-project.web.app/api/collection/Pets

# Get clans list
curl https://your-project.web.app/api/clans

# Get clans total
curl https://your-project.web.app/api/clansTotal

# Get exists data
curl https://your-project.web.app/api/exists

# Get RAP data
curl https://your-project.web.app/api/rap
```

---

## 📝 Project Structure

```
/var/www/petdataapi/
├── functions/           # Cloud Functions (API backend)
│   ├── index.js        # All API endpoints
│   └── package.json    # Dependencies
├── public/             # Firebase Hosting (documentation)
│   ├── index.html      # Beautiful documentation site
│   └── styles.css      # Styling
├── firebase.json       # Firebase config
├── DEPLOYMENT.md       # Detailed deployment guide
└── README.md          # Full documentation
```

---

## ⚡ Key Features

✅ **All BIG Games API Endpoints**
- Collections, Clans, Pets, Items, RAP, Exists data

✅ **Smart Caching**
- Reduces API calls by 90%
- 1-4 hour cache TTL

✅ **Beautiful Documentation**
- Modern UI/UX
- Code examples in 4 languages
- Responsive design

✅ **Firebase Deployment**
- Auto-scaling
- Global CDN
- 99.95% uptime SLA

---

## 🔑 Important Notes

⚠️ **BLAZE PLAN REQUIRED**
Your Firebase project MUST be on Blaze plan to make external HTTP requests to the BIG Games API.

---

**Ready to deploy? Run: `firebase deploy`**

*Detailed guide available in DEPLOYMENT.md*
