#!/bin/bash
set -e

# ============================================
#   PetroAlianza - Server Setup (one-time)
#   Sets up BOTH production and dev environments
#   Run on the Hetzner VPS as root
#   Usage: setup-server.sh <github-repo-url>
#   Example: setup-server.sh https://github.com/user/pa-notas.git
# ============================================

REPO_URL="${1:-}"
PROD_DIR="/opt/pa-notas"
DEV_DIR="/opt/pa-notas-dev"
APP_USER="pa-notas"
NODE_VERSION="24"
PROD_PORT=4321
DEV_PORT=4322
PROD_DOMAIN="petroalianza.duckdns.org"
DEV_DOMAIN="petroalianza-dev.duckdns.org"

if [ -z "$REPO_URL" ]; then
  echo "[ERROR] Usage: setup-server.sh <github-repo-url>"
  exit 1
fi

if [ "$EUID" -ne 0 ]; then
  echo "[ERROR] Run as root: sudo bash setup-server.sh <repo-url>"
  exit 1
fi

echo "============================================"
echo "  PetroAlianza - Server Setup"
echo "============================================"
echo ""

# 0. Prerequisites
echo "[0/7] Installing prerequisites..."
apt-get update -qq
apt-get install -y -qq unzip curl sqlite3 git > /dev/null
echo "[OK] Prerequisites ready"
echo ""

# 1. Install Node.js
echo "[1/7] Installing Node.js $NODE_VERSION..."
if ! command -v node &>/dev/null || [ "$(node -v | cut -d. -f1 | tr -d v)" -lt "$NODE_VERSION" ]; then
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  apt-get install -y nodejs
fi
echo "[OK] Node.js $(node -v)"
echo ""

# 2. Install Caddy
echo "[2/7] Installing Caddy..."
if ! command -v caddy &>/dev/null; then
  apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi
echo "[OK] Caddy installed"
echo ""

# 3. Create app user
echo "[3/7] Creating app user..."
id -u $APP_USER &>/dev/null || useradd --system --no-create-home --shell /bin/false $APP_USER
echo "[OK] User $APP_USER ready"
echo ""

# 4. Clone repos
echo "[4/7] Cloning repositories..."

setup_env() {
  local dir=$1
  local port=$2
  local db_name=$3

  if [ ! -d "$dir" ]; then
    git clone "$REPO_URL" "$dir"
  fi

  mkdir -p "$dir/data/logs"

  if [ ! -f "$dir/.env" ]; then
    JWT_SECRET=$(openssl rand -hex 64)
    cat > "$dir/.env" << ENVEOF
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=8h
DATABASE_URL=./data/$db_name.db
PORT=$port
NODE_ENV=production
ENVEOF
    echo "  Created $dir/.env (edit to add SMTP config)"
  fi

  cd "$dir"
  npm install
  npx drizzle-kit push --force 2>/dev/null || true
  npm run build
  chown -R $APP_USER:$APP_USER "$dir"
}

setup_env "$PROD_DIR" "$PROD_PORT" "petroalianza"
echo "[OK] Production cloned and built"

cd /
git clone "$REPO_URL" "$DEV_DIR" 2>/dev/null || true
cd "$DEV_DIR"
git checkout develop
setup_env "$DEV_DIR" "$DEV_PORT" "petroalianza-dev"
echo "[OK] Dev cloned and built"
echo ""

# 5. Systemd services
echo "[5/7] Creating systemd services..."

cat > /etc/systemd/system/pa-notas.service << 'EOF'
[Unit]
Description=PetroAlianza Notas (Production)
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

cat > /etc/systemd/system/pa-notas-dev.service << 'EOF'
[Unit]
Description=PetroAlianza Notas (Development)
After=network.target

[Service]
Type=simple
User=pa-notas
Group=pa-notas
WorkingDirectory=/opt/pa-notas-dev
ExecStart=/usr/bin/node dist/server/entry.mjs
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=4322

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable pa-notas pa-notas-dev
systemctl start pa-notas pa-notas-dev
echo "[OK] Both services started"
echo ""

# 6. Caddy
echo "[6/7] Configuring Caddy..."
cat > /etc/caddy/Caddyfile << CADDYEOF
$PROD_DOMAIN {
    reverse_proxy 127.0.0.1:$PROD_PORT {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}

$DEV_DOMAIN {
    reverse_proxy 127.0.0.1:$DEV_PORT {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-Proto {scheme}
    }
}
CADDYEOF

systemctl reload caddy 2>/dev/null || systemctl restart caddy
echo "[OK] Caddy configured for both domains"
echo ""

# 7. Deploy key setup hint
echo "[7/7] GitHub Actions setup..."
echo ""
echo "  To enable automated deploys, add these GitHub secrets:"
echo ""
echo "    SSH_HOST       = $(curl -4 -s ifconfig.me 2>/dev/null || echo '<server-ip>')"
echo "    SSH_USER       = root"
echo "    SSH_PRIVATE_KEY = (paste your SSH private key)"
echo ""
echo "  Generate a deploy key on the server:"
echo "    ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ''"
echo "    cat ~/.ssh/deploy_key        # copy to GitHub secret SSH_PRIVATE_KEY"
echo "    cat ~/.ssh/deploy_key.pub    # add to GitHub repo Deploy Keys"
echo ""

# Summary
echo "============================================"
echo "  Setup complete!"
echo ""
echo "  Production: https://$PROD_DOMAIN (port $PROD_PORT)"
echo "  Dev:        https://$DEV_DOMAIN (port $DEV_PORT)"
echo ""
echo "  Commands:"
echo "    systemctl status pa-notas       # prod status"
echo "    systemctl status pa-notas-dev   # dev status"
echo "    journalctl -u pa-notas -f       # prod logs"
echo "    journalctl -u pa-notas-dev -f   # dev logs"
echo "============================================"
