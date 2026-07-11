#!/usr/bin/env bash
# ESPECÍFICO — stack Angular: Node.js (NodeSource) + Angular CLI.
# Executado no build da imagem, como root.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y --no-install-recommends nodejs
npm install -g @angular/cli@20

apt-get clean
rm -rf /var/lib/apt/lists/*

node --version
ng version