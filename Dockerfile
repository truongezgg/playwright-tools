FROM node:20-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install CloakBrowser
WORKDIR /app
RUN npm init -y
RUN npm install cloakbrowser playwright-core

# Expose CDP port
EXPOSE 9222

# Start CloakBrowser with remote debugging
CMD ["node", "-e", "import('cloakbrowser').then(async (mod) => { const browser = await mod.launch({ headless: true, humanize: true, args: ['--remote-debugging-port=9222', '--remote-debugging-address=0.0.0.0'] }); console.log('CloakBrowser server running on port 9222'); })"]
