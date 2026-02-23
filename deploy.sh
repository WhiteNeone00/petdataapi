#!/bin/bash
# Deployment script for Pet Simulator 99 API to Firebase

set -e

echo "🚀 Pet Simulator 99 API - Firebase Deployment"
echo "=============================================="

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed."
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if in the right directory
if [ ! -f "firebase.json" ]; then
    echo "❌ firebase.json not found. Please run this script from the project root."
    exit 1
fi

echo "📦 Installing dependencies..."
cd functions
npm install
cd ..

echo "🔐 Logging in to Firebase..."
firebase login

echo "📋 Select your Firebase project:"
firebase use --add

echo "📡 Deploying to Firebase..."
firebase deploy

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📍 Your API is now live at:"
firebase open hosting:site

echo ""
echo "📚 Documentation available at your Firebase Hosting URL"
echo "🔗 API base: https://your-project.firebaseapp.com/api/"
echo ""
echo "💡 Next steps:"
echo "1. Update your application endpoints to use the new API URL"
echo "2. Monitor logs: firebase functions:log"
echo "3. View console: firebase open console"
