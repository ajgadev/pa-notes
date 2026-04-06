# Prompt para Claude Code — Sistema de Notas de Salida · PetroAlianza

> Copia y pega este prompt completo en Claude Code para construir el sistema desde cero.

---

## Antes de comenzar — Instalar skills recomendados

Ejecuta estos comandos en Claude Code antes de iniciar el proyecto para cargar los skills pertinentes del repositorio `secondsky/claude-skills`:

```bash
# Agregar el marketplace
/plugin marketplace add https://github.com/secondsky/claude-skills

# Tailwind v4 + shadcn/ui (evita errores de tw-animate-css, incluye dark mode, config Vite 8)
/plugin install tailwind-v4-shadcn@claude-skills

# Drizzle ORM (schema, migraciones, queries type-safe con SQLite)
/plugin install drizzle-orm-d1@claude-skills

# Vitest (unit + integration testing)
/plugin install vitest-testing@claude-skills

# Playwright (end-to-end testing)
/plugin install playwright-testing@claude-skills

# CSRF protection
/plugin install csrf-protection@claude-skills

# RBAC (control de acceso basado en roles admin/operador)
/plugin install access-control-rbac@claude-skills
```

Si el marketplace no está disponible, instalar manualmente:
```bash
git clone https://github.com/secondsky/claude-skills.git
cd claude-skills
./scripts/install-skill.sh tailwind-v4-shadcn
./scripts/install-skill.sh vitest-testing
./scripts/install-skill.sh playwright-testing
./scripts/install-skill.sh csrf-protection
./scripts/install-skill.sh access-control-rbac
```

---

## Contexto del proyecto

Construye un sistema web interno llamado **PetroAlianza FO-SF-001** para digitalizar el proceso de **Autorización de Salida de Materiales y/o Equipos** de la empresa Petro Alianza, ubicada en El Tigre, Anzoátegui, Venezuela.

Reemplaza un formulario físico (FO-SF-001 REV.3) llenado a mano. El sistema debe correr inicialmente en una **PC Windows sin conexión a internet** (modo local), con arquitectura que permita migración futura a un servidor.

---

## Identidad visual — Colores corporativos

| Color | Hex | Uso |
|-------|-----|-----|
| Blanco | `#FFFFFF` | Fondos principales, texto sobre oscuro |
| Negro | `#000000` | Texto "Petro" sobre fondo claro |
| Naranja | `#FF6101` | Texto "Alianza" (siempre), botones primarios, títulos de sección, acentos, tabs activos |
| Azul oscuro | `#191825` | Topbar, sidebar, cabeceras de tabla, fondos secundarios |

### Reglas de logo
- **"Petro"** → negro sobre fondo claro, blanco sobre fondo oscuro
- **"Alianza"** → siempre naranja `#FF6101`, sin excepción
- Botones primarios → fondo naranja `#FF6101`, texto blanco
- Topbar/sidebar → fondo `#191825`, textos blancos, acentos naranja

Configurar en Tailwind:
```js
// tailwind.config.mjs
theme: {
  extend: {
    colors: {
      'pa-orange': '#FF6101',
      'pa-dark':   '#191825',
    }
  }
}
```

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Runtime | Node.js "Krypton" LTS | **v24.14.1** |
| Framework web | Astro SSR (`output: 'server'`) | latest 4.x |
| Bundler | **Vite 8** (Rolldown-powered, hasta 10-30x más rápido) | **8.x** |
| UI | Tailwind CSS **v4** + shadcn/ui | latest |
| API | Astro API Routes (`src/pages/api/`) | — |
| Base de datos | SQLite (archivo único `data/petroalianza.db`) | — |
| Driver | `better-sqlite3` | latest |
| ORM | Drizzle ORM | latest |
| Auth | JWT en cookie httpOnly + bcrypt | — |
| PDF | jsPDF (cliente) | latest |
| CSV | papaparse (cliente) | latest |
| Unit/Integration tests | **Vitest** | latest |
| E2E tests | **Playwright** (Chromium) | latest |
| Linter/Formatter | ESLint + Prettier | latest |
| Adapter Astro | `@astrojs/node` standalone | latest |

