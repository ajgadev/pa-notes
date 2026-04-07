#!/usr/bin/env bash
set -euo pipefail

echo "============================================"
echo "  PetroAlianza - Actualizar Sistema"
echo "============================================"
echo
echo "  IMPORTANTE: Asegúrese de haber reemplazado"
echo "  los archivos del proyecto con la nueva"
echo "  versión ANTES de ejecutar este script."
echo
echo "  La carpeta data/ NO debe ser reemplazada"
echo "  (contiene la base de datos)."
echo
read -p "Presione Enter para continuar..."

echo
echo "[1/3] Instalando dependencias..."
npm install
echo "[OK] Dependencias instaladas."
echo

echo "[2/3] Actualizando base de datos..."
npm run db:push
echo "[OK] Base de datos actualizada."
echo

echo "[3/3] Compilando aplicación..."
npm run build
echo "[OK] Aplicación compilada."
echo

echo "============================================"
echo "  Actualización completada!"
echo
echo "  Ejecute ./scripts/start.sh para iniciar."
echo "============================================"
