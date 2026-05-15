#!/bin/bash

# Playwright Tools Installer
# Usage: curl -sSL https://raw.githubusercontent.com/truongezgg/playwright-tools/main/install.sh | bash

set -e

REPO_URL="https://github.com/truongezgg/playwright-tools"
INSTALL_DIR="$HOME/.playwright-tools"

echo "Installing Playwright Tools..."

# Create installation directory
mkdir -p "$INSTALL_DIR"

# Download files
echo "Downloading files..."
curl -sSL "$REPO_URL/raw/main/package.json" -o "$INSTALL_DIR/package.json"
curl -sSL "$REPO_URL/raw/main/search.js" -o "$INSTALL_DIR/search.js"
curl -sSL "$REPO_URL/raw/main/fetch.js" -o "$INSTALL_DIR/fetch.js"
curl -sSL "$REPO_URL/raw/main/test.js" -o "$INSTALL_DIR/test.js"

# Create lib directory
mkdir -p "$INSTALL_DIR/lib"
curl -sSL "$REPO_URL/raw/main/lib/browser.js" -o "$INSTALL_DIR/lib/browser.js"
curl -sSL "$REPO_URL/raw/main/lib/snapshot.js" -o "$INSTALL_DIR/lib/snapshot.js"

# Install dependencies
echo "Installing dependencies..."
cd "$INSTALL_DIR"
npm install --production

# Create symlinks
echo "Creating commands..."
mkdir -p "$HOME/.local/bin"
ln -sf "$INSTALL_DIR/search.js" "$HOME/.local/bin/pt-search"
ln -sf "$INSTALL_DIR/fetch.js" "$HOME/.local/bin/pt-fetch"
chmod +x "$INSTALL_DIR/search.js" "$INSTALL_DIR/fetch.js"

# Add to PATH if needed
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
    echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
    export PATH="$HOME/.local/bin:$PATH"
fi

echo ""
echo "Playwright Tools installed successfully!"
echo ""
echo "Commands available:"
echo "  pt-search [engine] [query] [count]  - Search the web"
echo "  pt-fetch [url]                      - Fetch a page"
echo ""
echo "Optional: Start stealth browser server for better stealth:"
echo "  docker-compose up -d"
echo ""
echo "Run 'pt-search --help' for more options."