> **Nota Vite 8**: usa el skill `tailwind-v4-shadcn` para la configuración correcta de `vite.config.ts` compatible con Vite 8 + Rolldown.

---

## Roles de usuario

| Rol | Permisos |
|-----|----------|
| `admin` | Acceso total. CRUD de usuarios, departamentos, vehículos, personal, configuración del sistema |
| `operador` | Crear, editar y exportar sus notas. Ver registro completo. Sin acceso a administración |

---

## Base de datos — Schema Drizzle (SQLite)

### `users`
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
username    TEXT UNIQUE NOT NULL
password    TEXT NOT NULL              -- bcrypt hash
role        TEXT NOT NULL DEFAULT 'operador'
active      INTEGER NOT NULL DEFAULT 1
created_at  TEXT NOT NULL DEFAULT (datetime('now'))
```

### `profiles`
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE
nombre      TEXT NOT NULL DEFAULT ''
apellido    TEXT NOT NULL DEFAULT ''
ci          TEXT NOT NULL DEFAULT ''
updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
```

### `departments`
```sql
id      INTEGER PRIMARY KEY AUTOINCREMENT
name    TEXT UNIQUE NOT NULL
active  INTEGER NOT NULL DEFAULT 1
```

### `vehicles`
```sql
id      INTEGER PRIMARY KEY AUTOINCREMENT
placa   TEXT UNIQUE NOT NULL
marca   TEXT NOT NULL
modelo  TEXT NOT NULL
active  INTEGER NOT NULL DEFAULT 1
```

### `personal`
```sql
id       INTEGER PRIMARY KEY AUTOINCREMENT
ci       TEXT UNIQUE NOT NULL
nombre   TEXT NOT NULL
apellido TEXT NOT NULL DEFAULT ''
cargo    TEXT NOT NULL DEFAULT ''
active   INTEGER NOT NULL DEFAULT 1
```

### `notas`
```sql
id            INTEGER PRIMARY KEY AUTOINCREMENT
numero        INTEGER UNIQUE NOT NULL
estado        TEXT NOT NULL DEFAULT 'Vigente'  -- 'Vigente' | 'Nula'
departamento  TEXT DEFAULT ''
fecha         TEXT DEFAULT NULL               -- opcional, YYYY-MM-DD
empresa       TEXT NOT NULL DEFAULT 'Petro Alianza'
base          TEXT NOT NULL DEFAULT 'Oriente'
pozo          TEXT DEFAULT ''
taladro       TEXT DEFAULT ''
tipo_salida   TEXT NOT NULL
solicitante   TEXT NOT NULL
destino       TEXT NOT NULL
v_placa       TEXT DEFAULT ''
v_marca       TEXT DEFAULT ''
v_modelo      TEXT DEFAULT ''
c_nombre      TEXT DEFAULT ''
c_ci          TEXT DEFAULT ''
g_nombre      TEXT DEFAULT ''
g_ci          TEXT DEFAULT ''
s_nombre      TEXT DEFAULT ''
s_ci          TEXT DEFAULT ''
elab_nombre   TEXT DEFAULT ''
elab_ci       TEXT DEFAULT ''
apro_nombre   TEXT DEFAULT ''
apro_ci       TEXT DEFAULT ''
creado_por    INTEGER NOT NULL REFERENCES users(id)
created_at    TEXT NOT NULL DEFAULT (datetime('now'))
updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
```

### `nota_items`
```sql
id          INTEGER PRIMARY KEY AUTOINCREMENT
nota_id     INTEGER NOT NULL REFERENCES notas(id) ON DELETE CASCADE
orden       INTEGER NOT NULL
no_parte    TEXT DEFAULT ''
unidad      INTEGER NOT NULL DEFAULT 1   -- entero positivo
cantidad    INTEGER NOT NULL DEFAULT 1   -- entero positivo
descripcion TEXT NOT NULL
no_serial   TEXT DEFAULT ''
```

