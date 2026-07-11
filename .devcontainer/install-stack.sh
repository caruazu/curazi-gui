#!/usr/bin/env bash
# ESPECÍFICO — stack Angular: Node.js (NodeSource) + Angular CLI + Chrome headless.
# Executado no build da imagem, como root.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y --no-install-recommends nodejs
npm install -g @angular/cli@20

# Chrome headless para os testes (ng test / karma). Bibliotecas de sistema que o
# binário exige na base ubuntu-24.04 + chrome-headless-shell em caminho estável.
# CHROME_BIN aponta para o symlink (ver containerEnv no devcontainer.json); o
# karma.conf.js do projeto usa o launcher ChromeHeadlessNoSandbox, pois o
# sandbox do Chrome não funciona dentro do container.
apt-get install -y --no-install-recommends \
  libglib2.0-0 libnss3 libnspr4 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 \
  libcups2 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
  libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2t64

npx --yes @puppeteer/browsers install chrome-headless-shell@stable --path /opt/chrome
CHROME_PATH=$(find /opt/chrome -type f -name chrome-headless-shell | head -1)
ln -sfn "$CHROME_PATH" /usr/local/bin/chrome-headless-shell
chmod -R a+rX /opt/chrome

apt-get clean
rm -rf /var/lib/apt/lists/*

node --version
ng version
chrome-headless-shell --version
