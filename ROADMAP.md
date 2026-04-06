# ROADMAP — PetroAlianza FO-SF-001

Sistema web interno para digitalizar el formulario de Autorización de Salida de Materiales y/o Equipos.

---

## Correcciones al prompt antes de comenzar

| Problema | Corrección |
|----------|-----------|
| Sección de `secondsky/claude-skills` plugins | Eliminar — no son funcionalidad real de Claude Code |
| `tailwind.config.mjs` con JS | Tailwind v4 usa config CSS en `globals.css` con `@theme` |
| Astro 4.x | Usar **Astro 5.x** (latest stable) |

---

## Fase 0 — Scaffolding y configuración base
> Estimado: sesión 1

- [x] Inicializar proyecto Astro 6 con `@astrojs/node` (SSR, standalone)
- [x] Instalar y configurar Tailwind CSS v4 + React
- [x] Definir colores corporativos (`pa-orange: #FF6101`, `pa-dark: #191825`) en CSS theme
- [ ] Configurar ESLint + Prettier
- [x] Crear `.env.example` y `.gitignore`
- [x] Estructura base de carpetas (`src/pages/`, `src/components/`, `src/lib/`, `data/`, `scripts/`, `tests/`)

---

## Fase 1 — Base de datos y seed
> Estimado: sesión 2

- [x] Instalar `better-sqlite3` + `drizzle-orm` + `drizzle-kit`
- [x] Crear schema Drizzle en `src/lib/schema.ts` (users, profiles, departments, vehicles, personal, notas, nota_items, config)
- [x] Configurar `drizzle.config.ts` apuntando a `data/petroalianza.db`
- [x] Crear seed idempotente en `src/lib/seed.ts` (admin, operador, departamentos, personal, vehículos, config)
- [x] Scripts npm: `db:push`, `db:seed`, `db:studio`
- [x] Verificar que `npm run db:push && npm run db:seed` funcionen limpiamente

---

## Fase 2 — Autenticación
> Estimado: sesión 3

- [x] `src/lib/auth.ts`: hashPassword, verifyPassword, createToken, verifyToken, generateResetToken (bcrypt 12 rounds, JWT httpOnly)
- [x] `src/lib/middleware.ts`: protección de rutas por JWT + verificación de rol
- [x] API endpoints: `POST /api/auth/login`, `POST /api/auth/logout`
- [x] API endpoint: `POST /api/auth/change-password`
- [x] Páginas: `/login`, redirect `/` → `/login`
- [x] Recuperación offline: `POST /api/auth/reset-request`, `POST /api/auth/reset-password`, páginas `/login/recuperar` y `/login/recuperar/[token]`
- [ ] **Unit tests** para `auth.ts` (hash, verify, token generation/validation)

---

## Fase 3 — Layout y navegación
> Estimado: sesión 4

- [x] Layout principal con topbar (`#191825`) y sidebar
- [x] Logo: "Petro" (blanco sobre oscuro) + "Alianza" (naranja siempre)
- [x] Navegación: Dashboard, Notas, Perfil, Admin (solo si admin)
- [x] Página `/dashboard` con resumen básico
- [x] Página `/perfil` con cambio de contraseña

---

## Fase 4 — Formulario de nota (componente principal)
> Estimado: sesiones 5-6

- [x] Componente `SearchableDropdown.tsx` (usado en departamento, vehículo, personal)
- [x] Componente `ClearableInput.tsx` (todos los inputs de texto con botón ×)
- [x] Componente `ItemsTable.tsx` (tabla dinámica de ítems con agregar/eliminar)
- [x] Componente `NotaForm.tsx` — réplica fiel del FO-SF-001 REV.3:
  - Cabecera: departamento, fecha (opcional), empresa, base, pozo, taladro, tipo de salida (radios), solicitante, destino
  - Tabla de ítems
  - Vehículo: placa (searchable → autocompleta marca/modelo)
  - Firmas: 4 columnas con C.I. searchable → autocompleta nombre
  - Precarga "Elaborado por" desde perfil del usuario
- [x] Página `/notas/nueva`

---

## Fase 5 — API de notas y CRUD
> Estimado: sesión 7

- [x] `POST /api/notas` — crear nota con contador atómico (transacción SQLite)
- [x] `GET /api/notas` — listar paginado con filtros
- [x] `GET /api/notas/[id]` — detalle
- [x] `PUT /api/notas/[id]` — editar nota
- [x] `PUT /api/notas/[id]/estado` — anular/restaurar (solo admin)
- [x] Página `/notas` — registro paginado con búsqueda
- [x] Página `/notas/[id]/editar`
- [x] Componente `NotasList.tsx` — tabla con estado Vigente/Nula (nulas tachadas)
- [ ] **Unit tests** para lógica del contador atómico y validaciones

---

## Fase 6 — Exportación PDF
> Estimado: sesión 8

- [x] Componente `PdfExporter.tsx` usando jsPDF
- [x] Layout A4 landscape, réplica visual del FO-SF-001 REV.3
- [x] Logo texto: "Petro" + "Alianza" (naranja)
- [x] N° de nota con fondo `#191825`
- [x] Tabla de ítems con filas alternadas
- [x] Sección de firmas con líneas
- [x] Footer: fecha generación + usuario
- [x] Marca de agua "NULA" diagonal roja al 15% opacidad para notas nulas