### `config`
```sql
key    TEXT PRIMARY KEY
value  TEXT NOT NULL
```
Valores iniciales: `nota_counter = '1'`, `company_name = 'Petro Alianza'`

---

## Rutas del sistema

### Públicas
- `GET /` → redirige a `/login`
- `GET /login`
- `GET /login/recuperar` — solicitar token de recuperación
- `GET /login/recuperar/[token]` — establecer nueva contraseña
- `POST /api/auth/login|logout|reset-request|reset-password`

### Protegidas (JWT válido)
- `GET /dashboard`
- `GET /notas` — registro paginado
- `GET /notas/nueva`
- `GET /notas/[id]/editar`
- `GET /perfil`
- API: `/api/notas`, `/api/notas/[id]`, `/api/notas/[id]/estado`, `/api/perfil`, `/api/auth/change-password`

### Solo admin
- `GET /admin/usuarios|departamentos|vehiculos|personal|configuracion`
- API: `/api/usuarios`, `/api/departamentos`, `/api/vehiculos`, `/api/vehiculos/import-csv`, `/api/personal`, `/api/personal/import-csv`, `/api/config`

---

## Funcionalidades detalladas

### Formulario de nota (FO-SF-001 REV.3)

Réplica fiel del formulario físico oficial de Petro Alianza.

**Cabecera:**
- **Departamento** → searchable dropdown desde `departments`
- **Fecha** → date input, completamente **opcional**, puede quedar vacío
- **Empresa** → texto editable, default "Petro Alianza", botón × para limpiar
- **Base** → texto editable, default "Oriente", botón × para limpiar
- **Pozo / Taladro Gabarra** → texto libre + botón ×
- **Tipo de salida** → radio: Con Retorno | Sin Retorno | Inspección | Alquiler | Otros. Al elegir "Otros" aparece input de texto libre adicional
- **Solicitado por / Razón y Destino** → texto libre + botón ×

> **Todos los inputs de texto tienen botón × al final para limpiar el valor.**

**Tabla de ítems:**
- Columnas: Item (auto-índice), N° de Parte, Unidad (entero positivo), Cantidad (entero positivo), Descripción, N° de Serial
- Botón "+ Agregar ítem" | botón × por fila para eliminar

**Vehículo:**
- **Placa** → searchable dropdown desde `vehicles`. Al seleccionar autocompleta Marca y Modelo
- **Marca / Modelo** → campos editables (con botón ×), no bloqueados

**Firmas (4 columnas):**
- Conductor: Nombre + C.I.
- Gerente General: Nombre + C.I.
- Seguridad Física: Nombre + C.I.
- Elaborado/Aprobado: Elaborado por + C.I. | Aprobado por + C.I.

**Todos los campos C.I.** son searchable dropdowns que buscan en `personal` por C.I. o nombre. Al seleccionar, autocompletan el Nombre del mismo bloque. El Nombre queda editable.

**Autocompletado al abrir nota nueva:** "Elaborado por" y "C.I. Elaborado" se precargan con el perfil del usuario autenticado.

### Numeración de notas

- Número tomado de `nota_counter` en `config`
- Al guardar con éxito → `nota_counter` se incrementa en 1 (transacción SQLite atómica)
- Solo el admin puede modificar `nota_counter` desde `/admin/configuracion`
- Requiere **dos confirmaciones modales**:
  1. "¿Está seguro? Esta acción puede generar números duplicados."
  2. "Escriba el nuevo número y confirme. Esta acción no se puede deshacer."
- Validar que el nuevo número no colisione con una nota existente

### Estados de notas

- **Vigente**: normal
- **Nula**: tachada en la lista. PDF con marca de agua "NULA" diagonal roja al 15% de opacidad. Solo admin puede anular/restaurar.

### Exportación PDF (jsPDF, cliente)

- A4 horizontal (landscape)
- Réplica visual del FO-SF-001 REV.3
- Logo: "**Petro**" negro/blanco según fondo + "**Alianza**" naranja `#FF6101`
- N° de nota prominente con fondo `#191825`
- Tabla de ítems con filas alternadas
- Sección de firmas con líneas y bloques nombre/C.I.
- Footer: fecha de generación + usuario
- Notas nulas: marca de agua diagonal "NULA", roja, 15% opacidad

