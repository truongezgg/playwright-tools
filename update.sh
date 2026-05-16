#!/bin/bash

# Playwright Tools Updater
#
# Usage:
#   pt update

set -e

INSTALL_DIR="$HOME/.playwright-tools"
SKILL_DIR="${SKILL_DIR:-$HOME/.agents/skills}"
ORIG_DIR="$(pwd)"

if [ -d "$INSTALL_DIR" ]; then
  # curl install: git pull (stash local changes first)
  echo "Updating Playwright Tools (git)..."
  cd "$INSTALL_DIR"
  git stash --quiet 2>/dev/null || true
  git pull --quiet
  git stash pop --quiet 2>/dev/null || true
  npm install --production --quiet
  echo "Updated to: $(git log --oneline -1)"
else
  # npm -g install: reinstall (--prefer-online bypasses cache for git URLs)
  echo "Updating Playwright Tools (npm)..."
  npm install -g --prefer-online git+https://github.com/truongezgg/playwright-tools.git
  # Find install dir from npm
  INSTALL_DIR="$(npm root -g)/playwright-tools"
fi

# Update skill
if [ -d "$INSTALL_DIR/skills/playwright-tools" ]; then
  echo "Updating skill..."
  mkdir -p "$SKILL_DIR"
  rm -rf "$SKILL_DIR/playwright-tools"
  cp -r "$INSTALL_DIR/skills/playwright-tools" "$SKILL_DIR/playwright-tools"
fi

# Sync OpenCode tools to global config
OPENCODE_GLOBAL="$HOME/.config/opencode/tools"
if [ -d "$INSTALL_DIR/opencode" ]; then
  mkdir -p "$OPENCODE_GLOBAL"
  echo "Syncing OpenCode tools to global config..."
  cp "$INSTALL_DIR/opencode/pt-web-search.ts" "$OPENCODE_GLOBAL/"
  cp "$INSTALL_DIR/opencode/pt-web-fetch.ts" "$OPENCODE_GLOBAL/"
  echo "  Synced: pt-web-search.ts, pt-web-fetch.ts"
fi

echo "Done! Updated."
