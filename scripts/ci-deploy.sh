#!/bin/bash
set -e

# ============================================
#   PetroAlianza - CI Deploy (called by GitHub Actions)
#   Usage: ci-deploy.sh <prod|dev>
#   Runs on the server via SSH
# ============================================

ENV="${1:-}"

if [ "$ENV" = "prod" ]; then
  APP_DIR="/opt/pa-notas"
  SERVICE="pa-notas"
  BRANCH="main"
  PORT=4321
  DB_FILE="$APP_DIR/data/petroalianza.db"
elif [ "$ENV" = "dev" ]; then
  APP_DIR="/opt/pa-notas-dev"
  SERVICE="pa-notas-dev"
  BRANCH="develop"
  PORT=4322
  DB_FILE="$APP_DIR/data/petroalianza-dev.db"
else
  echo "[ERROR] Usage: ci-deploy.sh <prod|dev>"
  exit 1
fi

echo "=== Deploying $ENV ($BRANCH -> $APP_DIR) ==="

cd "$APP_DIR"

# 1. Pull latest code
echo "[1/5] Pulling latest $BRANCH..."
git fetch origin
git reset --hard "origin/$BRANCH"

# 2. Install dependencies
echo "[2/5] Installing dependencies..."
npm install --omit=dev

# 3. Run migrations
echo "[3/5] Running migrations..."
npx drizzle-kit push --force 2>/dev/null || true

if [ -f "$DB_FILE" ]; then
  sqlite3 "$DB_FILE" "ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;" 2>/dev/null || true
  sqlite3 "$DB_FILE" "ALTER TABLE users ADD COLUMN hidden INTEGER NOT NULL DEFAULT 0;" 2>/dev/null || true
  sqlite3 "$DB_FILE" "CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER, username TEXT NOT NULL, action TEXT NOT NULL, target TEXT, detail TEXT, ip TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));" 2>/dev/null || true
  sqlite3 "$DB_FILE" "ALTER TABLE notas ADD COLUMN signature_status TEXT NOT NULL DEFAULT 'borrador';" 2>/dev/null || true
  sqlite3 "$DB_FILE" "ALTER TABLE profiles ADD COLUMN saved_signature TEXT;" 2>/dev/null || true
  sqlite3 "$DB_FILE" "CREATE TABLE IF NOT EXISTS signatures (id INTEGER PRIMARY KEY AUTOINCREMENT, nota_id INTEGER NOT NULL REFERENCES notas(id) ON DELETE CASCADE, role TEXT NOT NULL, signed_by_name TEXT NOT NULL, signed_by_ci TEXT NOT NULL, signature_data TEXT NOT NULL, signed_at TEXT NOT NULL DEFAULT (datetime('now')), ip TEXT, token_id INTEGER, UNIQUE(nota_id, role));" 2>/dev/null || true
  sqlite3 "$DB_FILE" "CREATE TABLE IF NOT EXISTS signature_tokens (id INTEGER PRIMARY KEY AUTOINCREMENT, nota_id INTEGER NOT NULL REFERENCES notas(id) ON DELETE CASCADE, role TEXT NOT NULL, token TEXT UNIQUE NOT NULL, recipient_email TEXT NOT NULL DEFAULT '', recipient_name TEXT NOT NULL, expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));" 2>/dev/null || true
  sqlite3 "$DB_FILE" "CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, type TEXT NOT NULL, message TEXT NOT NULL, nota_id INTEGER, read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now')));" 2>/dev/null || true
  sqlite3 "$DB_FILE" "CREATE TABLE IF NOT EXISTS email_queue (id INTEGER PRIMARY KEY AUTOINCREMENT, to_address TEXT NOT NULL, subject TEXT NOT NULL, body_html TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, last_attempt TEXT, error TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now')));" 2>/dev/null || true
  sqlite3 "$DB_FILE" "ALTER TABLE signature_tokens ADD COLUMN recipient_ci TEXT NOT NULL DEFAULT '';" 2>/dev/null || true
fi

# 4. Seed on first deploy only
if [ ! -f "$DB_FILE" ]; then
  echo "[4/5] First deploy, seeding database..."
  npx tsx src/lib/seed.ts --prod
else
  USER_COUNT=$(sqlite3 "$DB_FILE" "SELECT count(*) FROM users;" 2>/dev/null || echo "0")
  if [ "$USER_COUNT" -eq 0 ]; then
    echo "[4/5] No users found, seeding database..."
    npx tsx src/lib/seed.ts --prod
  else
    echo "[4/5] Database has $USER_COUNT user(s), seed skipped"
  fi
fi

# 5. Build and restart
echo "[5/5] Building and restarting..."
npm run build
chown -R pa-notas:pa-notas "$APP_DIR"
systemctl restart "$SERVICE"

sleep 2
if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$PORT/login" | grep -q "200"; then
  echo "[OK] $ENV is responding on port $PORT"
else
  echo "[WARN] $ENV may not be ready yet — check: systemctl status $SERVICE"
  exit 1
fi

echo "=== Deploy $ENV complete ==="