### Gestión de usuarios (admin)

Pantalla `/admin/usuarios`:
- Tabla: Usuario, Nombre, Rol, Estado, Token activo (si lo hay), Acciones
- Crear: username, contraseña temporal, rol, datos de perfil
- Editar: cambiar rol, activar/desactivar
- **Sin eliminación** (solo desactivar — integridad histórica)
- Reset de contraseña por admin → genera contraseña temporal que el usuario debe cambiar al primer login

### Gestión de contraseñas

**Cambio normal** (en `/perfil`): contraseña actual + nueva + confirmar

**Recuperación offline** (sin email):
1. `/login/recuperar` → ingresa username
2. Sistema genera token de 6 dígitos, expira en 30 min, guardado en `config` como `reset_token_<username>` y `reset_token_expiry_<username>`
3. Admin ve el token en `/admin/usuarios` → columna "Token activo"
4. Admin comunica el token al usuario en persona o por teléfono
5. Usuario va a `/login/recuperar/[token]` e ingresa nueva contraseña

### Paneles admin

#### `/admin/departamentos`
- CRUD: nombre, toggle activo/inactivo, búsqueda en tiempo real

#### `/admin/vehiculos`
- CRUD + toggle activo/inactivo
- **Importación CSV**: modal con preview de 5 primeros registros, estadísticas (X a importar, Y duplicados ignorados), confirmar
  - Formato: `placa,marca,modelo` (header opcional)
- Descarga de plantilla CSV de ejemplo

#### `/admin/personal`
- CRUD + toggle activo/inactivo
- **Importación CSV** igual que vehículos
  - Formato: `ci,nombre,apellido,cargo`
- Descarga de plantilla CSV de ejemplo

#### `/admin/configuracion`
- Editar `company_name`
- Ajustar `nota_counter` con doble confirmación + validación de colisión
- Info del sistema: versión, ruta BD, total de notas

---

## Testing

### Estrategia — tres niveles desde el inicio

#### Unit tests — Vitest

Cubrir mínimo en `src/lib/`:
- `auth.ts`: `hashPassword`, `verifyPassword`, `createToken`, `verifyToken`, `generateResetToken`
- `db.ts`: helpers de acceso a datos (SQLite en memoria para tests)
- Lógica del contador de notas (atomicidad, detección de colisiones)
- Validaciones de formulario (campos requeridos, enteros positivos, formato C.I.)
- Utilidades de CSV y PDF

Coverage mínimo objetivo: **80%** en `src/lib/`

```bash
npm run test           # una vez
npm run test:watch     # modo watch
npm run test:coverage  # con reporte de coverage
```

#### Integration tests — Vitest

Endpoints de API críticos:
- `POST /api/auth/login` → credenciales correctas, incorrectas, usuario inactivo
- `POST /api/notas` → crear nota, validaciones, incremento del contador
- `PUT /api/notas/[id]/estado` → solo admin puede anular
- `POST /api/vehiculos/import-csv` → formato válido, duplicados, formato inválido
- `PUT /api/config` → solo admin, doble confirmación del contador

#### E2E tests — Playwright (Chromium)

```
tests/e2e/
├── auth.spec.ts              -- login, logout, recuperación de contraseña
├── nota-nueva.spec.ts        -- crear nota completa, autocomplete, exportar PDF
├── nota-anular.spec.ts       -- anular y restaurar (solo admin)
├── admin-usuarios.spec.ts    -- CRUD usuarios, reset contraseña, ver token
├── admin-vehiculos.spec.ts   -- CRUD + importación CSV
├── admin-personal.spec.ts    -- CRUD + importación CSV
└── contador-notas.spec.ts    -- ajuste del contador, doble confirmación, colisión
```

```bash
npm run test:e2e       # headless
npm run test:e2e:ui    # con UI de Playwright
```

#### CI local para Windows — `check.bat`

