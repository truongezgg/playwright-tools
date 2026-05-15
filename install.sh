#!/bin/bash

# Playwright Tools Installer
# Installs CLI globally via npm from GitHub
#
# Usage:
#   curl -sSL https://raw.githubusercontent.com/truongezgg/playwright-tools/main/install.sh | bash

set -e

REPO_URL="git+https://github.com/truongezgg/playwright-tools.git"

echo "Installing Playwright Tools..."
echo "Source: $REPO_URL"

# Uninstall existing global package if present
npm uninstall -g playwright-tools 2>/dev/null || true

# Install globally from GitHub
npm install -g "$REPO_URL"

echo ""
echo "Done! CLI installed: pt"
echo ""
echo "Usage:"
echo "  pt search ddg \"query\" 5"
echo "  pt fetch https://example.com"
echo ""
echo "To update:"
echo "  npm install -g git+https://github.com/truongezgg/playwright-tools.git"
echo ""
echo "Optional: Start stealth server for Google/Bing without CAPTCHA:"
echo "  docker run -d -p 9222:9222 cloakhq/cloakbrowser cloakserve"
