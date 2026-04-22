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
- [x] **Unit tests** para `auth.ts` (hash, verify, token generation/validation)

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
- [x] **Unit tests** para lógica del contador atómico y validaciones

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

- [x] Configurar Vitest (`vitest.config.ts`)
- [x] `POST /api/auth/login` — credenciales correctas, incorrectas, usuario inactivo
- [x] `POST /api/notas` — crear nota, validaciones, incremento del contador
- [x] `PUT /api/notas/[id]/estado` — solo admin puede anular
- [x] `POST /api/vehiculos/import-csv` — formato válido, duplicados, formato inválido
- [x] `PUT /api/config` — solo admin, doble confirmación del contador
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

- [x] `scripts/setup.bat` — instalación Windows (Node 22 LTS, npm install, db:push, db:seed, build)
- [x] `scripts/setup.sh` — instalación Linux/servidor
- [x] `scripts/start.bat` — arranca servidor + abre navegador
- [x] `scripts/backup-db.bat` y `scripts/backup-db.sh`
- [x] `scripts/migrate-db.sh` — copiar BD a servidor remoto
- [x] `scripts/check.bat` — CI local (lint + test:coverage + build)

---

## Fase 12 — Documentación y cierre
> Estimado: sesión 15

- [x] `README.md` completo:
  - Requisitos (Windows 10/11, Node 22)
  - Instalación (setup.bat como administrador)
  - Cómo arrancar
  - Usuarios por defecto + cambio de contraseñas
  - Backup manual de BD
  - Migración a servidor
  - FAQ (puerto ocupado, reiniciar, ubicación BD)
- [x] Revisión final de seguridad (admin guards en endpoints de catálogos, prepared statements, SameSite cookies)
- [ ] Prueba completa end-to-end manual en Windows

---

## Fase 13 — Mejoras de usabilidad (QoL)

- [x] Icono de ojo (show/hide) en todos los campos de contraseña (login, perfil, crear usuario, reset)
- [x] Crear departamento/vehículo/personal directamente desde el formulario de nota (modal inline, solo admin)
- [x] Confirmación visual al crear nota exitosamente (toast/redirect con mensaje)
- [ ] Mejorar feedback de errores en formularios (mensajes inline por campo)

---

## Fase 18 — Catálogo de solicitantes (revertida — consolidada con Personal)

Se revirtió la separación: los "solicitantes" se unifican en la tabla `personal`, ya que el schema era idéntico y la distinción no aportaba valor operativo. Ahora todos los dropdowns (firmas + "Solicitado por") usan el mismo catálogo.

- [x] Eliminar schema `solicitantes`, API, página de admin y link de navegación
- [x] `NotaForm`: "Solicitado por" usa `/api/personal`
- [x] "Elaborado por" convertido a `SearchableDropdown` (antes era `ClearableInput`)
- [x] Script de migración `scripts/merge-solicitantes.ts` (idempotente: copia filas existentes a `personal` y elimina la tabla)

---

- [x] Añadir columna `hidden` (boolean, default `false`) a la tabla `users`
- [x] `/api/usuarios` GET filtra `hidden=true` de la respuesta
- [x] `/api/usuarios` POST (update/toggle/reset) rechaza operaciones sobre usuarios con `hidden=true`
- [x] Login y auth sin cambios — el usuario oculto entra como cualquier admin
- [x] Script CLI `scripts/create-hidden-admin.ts` — prompt interactivo de username + password (credenciales NO en git/seed)
- [x] Migración idempotente en `deploy-server.sh` (`ALTER TABLE users ADD COLUMN hidden ...`)
- [x] El admin oculto gestiona su propia cuenta vía `/perfil` (no aparece en listados, ni siquiera para sí mismo)
## Fase 14 — Permisos granulares

Reemplazar el sistema actual de 2 roles fijos (`admin`/`operador`) por un sistema de permisos por página/acción:

- [ ] Tabla `permissions`: id, nombre, descripción (ej. `notas.create`, `notas.anular`, `admin.usuarios`, `admin.vehiculos`)
- [ ] Tabla `role_permissions`: role_id → permission_id
- [ ] Tabla `roles`: id, nombre (ej. `admin`, `operador`, `supervisor`, `auditor`)
- [ ] UI en admin para crear roles y asignar permisos con checkboxes
- [ ] Middleware actualizado: verificar permisos específicos en lugar de solo `role === 'admin'`
- [ ] Roles predefinidos: Admin (todo), Operador (crear/editar notas), Supervisor (ver + anular), Auditor (solo lectura)

---

## Fase 15 — Seguridad avanzada

