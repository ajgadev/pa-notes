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
DB_FILE="$APP_DIR/data/petroalianza.db"

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
apt-get install -y -qq unzip curl sqlite3 > /dev/null
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

# 3. Stop app and copy files (preserve data/)
echo "[3/6] Setting up app directory..."
id -u $APP_USER &>/dev/null || useradd --system --no-create-home --shell /bin/false $APP_USER

# Stop app completely before touching anything
systemctl stop pa-notas 2>/dev/null || true
sleep 1

# Save existing data directory to a safe location
BACKUP_DIR=""
if [ -d "$APP_DIR/data" ]; then
  BACKUP_DIR="/tmp/pa-notas-data-$(date +%s)"
  mv "$APP_DIR/data" "$BACKUP_DIR"
  echo "  Backed up data/ to $BACKUP_DIR"
fi

# Copy new code
mkdir -p $APP_DIR
rm -rf $APP_DIR/src $APP_DIR/dist $APP_DIR/node_modules $APP_DIR/scripts $APP_DIR/public
cp -r . $APP_DIR/

# Restore data directory (overwrite the empty one from the zip)
if [ -n "$BACKUP_DIR" ]; then
  rm -rf "$APP_DIR/data"
  mv "$BACKUP_DIR" "$APP_DIR/data"
  echo "  Restored data/"
fi

mkdir -p "$APP_DIR/data/logs"
chown -R $APP_USER:$APP_USER $APP_DIR
echo "[OK] Files deployed to $APP_DIR"
echo ""

# 4. Install dependencies and build
echo "[4/6] Installing dependencies and building..."
cd $APP_DIR
npm install

# Push schema (safe — only adds missing tables/columns)
# First try drizzle-kit push; if it fails (e.g. FK constraints), fall back to manual migrations
npx drizzle-kit push --force || echo "[WARN] drizzle-kit push failed — applying manual migrations"

# Manual idempotent migrations for columns/tables drizzle-kit can't handle
if [ -f "$DB_FILE" ]; then
  sqlite3 "$DB_FILE" "ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;" 2>/dev/null || true
  sqlite3 "$DB_FILE" "CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, username TEXT NOT NULL, action TEXT NOT NULL, target TEXT, detail TEXT, ip TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));" 2>/dev/null || true
fi

# Only seed on first deploy (no users table or zero users)
NEEDS_SEED=false
if [ ! -f "$DB_FILE" ]; then
  NEEDS_SEED=true
else
  USER_COUNT=$(sqlite3 "$DB_FILE" "SELECT count(*) FROM users;" 2>/dev/null || echo "error")
  if [ "$USER_COUNT" = "error" ] || [ "$USER_COUNT" -eq 0 ]; then
    NEEDS_SEED=true
  fi
fi

if [ "$NEEDS_SEED" = true ]; then
  echo "  First deploy detected, seeding database..."
  npx tsx src/lib/seed.ts --prod
  echo "[OK] Database seeded (admin / admin123)"
else
  echo "[OK] Database has $USER_COUNT user(s), seed skipped"
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
systemctl start pa-notas
echo "[OK] Service started"
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
  echo "[OK] Caddy configured for $DOMAIN (auto HTTPS)"
else
  cat > /etc/caddy/Caddyfile << CADDYEOF
:80 {
    reverse_proxy 127.0.0.1:$PORT
}
CADDYEOF
  echo "[OK] Caddy configured for HTTP on $SERVER_IP"
fi

systemctl reload caddy 2>/dev/null || systemctl restart caddy
echo ""

# Verify app is running
sleep 2
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:$PORT/login | grep -q "200"; then
  echo "[OK] App is responding"
else
  echo "[WARN] App may not be ready yet, check: systemctl status pa-notas"
fi
echo ""

# Summary
echo "============================================"
echo "  Deployment complete!"
echo ""
if [ -n "$DOMAIN" ]; then
  echo "  URL: https://$DOMAIN"
else
  echo "  URL: http://$SERVER_IP"
fi
echo ""
echo "  Commands:"
echo "    systemctl status pa-notas     # status"
echo "    systemctl restart pa-notas    # restart"
echo "    journalctl -u pa-notas -f     # system logs"
echo "    tail -f /opt/pa-notas/data/logs/app.log  # app logs"
echo "============================================"
