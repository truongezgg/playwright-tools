#!/bin/bash

# Playwright Tools Updater
#
# Usage:
#   pt-update

set -e

INSTALL_DIR="$HOME/.playwright-tools"
SKILL_DIR="${SKILL_DIR:-$HOME/.agents/skills}"

if [ ! -d "$INSTALL_DIR" ]; then
  echo "Playwright Tools not installed at $INSTALL_DIR"
  echo "Install first: curl -sSL https://raw.githubusercontent.com/truongezgg/playwright-tools/main/install.sh | bash"
  exit 1
fi

echo "Updating Playwright Tools..."

cd "$INSTALL_DIR"
git pull --quiet
npm install --production --quiet

# Update skill
echo "Updating skill..."
rm -rf "$SKILL_DIR/playwright-tools"
cp -r "$INSTALL_DIR/skills/playwright-tools" "$SKILL_DIR/playwright-tools"

echo "Done! Updated:"
echo "  CLI:    pt-search, pt-fetch"
echo "  Skill:  $SKILL_DIR/playwright-tools/SKILL.md"