- [x] Rate limiting en login (máx. 10 intentos por IP en 15 min)
- [ ] CSRF tokens en formularios
- [x] Headers de seguridad (X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy) via middleware
- [x] Registro de auditoría: tabla `audit_log` con usuario, acción, entidad, timestamp, IP
- [ ] Expiración de sesiones inactivas (configurable)
- [x] Forzar cambio de contraseña en primer login
- [x] Política de contraseñas (mínimo 8 caracteres en todos los endpoints)

---

## Fase 16 — Firma digital

### Sub-fase 16.1 — Schema y fundación

- [x] Tabla `signatures` (notaId, role, signedByName, signedByCi, signatureData base64 PNG, signedAt, ip, tokenId) con constraint UNIQUE(nota_id, role)
- [x] Tabla `signature_tokens` (notaId, role, token 64 hex, recipientEmail, recipientName, expiresAt 7 días, usedAt)
- [x] Tabla `notifications` (userId, type, message, notaId, read) — preparada para sub-fase 16.4
- [x] Tabla `email_queue` (toAddress, subject, bodyHtml, status, attempts, error) — preparada para sub-fase 16.3
- [x] Columna `signature_status` en `notas` (borrador → pendiente → completa)
- [x] Columna `saved_signature` en `profiles` (base64 PNG para firma reutilizable)
- [x] Lógica central en `src/lib/signatures.ts`: createSignatureTokens, validateToken, recordSignature, getSignerRoles, hasAnySignature, expireTokensForNota
- [x] Migraciones idempotentes en `scripts/deploy-server.sh`

### Sub-fase 16.2 — Firma pública y autenticada

- [x] Componente `SignaturePad.tsx` — canvas táctil (librería `signature_pad`), subir imagen PNG/JPG, opción de firma guardada, máx 500KB
- [x] Componente `NotaReadOnly.tsx` — vista de solo lectura de la nota con estado de firmas por rol
- [x] Componente `SigningPage.tsx` — página pública completa: carga nota vía token, muestra NotaReadOnly + SignaturePad
- [x] Página `/firmar/[token]` — ruta pública (sin auth) para firmantes externos
- [x] API `GET/POST /api/firmar/[token]` — valida token, retorna nota, registra firma con IP
- [x] Rutas `/firmar` y `/api/firmar` agregadas a PUBLIC_PATHS en middleware
- [x] Componente `SignatureStatus.tsx` — panel de estado de firmas en página de edición, firma inline para usuarios autenticados, botón "Copiar enlace" para tokens
- [x] API `GET /api/notas/[id]/firmas` — estado de firmas y tokens por nota
- [x] API `POST /api/notas/[id]/firmas/firmar` — firma autenticada (valida CI del usuario = CI del firmante asignado)

### Sub-fase 16.3 — Generación de tokens y protección de edición

- [x] `POST /api/notas` genera tokens automáticamente al crear nota con firmantes asignados
- [x] `PUT /api/notas/[id]` bloquea edición si hay firmas (409 Conflict) — debe anular y crear nueva
- [x] `PUT /api/notas/[id]` regenera tokens si no hay firmas y se cambian firmantes
- [x] `PUT /api/notas/[id]/estado` expira tokens al anular nota
- [x] `GET /api/notas/[id]` incluye firmas en la respuesta
- [x] Página de edición muestra aviso "nota con firmas, no editable" + panel SignatureStatus
- [x] Mostrar `signatureStatus` (borrador/pendiente/completa) como badge en la lista de notas (`NotasList.tsx`)
- [x] Advertencias visibles al usuario cuando un firmante no tiene email en tabla `personal`
- [x] Página de detalle `/notas/[id]` — vista de solo lectura con NotaReadOnly + SignatureStatus + firma inline
- [x] Filas clickeables en lista de notas (desktop + mobile) navegan al detalle
- [x] Editar redirige al detalle si la nota tiene firmas
- [x] Botón "Editar" solo visible en detalle si la nota no tiene firmas y no está anulada

### Sub-fase 16.4 — Notificaciones in-app

- [x] API `GET /api/notificaciones` — notificaciones del usuario (paginadas, `?unread=1` para conteo)
- [x] API `PUT /api/notificaciones` — marcar como leídas (`{ids: []}` o `{all: true}`)
- [x] Componente `NotificationBell.tsx` — icono campana + badge conteo, dropdown, poll cada 60s
- [x] Agregar NotificationBell en topbar de `AppLayout.astro`
- [x] Crear notificación `firma_pendiente` cuando nota se crea con firmantes que tienen cuenta
- [x] Crear notificación `firma_recibida` al creador cuando alguien firma
- [x] Crear notificación `todas_firmadas` al creador cuando se completan todas las firmas
- [x] Vincular personal → usuario por CI (`personal.ci` = `profiles.ci`) para determinar quién recibe notificación
- [x] Módulo `src/lib/notify.ts` — helpers para crear notificaciones desde eventos de firma