---

## Fase 7 — Panel de administración
> Estimado: sesiones 9-10

- [x] `/admin/usuarios` — tabla, crear (username + contraseña temporal + rol), editar, activar/desactivar (sin eliminar), reset contraseña, columna token activo
- [x] `/admin/departamentos` — CRUD con toggle activo/inactivo, búsqueda en tiempo real
- [x] `/admin/vehiculos` — CRUD + toggle + importación CSV con modal preview
- [x] `/admin/personal` — CRUD + toggle + importación CSV con modal preview
- [x] Componente CSV import integrado en `AdminCrud.tsx` — preview, estadísticas, confirmar
- [ ] Descarga de plantillas CSV de ejemplo
- [x] APIs: `/api/usuarios`, `/api/departamentos`, `/api/vehiculos`, `/api/vehiculos/import-csv`, `/api/personal`, `/api/personal/import-csv`

---

## Fase 8 — Configuración del sistema
> Estimado: sesión 11

- [x] `/admin/configuracion`:
  - Editar `company_name`
  - Ajustar `nota_counter` con doble confirmación + validación de colisión
  - Info del sistema (versión, ruta BD, total notas)
- [x] `GET/PUT /api/config` (solo admin)

---

## Fase 9 — Tests de integración
> Estimado: sesión 12

- [ ] Configurar Vitest (`vitest.config.ts`)
- [ ] `POST /api/auth/login` — credenciales correctas, incorrectas, usuario inactivo
- [ ] `POST /api/notas` — crear nota, validaciones, incremento del contador
- [ ] `PUT /api/notas/[id]/estado` — solo admin puede anular
- [ ] `POST /api/vehiculos/import-csv` — formato válido, duplicados, formato inválido
- [ ] `PUT /api/config` — solo admin, doble confirmación del contador
- [ ] Objetivo: **80% coverage** en `src/lib/`

---

## Fase 10 — Tests E2E
> Estimado: sesión 13

- [ ] Configurar Playwright (`playwright.config.ts`, solo Chromium)
- [ ] `auth.spec.ts` — login, logout, recuperación de contraseña
- [ ] `nota-nueva.spec.ts` — crear nota completa, autocomplete, exportar PDF
- [ ] `nota-anular.spec.ts` — anular y restaurar (solo admin)
- [ ] `admin-usuarios.spec.ts` — CRUD usuarios, reset contraseña, ver token
- [ ] `admin-vehiculos.spec.ts` — CRUD + importación CSV
- [ ] `admin-personal.spec.ts` — CRUD + importación CSV
- [ ] `contador-notas.spec.ts` — ajuste del contador, doble confirmación, colisión

---

## Fase 11 — Scripts y despliegue local
> Estimado: sesión 14

- [ ] `scripts/setup.bat` — instalación Windows (Node 22 LTS, npm install, db:push, db:seed, build)
- [ ] `scripts/setup.sh` — instalación Linux/servidor
- [ ] `scripts/start.bat` — arranca servidor + abre navegador
- [ ] `scripts/backup-db.bat` y `scripts/backup-db.sh`
- [ ] `scripts/migrate-db.sh` — copiar BD a servidor remoto
- [ ] `scripts/check.bat` — CI local (lint + test:coverage + build)

---

## Fase 12 — Documentación y cierre
> Estimado: sesión 15

- [ ] `README.md` completo:
  - Requisitos (Windows 10/11, Node 22)
  - Instalación (setup.bat como administrador)
  - Cómo arrancar
  - Usuarios por defecto + cambio de contraseñas
  - Backup manual de BD
  - Migración a servidor
  - FAQ (puerto ocupado, reiniciar, ubicación BD)
- [ ] Revisión final de seguridad (inputs validados con zod, sanitización, CSRF)
- [ ] Prueba completa end-to-end manual en Windows

---

## Futuro — Series de numeración

Reemplazar el sistema actual de prefijo+contador único por un CRUD de **series de numeración** en el admin:

- Tabla `nota_series`: id, nombre, prefijo (ej. `NS`, `RE`, `SA`), padding (ej. 4 → `0001`), contador actual, activa
- Admin puede crear/editar/desactivar series
- Al crear una nota, el operador selecciona qué serie usar
- Cada serie mantiene su propio contador independiente
- El número final se muestra como `{prefijo}-{numero con padding}` (ej. `NS-0001`, `RE-0042`)
- Migración: convertir la config actual (`nota_prefix`, `nota_counter`) a una serie por defecto

---

## Stack final corregido

| Capa | Tecnología |
|------|-----------|
| Runtime | Node.js v24.14.1 LTS |
| Framework | Astro 6.x SSR (`@astrojs/node`) |
| UI | Tailwind CSS v4 + shadcn/ui |
| Base de datos | SQLite via `better-sqlite3` |
| ORM | Drizzle ORM |
| Auth | JWT (cookie httpOnly) + bcrypt |
| PDF | jsPDF (cliente) |
| CSV | papaparse (cliente) |
| Tests | Vitest + Playwright |
| Linter | ESLint + Prettier |
