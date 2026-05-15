#!/bin/bash

# Playwright Tools Updater
#
# Usage:
#   pt update

set -e

INSTALL_DIR="$HOME/.playwright-tools"
SKILL_DIR="${SKILL_DIR:-$HOME/.agents/skills}"

if [ -d "$INSTALL_DIR" ]; then
  # curl install: git pull
  echo "Updating Playwright Tools (git)..."
  cd "$INSTALL_DIR"
  git pull --quiet
  npm install --production --quiet
else
  # npm -g install: reinstall
  echo "Updating Playwright Tools (npm)..."
  npm install -g git+https://github.com/truongezgg/playwright-tools.git
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

# Sync OpenCode tools if .opencode/tools/ exists in current directory
OPENCODE_DIR="$(pwd)/.opencode/tools"
if [ -d "$OPENCODE_DIR" ] && [ -d "$INSTALL_DIR/opencode" ]; then
  echo "Syncing OpenCode tools..."
  cp "$INSTALL_DIR/opencode/pt-web-search.ts" "$OPENCODE_DIR/"
  cp "$INSTALL_DIR/opencode/pt-web-fetch.ts" "$OPENCODE_DIR/"
  echo "  Synced: pt-web-search.ts, pt-web-fetch.ts"
fi

echo "Done! Updated."