```bat
@echo off
echo Ejecutando checks...
call npm run lint
if errorlevel 1 ( echo FALLO: lint & pause & exit /b 1 )
call npm run test:coverage
if errorlevel 1 ( echo FALLO: tests & pause & exit /b 1 )
call npm run build
if errorlevel 1 ( echo FALLO: build & pause & exit /b 1 )
echo.
echo Todos los checks pasaron correctamente.
pause
```

---

## Estructura del proyecto

```
petroalianza-notas/
├── src/
│   ├── pages/
│   │   ├── index.astro
│   │   ├── login.astro
│   │   ├── login/recuperar/
│   │   │   ├── index.astro
│   │   │   └── [token].astro
│   │   ├── dashboard.astro
│   │   ├── perfil.astro
│   │   ├── notas/
│   │   │   ├── index.astro
│   │   │   ├── nueva.astro
│   │   │   └── [id]/editar.astro
│   │   ├── admin/
│   │   │   ├── usuarios.astro
│   │   │   ├── departamentos.astro
│   │   │   ├── vehiculos.astro
│   │   │   ├── personal.astro
│   │   │   └── configuracion.astro
│   │   └── api/
│   │       ├── auth/{login,logout,change-password,reset-request,reset-password}.ts
│   │       ├── notas/{index.ts, [id]/{index.ts, estado.ts}}
│   │       ├── departamentos/index.ts
│   │       ├── vehiculos/{index.ts, import-csv.ts}
│   │       ├── personal/{index.ts, import-csv.ts}
│   │       ├── usuarios/index.ts
│   │       ├── perfil/index.ts
│   │       └── config/index.ts
│   ├── components/
│   │   ├── ui/                   ← shadcn/ui components
│   │   ├── NotaForm.tsx
│   │   ├── SearchableDropdown.tsx
│   │   ├── ClearableInput.tsx
│   │   ├── ItemsTable.tsx
│   │   ├── NotasList.tsx
│   │   ├── CsvImportModal.tsx
│   │   └── PdfExporter.tsx
│   ├── lib/
│   │   ├── db.ts
│   │   ├── schema.ts
│   │   ├── auth.ts
│   │   ├── middleware.ts
│   │   └── seed.ts
│   └── styles/globals.css
├── tests/
│   ├── unit/
│   │   ├── auth.test.ts
│   │   ├── db-helpers.test.ts
│   │   ├── nota-counter.test.ts
│   │   └── validations.test.ts
│   ├── integration/
│   │   ├── api-auth.test.ts
│   │   ├── api-notas.test.ts
│   │   ├── api-vehiculos.test.ts
│   │   └── api-config.test.ts
│   └── e2e/
│       ├── auth.spec.ts
│       ├── nota-nueva.spec.ts
│       ├── nota-anular.spec.ts
│       ├── admin-usuarios.spec.ts
│       ├── admin-vehiculos.spec.ts
│       ├── admin-personal.spec.ts
│       └── contador-notas.spec.ts
├── scripts/
│   ├── setup.bat         ← Setup Windows con auto-instalación de Node 24
│   ├── setup.sh          ← Setup Linux/servidor
│   ├── start.bat         ← Arrancar el sistema
│   ├── backup-db.bat
│   ├── backup-db.sh
│   ├── migrate-db.sh
│   └── check.bat         ← CI local Windows
├── data/
│   └── petroalianza.db   ← gitignored
├── astro.config.mjs
├── tailwind.config.mjs
├── drizzle.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── package.json
├── .env
├── .env.example
└── README.md
```

---

## Scripts de instalación

### `scripts/setup.bat` — Windows con auto-instalación de Node.js

> **Debe ejecutarse como Administrador** (clic derecho → "Ejecutar como administrador")

