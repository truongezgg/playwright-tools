#!/bin/bash

# Playwright Tools Installer
# Installs CLI tools only
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/truongezgg/playwright-tools/main/install.sh | bash

set -e

REPO_URL="https://github.com/truongezgg/playwright-tools"
INSTALL_DIR="$HOME/.playwright-tools"

echo "Installing Playwright Tools..."

# Clone or update repo
if [ -d "$INSTALL_DIR" ]; then
  echo "Updating existing installation..."
  cd "$INSTALL_DIR"
  git pull --quiet
else
  echo "Cloning repository..."
  git clone --quiet "$REPO_URL" "$INSTALL_DIR"
fi

# Install npm dependencies
cd "$INSTALL_DIR"
npm install --production --quiet

# Create CLI symlink
mkdir -p "$HOME/.local/bin"
ln -sf "$INSTALL_DIR/bin/pt.js" "$HOME/.local/bin/pt"
chmod +x "$INSTALL_DIR/bin/pt.js"

# Add to PATH if needed
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
  export PATH="$HOME/.local/bin:$PATH
fi

echo ""
echo "Done! CLI installed: pt"
echo ""
echo "Usage:"
echo "  pt search ddg \"query\" 5"
echo "  pt fetch https://example.com"
echo ""
echo "Add skill to your agent:"
echo "  npx skills add https://github.com/truongezgg/playwright-tools"
echo ""
echo "Optional: Start stealth server for Google/Bing without CAPTCHA:"
echo "  cd $INSTALL_DIR && docker compose up -d"
