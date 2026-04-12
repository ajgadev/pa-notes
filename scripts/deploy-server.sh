#!/bin/bash
set -e

# ============================================
#   PetroAlianza - Server Deployment
#   Run on the Hetzner VPS (Ubuntu 22/24)
#   Usage: deploy-server.sh [domain]
#   No domain = HTTP on IP
# ============================================

APP_DIR="/opt/pa-notas"
APP_USER="pa-notas"
NODE_VERSION="24"
PORT=4321
DOMAIN="${1:-}"

echo "============================================"
echo "  PetroAlianza - Server Deployment"
echo "============================================"
echo ""

# Must run as root
if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] Run as root: sudo bash deploy-server.sh"
  exit 1
fi

# 0. Install basic tools
echo "[0/6] Installing prerequisites..."
apt-get update -qq
apt-get install -y -qq unzip curl > /dev/null
echo "[OK] Prerequisites ready"
echo ""

# 1. Install Node.js
echo "[1/6] Installing Node.js $NODE_VERSION..."
if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt "$NODE_VERSION" ]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi
echo "[OK] Node.js $(node -v)"
echo ""

# 2. Install Caddy
echo "[2/6] Installing Caddy..."
if ! command -v caddy &>/dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi
echo "[OK] Caddy installed"
echo ""

# 3. Create app user and copy files (preserve data/ if it exists)
echo "[3/6] Setting up app directory..."
id -u $APP_USER &>/dev/null || useradd --system --no-create-home --shell /bin/false $APP_USER

# Stop app before copying to prevent DB corruption
systemctl stop pa-notas 2>/dev/null || true

# Preserve existing database and logs
if [ -d "$APP_DIR/data" ]; then
  cp -r "$APP_DIR/data" /tmp/pa-notas-data-backup
fi

mkdir -p $APP_DIR
cp -r . $APP_DIR/

# Restore preserved data
if [ -d "/tmp/pa-notas-data-backup" ]; then
  cp -rn /tmp/pa-notas-data-backup/* $APP_DIR/data/ 2>/dev/null || true
  rm -rf /tmp/pa-notas-data-backup
fi

mkdir -p $APP_DIR/data/logs
chown -R $APP_USER:$APP_USER $APP_DIR
echo "[OK] Files copied to $APP_DIR"
echo ""

# 4. Install dependencies and build
echo "[4/6] Installing dependencies and building..."
cd $APP_DIR
npm install
npm run db:push
# Only seed if database is new
if [ ! -f "$APP_DIR/data/petroalianza.db" ] || [ "$(stat -c%s "$APP_DIR/data/petroalianza.db" 2>/dev/null || echo 0)" -lt 1000 ]; then
  npx tsx src/lib/seed.ts --prod
  echo "[OK] Database seeded (admin / admin123)"
else
  echo "[OK] Database already exists, skipping seed"
fi
npm run build
chown -R $APP_USER:$APP_USER $APP_DIR
echo "[OK] Application built"
echo ""

# 5. Create systemd service
echo "[5/6] Creating systemd service..."
cat > /etc/systemd/system/pa-notas.service << 'EOF'
[Unit]
Description=PetroAlianza Notas System
After=network.target

[Service]
Type=simple
User=pa-notas
Group=pa-notas
WorkingDirectory=/opt/pa-notas
ExecStart=/usr/bin/node dist/server/entry.mjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=4321

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable pa-notas
systemctl restart pa-notas
echo "[OK] Service created and started"
echo ""

# 6. Configure Caddy
echo "[6/6] Configuring reverse proxy..."
SERVER_IP=$(curl -4 -s ifconfig.me 2>/dev/null || echo "<server-ip>")

if [ -n "$DOMAIN" ]; then
  cat > /etc/caddy/Caddyfile << CADDYEOF
$DOMAIN {
    reverse_proxy 127.0.0.1:$PORT {
        header_up X-Forwarded-Proto {scheme}
    }
}
CADDYEOF
  echo "[OK] Caddy configured for $DOMAIN (auto HTTPS via Let's Encrypt)"
else
  cat > /etc/caddy/Caddyfile << CADDYEOF
:80 {
    reverse_proxy 127.0.0.1:$PORT
}
CADDYEOF
  echo "[OK] Caddy configured for HTTP on $SERVER_IP"
fi

systemctl restart caddy
echo ""

# Summary
echo "============================================"
echo "  Deployment complete!"
echo ""
if [ -n "$DOMAIN" ]; then
  echo "  URL: https://$DOMAIN"
  echo "  (DNS must point to $SERVER_IP)"
else
  echo "  URL: http://$SERVER_IP"
fi
echo ""
echo "  Login: admin / admin123"
echo "  CHANGE THE PASSWORD IMMEDIATELY"
echo ""
echo "  Commands:"
echo "    systemctl status pa-notas     # status"
echo "    systemctl restart pa-notas    # restart"
echo "    journalctl -u pa-notas -f     # system logs"
echo "    tail -f /opt/pa-notas/data/logs/app.log  # app logs"
echo "============================================"
