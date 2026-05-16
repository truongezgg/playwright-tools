#!/bin/bash

# Playwright Tools Installer
# Installs CLI globally via npm from GitHub
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/truongezgg/playwright-tools/main/install.sh | bash

set -e

REPO_URL="git+https://github.com/truongezgg/playwright-tools.git"
SKILL_DIR="${SKILL_DIR:-$HOME/.agents/skills}"

echo "Installing Playwright Tools..."
echo "Source: $REPO_URL"

# Uninstall existing global package if present
npm uninstall -g playwright-tools 2>/dev/null || true

# Install globally from GitHub
npm install -g "$REPO_URL"
INSTALL_DIR="$(npm root -g)/playwright-tools"

# Save commit hash for update tracking
REMOTE_HEAD=$(git ls-remote https://github.com/truongezgg/playwright-tools.git HEAD 2>/dev/null | cut -f1)
if [ -n "$REMOTE_HEAD" ]; then
  echo "$REMOTE_HEAD" > "$INSTALL_DIR/.commit"
fi

# Install skill
if [ -d "$INSTALL_DIR/skills/playwright-tools" ]; then
  echo "Installing skill..."
  mkdir -p "$SKILL_DIR"
  cp -r "$INSTALL_DIR/skills/playwright-tools" "$SKILL_DIR/playwright-tools"
  echo "  Installed to: $SKILL_DIR/playwright-tools"
fi

# Sync OpenCode tools to global config
OPENCODE_GLOBAL="$HOME/.config/opencode/tools"
if [ -d "$INSTALL_DIR/opencode" ]; then
  mkdir -p "$OPENCODE_GLOBAL"
  echo "Syncing OpenCode tools..."
  cp "$INSTALL_DIR/opencode/pt-web-search.ts" "$OPENCODE_GLOBAL/"
  cp "$INSTALL_DIR/opencode/pt-web-fetch.ts" "$OPENCODE_GLOBAL/"
  echo "  Synced to: $OPENCODE_GLOBAL/"
fi

echo ""
echo "Done! CLI installed: pt"
echo ""
echo "Usage:"
echo "  pt search ddg \"query\" 5"
echo "  pt search exa \"query\" 5"
echo "  pt fetch https://example.com"
echo ""
echo "To update:"
echo "  pt update"
echo ""
echo "Optional: Start stealth server for Google/Bing without CAPTCHA:"
echo "  docker run -d -p 9222:9222 cloakhq/cloakbrowser cloakserve"
