#!/bin/bash
# Try to find Node.js in common locations
PATHS=("/usr/local/bin/node" "/opt/homebrew/bin/node" "$HOME/.nvm/versions/node/*/bin/node" "/usr/bin/node")

for path in "${PATHS[@]}"; do
    if [ -f "$path" ] || ls $path 2>/dev/null | head -1 | grep -q node; then
        echo "Found Node.js at: $path"
        $path --version 2>/dev/null && exit 0
    fi
done

echo "Node.js not found. Please restart your terminal and run:"
echo "  node --version"
