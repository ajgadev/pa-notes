#!/bin/bash
set -e

# ============================================
#   PetroAlianza - Deploy from local machine
#   Usage: ./scripts/deploy.sh <server-ip> [domain]
# ============================================

show_help() {
  echo "Usage: ./scripts/deploy.sh <server-ip> [domain]"
  echo ""
  echo "Examples:"
  echo "  ./scripts/deploy.sh 65.21.123.45                        # HTTP only (no SSL)"
  echo "  ./scripts/deploy.sh 65.21.123.45 notas.example.com      # HTTPS with own domain"
  echo "  ./scripts/deploy.sh 65.21.123.45 petroalianza.duckdns.org  # HTTPS with DuckDNS"
  echo ""
  echo "Free domain with DuckDNS (HTTPS):"
  echo "  1. Go to https://www.duckdns.org and sign in with Google/GitHub"
  echo "  2. Create a subdomain (e.g. 'petroalianza' -> petroalianza.duckdns.org)"
  echo "  3. Set the IP to your server IP ($1)"
  echo "  4. Run: ./scripts/deploy.sh $1 petroalianza.duckdns.org"
  echo ""
}

if [ -z "$1" ]; then
  show_help
  exit 1
fi

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
  show_help
  exit 0
fi

SERVER="$1"
DOMAIN="${2:-}"
USER="root"
REMOTE_TMP="/tmp/pa-notas-deploy"

echo "============================================"
echo "  Deploying to $SERVER"
if [ -n "$DOMAIN" ]; then
  echo "  Domain: $DOMAIN (HTTPS)"
else
  echo "  No domain (HTTP only)"
fi
echo "============================================"
echo ""

# 1. Zip project (exclude junk)
echo "[1/3] Zipping project..."
cd "$(dirname "$0")/.."
rm -f /tmp/pa-notas-deploy.zip
zip -rq /tmp/pa-notas-deploy.zip . \
  -x ".git/*" "node_modules/*" ".env" "data/*.db" "data/logs/*" ".claude/*" "coverage/*" "dist/*" "backups/*" "pa-notas.zip"
echo "[OK] Zip created"
echo ""

# 2. Upload to server
echo "[2/3] Uploading to $SERVER..."
ssh $USER@$SERVER "rm -rf $REMOTE_TMP && mkdir -p $REMOTE_TMP"
scp -q /tmp/pa-notas-deploy.zip $USER@$SERVER:$REMOTE_TMP/
ssh $USER@$SERVER "apt-get update -qq && apt-get install -y -qq unzip > /dev/null && cd $REMOTE_TMP && unzip -qo pa-notas-deploy.zip && rm pa-notas-deploy.zip"
echo "[OK] Files uploaded"
echo ""

# 3. Run server-side deploy
echo "[3/3] Running deployment on server..."
ssh -t $USER@$SERVER "cd $REMOTE_TMP && bash scripts/deploy-server.sh $DOMAIN"

# Cleanup
rm -f /tmp/pa-notas-deploy.zip