```bat
@echo off
:: Verificar permisos de administrador
net session >nul 2>&1
if errorlevel 1 (
    echo ERROR: Este script requiere permisos de Administrador.
    echo Haz clic derecho en setup.bat y elige "Ejecutar como administrador".
    pause
    exit /b 1
)

echo ================================================
echo   PetroAlianza FO-SF-001 - Instalacion inicial
echo   Node.js v24.14.1  ^|  Vite 8  ^|  SQLite
echo ================================================
echo.

:: ─── PASO 1: Verificar / Instalar Node.js v24 ────────────
echo [1/5] Verificando Node.js v24...
set NODE_REQUIRED=24
set NODE_MSI_URL=https://nodejs.org/dist/v24.14.1/node-v24.14.1-x64.msi
set NODE_MSI_TMP=%TEMP%\node-v24.14.1-x64.msi

node --version >nul 2>&1
if errorlevel 1 goto :instalar_node

for /f "tokens=1 delims=." %%v in ('node --version') do set NODE_MAJOR=%%v
set NODE_MAJOR=%NODE_MAJOR:v=%
if %NODE_MAJOR% LSS %NODE_REQUIRED% (
    echo     Version actual insuficiente. Actualizando a v24.14.1...
    goto :instalar_node
)
echo     Node.js ya esta en version correcta:
node --version
goto :node_ok

:instalar_node
echo     Instalando Node.js v24.14.1...

:: Intentar con winget (Windows 10 21H1+ / Windows 11)
winget --version >nul 2>&1
if not errorlevel 1 (
    echo     Intentando via winget...
    winget install --id OpenJS.NodeJS.LTS --version 24.14.1 --silent --accept-package-agreements --accept-source-agreements
    if not errorlevel 1 (
        set "PATH=%ProgramFiles%\nodejs;%PATH%"
        goto :node_ok
    )
    echo     winget no pudo instalar. Intentando descarga directa...
)

:: Descarga directa del instalador MSI
echo     Descargando desde nodejs.org (puede tardar unos minutos)...
powershell -NoProfile -Command ^
  "[Net.ServicePointManager]::SecurityProtocol = 'Tls12'; Invoke-WebRequest -Uri '%NODE_MSI_URL%' -OutFile '%NODE_MSI_TMP%' -UseBasicParsing"
if errorlevel 1 (
    echo.
    echo ERROR: No se pudo descargar Node.js.
    echo Descargalo manualmente desde: https://nodejs.org/dist/v24.14.1/node-v24.14.1-x64.msi
    echo Instalalo y vuelve a ejecutar este script.
    pause
    exit /b 1
)

echo     Instalando Node.js...
msiexec /i "%NODE_MSI_TMP%" /qn /norestart
if errorlevel 1 (
    echo ERROR: Fallo la instalacion del MSI.
    del "%NODE_MSI_TMP%" >nul 2>&1
    pause
    exit /b 1
)
del "%NODE_MSI_TMP%" >nul 2>&1
set "PATH=%ProgramFiles%\nodejs;%PATH%"

:node_ok
echo     OK: Node.js
node --version
echo.

:: ─── PASO 2: Dependencias npm ────────────────────────────
echo [2/5] Instalando dependencias npm...
call npm install
if errorlevel 1 ( echo ERROR: npm install fallo. & pause & exit /b 1 )
echo.

:: ─── PASO 3: Base de datos ───────────────────────────────
echo [3/5] Creando base de datos SQLite...
if not exist data mkdir data
call npm run db:push
if errorlevel 1 ( echo ERROR: db:push fallo. & pause & exit /b 1 )
echo.

:: ─── PASO 4: Seed inicial ────────────────────────────────
echo [4/5] Cargando datos iniciales...
call npm run db:seed
if errorlevel 1 ( echo ERROR: db:seed fallo. & pause & exit /b 1 )
echo.

:: ─── PASO 5: Build de produccion ─────────────────────────
echo [5/5] Compilando el proyecto...
call npm run build
if errorlevel 1 ( echo ERROR: build fallo. & pause & exit /b 1 )
echo.

echo ================================================
echo   INSTALACION COMPLETADA
echo.
echo   Para iniciar el sistema:
echo     ^> Doble click en start.bat
echo   O desde consola:
echo     ^> node dist/server/entry.mjs
echo.
echo   Acceso: http://localhost:4321
echo.
echo   Usuarios por defecto:
echo     admin    / admin123  (administrador)
echo     operador / op123     (operador)
echo.
echo   IMPORTANTE: Cambia las contrasenas al
echo   primer inicio de sesion.
echo ================================================
pause
```

