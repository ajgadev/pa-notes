#!/usr/bin/env bash
set -euo pipefail

echo "============================================"
echo "  PetroAlianza - Backup de Base de Datos"
echo "============================================"
echo

DB_FILE="data/petroalianza.db"

if [ ! -f "$DB_FILE" ]; then
    echo "[ERROR] No se encontró la base de datos en $DB_FILE"
    exit 1
fi

mkdir -p backups

TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
BACKUP_FILE="backups/petroalianza_${TIMESTAMP}.db"

cp "$DB_FILE" "$BACKUP_FILE"

echo "[OK] Backup creado: $BACKUP_FILE"
echo "Tamaño: $(du -h "$BACKUP_FILE" | cut -f1)"
