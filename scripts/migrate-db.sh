#!/usr/bin/env bash
set -euo pipefail

echo "============================================"
echo "  PetroAlianza - Migrar BD a Servidor"
echo "============================================"
echo

if [ $# -lt 1 ]; then
    echo "Uso: $0 usuario@servidor:/ruta/destino"
    echo
    echo "Ejemplo:"
    echo "  $0 admin@192.168.1.100:/opt/pa-notas/data/"
    exit 1
fi

DEST="$1"
DB_FILE="data/petroalianza.db"

if [ ! -f "$DB_FILE" ]; then
    echo "[ERROR] No se encontró la base de datos en $DB_FILE"
    exit 1
fi

echo "Origen:  $DB_FILE"
echo "Destino: $DEST"
echo

read -p "¿Continuar? (s/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "Cancelado."
    exit 0
fi

# Copy with scp
scp "$DB_FILE" "$DEST"

echo
echo "[OK] Base de datos copiada a $DEST"
echo "Reinicie el servidor en el destino para usar la nueva BD."