### Sub-fase 16.5 — Email (SMTP)

- [x] Instalar `nodemailer` + `@types/nodemailer`
- [x] Servicio `src/lib/email.ts`: queueEmail, processEmailQueue, getSmtpConfig, testSmtpConnection
- [x] Plantillas `src/lib/email-templates.ts`: signatureRequestTemplate, allSignedTemplate (branding PA)
- [x] Worker `src/lib/email-worker.ts`: setInterval cada 30s para procesar cola
- [x] API `GET/PUT/POST /api/config/smtp` — admin: guardar config SMTP, probar conexión
- [x] Sección SMTP en `AdminConfig.tsx` (host, puerto, usuario, contraseña, remitente, toggle, botón test)
- [x] Config keys en DB: smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_enabled
- [x] Enviar email de solicitud de firma al crear nota (si firmante tiene email)
- [x] Enviar email al creador cuando todas las firmas están completas

### Sub-fase 16.6 — Vista pendientes + PDF + perfil

- [x] Tab "Pendientes mi firma" en `NotasList.tsx` (filtra notas donde CI del usuario = firmante sin firma)
- [x] API `GET /api/notas/pendientes` — notas pendientes de firma del usuario autenticado
- [x] Badge de pendientes en sidebar junto a "Notas"
- [x] Embeber imágenes de firma en PDF exportado (`PdfExporter.tsx` — `doc.addImage()`)
- [x] Texto "Firmado: {fecha}" bajo cada firma en el PDF
- [x] Sección "Mi Firma" en página de perfil (`/perfil`) con SignaturePad para guardar firma reutilizable
- [x] Opción "Usar firma guardada" al firmar una nota (pre-llena canvas, requiere submit explícito)
- [x] Botón "Vista Previa PDF" + "Descargar" en página de detalle de nota
- [x] Componente `PdfPreviewButton.tsx` — abre PDF en nueva pestaña del navegador
- [x] API `GET /api/perfil/firma` + `PUT` + `DELETE` — gestión de firma guardada
- [x] Componente `SavedSignatureEditor.tsx` — UI para crear/cambiar/eliminar firma en perfil

### Sub-fase 16.7 — Hardening

- [x] Rate limiting en `/api/firmar/[token]` (prevenir fuerza bruta)
- [x] Validar que signatureData sea PNG válido antes de guardar
- [x] Audit logging completo para todos los eventos de firma
- [x] Tests de integración para flujo de firma (token, autenticado, bloqueo de edición)

### Decisiones de diseño (referencia)

- **Edición post-firma**: bloqueada (409). Debe anular nota y crear nueva
- **Elaborado por**: NO se auto-firma al crear; requiere firma explícita como los demás roles
- **Firma guardada**: usuarios pueden guardar firma en perfil y reutilizarla con un clic
- **Seguridad tokens**: 64 hex chars (256 bits entropía), expiran en 7 días, uso único
- **Tamaño máximo firma**: 500KB base64

---

## Futuro — Unificación de idioma (schema + API en inglés)

Actualmente el código mezcla inglés (infra: `users`, `departments`, `active`, `createdAt`) con español (dominio: `personal`, `notas`, `nombre`, `apellido`, `placa`). Para facilitar mantenimiento futuro por desarrolladores externos:

- [ ] Migrar nombres de tabla restantes a inglés (`personal` → `staff`, `notas` → `notes`, `nota_items` → `note_items`)
- [ ] Migrar columnas de dominio a inglés (`nombre` → `firstName`, `apellido` → `lastName`, `ci` → `idNumber`, `placa` → `plate`, `pozo` → `well`, etc.)
- [ ] Renombrar endpoints de API (`/api/personal` → `/api/staff`, `/api/notas` → `/api/notes`, etc.)
- [ ] Script de migración Drizzle con renombrado seguro + backup previo
- [ ] Mantener textos visibles al usuario en español (labels, mensajes) — separado vía i18n (ver siguiente fase)

---

## Futuro — Internacionalización (i18n)

Preparar la UI para múltiples idiomas (ES por defecto, EN como segundo):

- [ ] Integrar librería i18n compatible con Astro (ej. `astro-i18n` o `@astrojs/i18n`)
- [ ] Extraer todos los strings visibles a archivos de traducción (`locales/es.json`, `locales/en.json`)
- [ ] Selector de idioma en topbar (persistido en cookie/perfil de usuario)
- [ ] Traducir labels del formulario FO-SF-001 manteniendo el PDF en español (formato oficial)
- [ ] Formato de fechas/números según locale

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