### `scripts/setup.sh` — Linux / Servidor

```bash
#!/bin/bash
set -e
NODE_REQUIRED=24

echo "=== PetroAlianza FO-SF-001 - Setup Linux/Servidor ==="
echo "Node requerido: v${NODE_REQUIRED}+"

# Verificar o instalar Node.js v24
if ! command -v node &>/dev/null; then
    INSTALLED_MAJOR=0
else
    INSTALLED_MAJOR=$(node --version | cut -d. -f1 | tr -d 'v')
fi

if [ "$INSTALLED_MAJOR" -lt "$NODE_REQUIRED" ]; then
    echo "[1/5] Instalando Node.js v24..."
    if command -v apt-get &>/dev/null; then
        curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
        sudo apt-get install -y nodejs
    elif command -v dnf &>/dev/null; then
        curl -fsSL https://rpm.nodesource.com/setup_24.x | sudo bash -
        sudo dnf install -y nodejs
    else
        echo "ERROR: No se puede instalar automaticamente. Instala Node.js v24 manualmente."
        exit 1
    fi
else
    echo "[1/5] Node.js ya instalado: $(node --version)"
fi

echo "[2/5] Instalando dependencias..."
npm install

echo "[3/5] Creando base de datos..."
mkdir -p data
npm run db:push

echo "[4/5] Seed inicial..."
npm run db:seed

echo "[5/5] Build de produccion..."
npm run build

echo ""
echo "=== Setup completado ==="
echo "Iniciar: node dist/server/entry.mjs"
echo "  o con PM2: pm2 start dist/server/entry.mjs --name petroalianza"
echo "Usuarios: admin / admin123 | operador / op123"
```

### `start.bat`

```bat
@echo off
echo Iniciando PetroAlianza FO-SF-001...
echo Accede desde: http://localhost:4321
echo Cierra esta ventana para detener el servidor.
echo.
start "" http://localhost:4321
node dist/server/entry.mjs
```

### `scripts/backup-db.bat`

```bat
@echo off
:: Formato de fecha YYYY-MM-DD compatible con todos los Windows
for /f "tokens=2 delims==" %%a in ('wmic os get localdatetime /value') do set DT=%%a
set FECHA=%DT:~0,4%-%DT:~4,2%-%DT:~6,2%_%DT:~8,2%-%DT:~10,2%
if not exist backups mkdir backups
set DEST=backups\petroalianza_%FECHA%.db
copy data\petroalianza.db "%DEST%"
echo Backup guardado: %DEST%
pause
```

### `scripts/backup-db.sh`

```bash
#!/bin/bash
mkdir -p backups
DEST="backups/petroalianza_$(date +%Y-%m-%d_%H-%M).db"
cp data/petroalianza.db "$DEST"
echo "Backup: $DEST"
```

### `scripts/migrate-db.sh`

```bash
#!/bin/bash
# Copiar BD SQLite de la PC local al servidor remoto
# Uso: ./migrate-db.sh usuario@ip.servidor:/ruta/app/data/
if [ -z "$1" ]; then
    echo "Uso: ./migrate-db.sh usuario@ip:/ruta/destino/"
    exit 1
fi
BACKUP="data/petroalianza_pre_migrate_$(date +%Y%m%d_%H%M%S).db"
echo "Backup local: $BACKUP"
cp data/petroalianza.db "$BACKUP"
echo "Copiando al servidor: $1"
scp data/petroalianza.db "$1"
echo "Listo. Reinicia el servidor en el destino con: pm2 restart petroalianza"
```

---

## Variables de entorno

### `.env.example`
```env
# Generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=cambia_esto_por_una_clave_segura_aleatoria_minimo_64_chars

# Duración de sesión JWT
JWT_EXPIRES_IN=8h

# Ruta de la base de datos SQLite
DATABASE_URL=./data/petroalianza.db

# Puerto del servidor
PORT=4321

# Entorno (development | production)
NODE_ENV=production
```

---

## `package.json` — Scripts

