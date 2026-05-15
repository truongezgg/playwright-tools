#!/bin/bash

# Playwright Tools Installer
# Installs CLI tools and adds skill to agent directory
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/truongezgg/playwright-tools/main/install.sh | bash

set -e

REPO_URL="https://github.com/truongezgg/playwright-tools"
INSTALL_DIR="$HOME/.playwright-tools"
SKILL_DIR="${SKILL_DIR:-$HOME/.agents/skills}"

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

# Create CLI symlinks
mkdir -p "$HOME/.local/bin"
ln -sf "$INSTALL_DIR/bin/pt.js" "$HOME/.local/bin/pt"
ln -sf "$INSTALL_DIR/search.js" "$HOME/.local/bin/pt-search"
ln -sf "$INSTALL_DIR/fetch.js" "$HOME/.local/bin/pt-fetch"
ln -sf "$INSTALL_DIR/update.sh" "$HOME/.local/bin/pt-update"
chmod +x "$INSTALL_DIR/bin/pt.js" "$INSTALL_DIR/search.js" "$INSTALL_DIR/fetch.js" "$INSTALL_DIR/update.sh"

# Add to PATH if needed
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.bashrc"
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$HOME/.zshrc"
  export PATH="$HOME/.local/bin:$PATH"
fi

# Install skill
echo "Adding skill to $SKILL_DIR/playwright-tools..."
mkdir -p "$SKILL_DIR"
rm -rf "$SKILL_DIR/playwright-tools"
cp -r "$INSTALL_DIR/skills/playwright-tools" "$SKILL_DIR/playwright-tools"

echo ""
echo "Done! Installed:"
echo "  CLI:    pt-search, pt-fetch"
echo "  Skill:  $SKILL_DIR/playwright-tools/SKILL.md"
echo ""
echo "Usage:"
echo "  pt-search ddg \"query\" 5"
echo "  pt-fetch https://example.com"
echo ""
echo "Optional: Start stealth server for Google/Bing without CAPTCHA:"
echo "  cd $INSTALL_DIR && docker compose up -d"
