#!/bin/bash
clear
echo "=========================================="
echo "Verifying Node.js Installation"
echo "=========================================="
echo ""

if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    NPM_VERSION=$(npm --version)
    echo "✅ SUCCESS! Node.js is installed!"
    echo ""
    echo "   Node.js: $NODE_VERSION"
    echo "   npm:     $NPM_VERSION"
    echo ""
    echo "=========================================="
    echo "Next Steps:"
    echo "=========================================="
    echo ""
    echo "1. Start the frontend server:"
    echo "   cd general_purpose_investigation"
    echo "   ./START_UI.sh"
    echo ""
    echo "2. Or manually:"
    echo "   cd frontend"
    echo "   npm install"
    echo "   npm start"
    echo ""
    echo "3. Open browser: http://localhost:3000"
    echo ""
else
    echo "❌ Node.js is not installed yet"
    echo ""
    echo "Please:"
    echo "1. Go to https://nodejs.org/"
    echo "2. Download the LTS version"
    echo "3. Install the .pkg file"
    echo "4. CLOSE AND REOPEN your terminal"
    echo "5. Run this script again"
    echo ""
fi
