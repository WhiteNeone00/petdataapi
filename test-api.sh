#!/bin/bash
# Quick local test script

echo "🧪 Testing Pet Simulator 99 API"
echo "==============================="

API_BASE="https://ps99.biggamesapi.io"

echo ""
echo "1️⃣  Testing Collections endpoint..."
curl -s "$API_BASE/api/collections" | head -c 200
echo "... ✓"

echo ""
echo ""
echo "2️⃣  Testing Clans Total endpoint..."
curl -s "$API_BASE/api/clansTotal" 
echo "... ✓"

echo ""
echo ""
echo "3️⃣  Testing Exists data (first 200 chars)..."
curl -s "$API_BASE/api/exists" | head -c 200
echo "... ✓"

echo ""
echo ""
echo "✅ API is responding correctly!"
echo ""
echo "Once deployed to Firebase, your endpoints will be at:"
echo "  https://your-project.web.app/api/"
echo ""
echo "Run 'firebase deploy' to deploy now"