```json
{
  "scripts": {
    "dev":           "astro dev",
    "build":         "astro build",
    "start":         "node dist/server/entry.mjs",
    "preview":       "astro preview",
    "db:push":       "drizzle-kit push",
    "db:seed":       "tsx src/lib/seed.ts",
    "db:studio":     "drizzle-kit studio",
    "db:migrate":    "drizzle-kit migrate",
    "test":          "vitest run",
    "test:watch":    "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e":      "playwright test",
    "test:e2e:ui":   "playwright test --ui",
    "lint":          "eslint src --ext .ts,.tsx,.astro",
    "format":        "prettier --write src",
    "ci":            "npm run lint && npm run test:coverage && npm run build"
  },
  "engines": {
    "node": ">=24.0.0"
  }
}
```

---

## Seed inicial (`src/lib/seed.ts`)

El seed debe ser **idempotente** (no duplica si ya existe). Crear:
- Usuario `admin` / `admin123` (bcrypt 12 rounds, rol `admin`)
- Usuario `operador` / `op123` (rol `operador`)
- Departamentos: Operaciones, Mantenimiento, Seguridad Industrial, Logística, Administración, Ingeniería, Almacén
- Config: `nota_counter = '1'`, `company_name = 'Petro Alianza'`
- 5 personas de ejemplo en `personal` con C.I., nombre, apellido y cargo
- 5 vehículos de ejemplo en `vehicles` con placa, marca y modelo

---

## Detalles de implementación importantes

### Atomicidad del contador de notas

```typescript
const createNota = db.transaction((data: NotaData) => {
  const row = db.prepare(
    "SELECT value FROM config WHERE key = 'nota_counter'"
  ).get() as { value: string };
  const numero = parseInt(row.value, 10);
  db.prepare(
    "UPDATE config SET value = ? WHERE key = 'nota_counter'"
  ).run(String(numero + 1));
  const result = db.prepare("INSERT INTO notas (...) VALUES (...)").run({
    ...data, numero
  });
  return result;
});
```

### Seguridad

- bcrypt salt rounds: 12
- JWT en cookie httpOnly, SameSite=Strict
- Validación de inputs en el servidor (zod recomendado)
- Middleware de rol en todos los endpoints `/api/admin/*` y páginas `/admin/*`
- Sanitización básica de strings antes de SQLite

### `README.md` — debe incluir

1. Requisitos (Windows 10/11, permisos admin para instalación)
2. Instalación: "Doble click en setup.bat como Administrador"
3. Cómo arrancar el sistema
4. Tabla de usuarios por defecto + cómo cambiar contraseñas
5. Cómo hacer backup manual de la BD
6. Cómo migrar al servidor cuando llegue el momento
7. FAQ: puerto 4321 ocupado, cómo reiniciar si algo falla, dónde está la BD

---

## Orden de construcción recomendado

1. Config base: Astro + Vite 8 + Tailwind v4 + shadcn/ui con colores Petro Alianza
2. Schema Drizzle + better-sqlite3 + seed idempotente
3. Auth: bcrypt, JWT, middleware, login/logout
4. Tests unitarios de `src/lib/` (TDD desde el principio)
5. Formulario de nota (componente principal)
6. API de notas (CRUD + contador atómico)
7. Exportación PDF fiel al FO-SF-001 REV.3
8. Registro de notas (lista paginada + filtros + anular/restaurar)
9. Perfil de usuario con autocompletado en nueva nota
10. Panel admin: usuarios + gestión de contraseñas + tokens de recuperación
11. Panel admin: departamentos, vehículos, personal (con CSV import)
12. `/admin/configuracion`: ajuste del contador con doble confirmación
13. Tests de integración (endpoints críticos)
14. Tests E2E con Playwright
15. Scripts de setup, backup y migración
16. README completo

---

*Prompt generado el 05/04/2026 · Sistema PetroAlianza FO-SF-001 · El Tigre, Anzoátegui, Venezuela*
*Node.js v24.14.1 "Krypton" · Vite 8 (Rolldown) · Astro SSR · SQLite + Drizzle ORM*
