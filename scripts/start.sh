#!/usr/bin/env bash
set -euo pipefail

echo "============================================"
echo "  PetroAlianza - Iniciando Sistema"
echo "============================================"
echo

if [ ! -f "dist/server/entry.mjs" ]; then
    echo "[ERROR] La aplicación no está compilada."
    echo "Ejecute primero: ./scripts/setup.sh"
    exit 1
fi

echo "Iniciando servidor en http://localhost:4321"
echo "Presione Ctrl+C para detener."
echo

# Open browser (works on macOS and Linux with xdg-open)
(sleep 2 && (open http://localhost:4321 2>/dev/null || xdg-open http://localhost:4321 2>/dev/null || true)) &

node dist/server/entry.mjs
