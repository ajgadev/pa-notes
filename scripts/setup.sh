#!/usr/bin/env bash
set -euo pipefail

SEED_FLAGS=""
if [[ "${1:-}" == "--prod" ]]; then
    SEED_FLAGS="--prod"
fi

echo "============================================"
echo "  PetroAlianza - Instalación del Sistema"
echo "============================================"
echo

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js no está instalado."
    echo "Instale Node.js 22 LTS: https://nodejs.org/"
    exit 1
fi

NODE_MAJOR=$(node -v | cut -d. -f1 | tr -d 'v')
if [ "$NODE_MAJOR" -lt 22 ]; then
    echo "[ERROR] Se requiere Node.js 22 o superior. Versión actual: $(node -v)"
    exit 1
fi

echo "[OK] Node.js encontrado: $(node -v)"
echo

# Install dependencies
echo "Instalando dependencias..."
npm install
echo "[OK] Dependencias instaladas."
echo

# Create data directory
mkdir -p data

# Push database schema
echo "Creando base de datos..."
npm run db:push
echo "[OK] Base de datos creada."
echo

# Seed data
if [ -n "$SEED_FLAGS" ]; then
    echo "Cargando datos iniciales (producción - solo admin)..."
    echo "  Si tiene archivos CSV en data/ (departments.csv, vehicles.csv, personal.csv)"
    echo "  serán importados automáticamente."
else
    echo "Cargando datos iniciales (desarrollo - datos demo)..."
fi
npx tsx src/lib/seed.ts $SEED_FLAGS
echo "[OK] Datos iniciales cargados."
echo

# Build
echo "Compilando aplicación..."
npm run build
echo "[OK] Aplicación compilada."
echo

echo "============================================"
echo "  Instalación completada exitosamente!"
echo
echo "  Para iniciar el sistema ejecute:"
echo "    ./scripts/start.sh"
echo
if [ -n "$SEED_FLAGS" ]; then
    echo "  Usuario administrador:"
    echo "    admin / admin123"
else
    echo "  Usuarios por defecto:"
    echo "    admin / admin123"
    echo "    operador / op123"
fi
echo
echo "  IMPORTANTE: Cambie las contraseñas"
echo "  después del primer inicio de sesión."
echo "============================================"
