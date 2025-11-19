#!/bin/bash
echo "=========================================="
echo "Starting Oncology Research UI"
echo "=========================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ ERROR: Node.js is not installed!"
    echo ""
    echo "Please install Node.js first:"
    echo "1. Visit: https://nodejs.org/"
    echo "2. Download and install the LTS version"
    echo "3. Restart your terminal"
    echo "4. Run this script again"
    echo ""
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo "✅ npm found: $(npm --version)"
echo ""

# Navigate to frontend
cd "$(dirname "$0")/frontend"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies (this may take a few minutes)..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Installation failed. Try: npm install --legacy-peer-deps"
        exit 1
    fi
    echo ""
fi

echo "🚀 Starting frontend server..."
echo ""
echo "The application will open at: http://localhost:3000"
echo ""
echo "Login credentials:"
echo "  Email: ctic_generic@example.com"
echo "  Password: ctic_researcher"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start
