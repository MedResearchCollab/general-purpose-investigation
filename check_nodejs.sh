#!/bin/bash
echo "Checking Node.js installation..."
echo ""

if command -v node &> /dev/null; then
    echo "✅ Node.js is installed!"
    echo "   Version: $(node --version)"
    echo "   npm Version: $(npm --version)"
    echo ""
    echo "You can now start the frontend with:"
    echo "  ./START_UI.sh"
else
    echo "❌ Node.js is not installed yet"
    echo ""
    echo "Please:"
    echo "1. Open https://nodejs.org/ in your browser"
    echo "2. Download the LTS version"
    echo "3. Install the .pkg file"
    echo "4. Close and reopen your terminal"
    echo "5. Run this script again: ./check_nodejs.sh"
fi
