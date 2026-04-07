# PetroAlianza — Sistema de Notas de Salida

Sistema web interno para digitalizar el formulario **FO-SF-001 REV.3** (Autorización de Salida de Materiales y/o Equipos).

## Requisitos

- **Windows 10/11** (o Linux/macOS para desarrollo)
- **Node.js 22 LTS** o superior — [Descargar](https://nodejs.org/)

## Instalacion

### Windows

1. Descargar e instalar Node.js 22 LTS desde https://nodejs.org/
2. Abrir una terminal (cmd o PowerShell) en la carpeta del proyecto
3. Ejecutar:

```bat
scripts\setup.bat
```

### Linux / macOS

```bash
./scripts/setup.sh
```

El script instalara dependencias, creara la base de datos, cargara datos iniciales (demo) y compilara la aplicacion.

### Instalacion de produccion

Para instalar sin datos demo (solo usuario admin + config):

```bat
scripts\setup.bat --prod
```

```bash
./scripts/setup.sh --prod
```

### Carga automatica de datos iniciales

Si coloca archivos CSV en la carpeta `data/` antes de ejecutar setup, seran importados automaticamente:

| Archivo             | Formato                              |
|---------------------|--------------------------------------|
| `departments.csv`   | `nombre`                             |
| `vehicles.csv`      | `placa,marca,modelo`                 |
| `personal.csv`      | `ci,nombre,apellido,cargo,email`     |

Esto funciona tanto en modo desarrollo como produccion.

## Iniciar el sistema

### Windows

```bat
scripts\start.bat
```

### Linux / macOS

```bash
./scripts/start.sh
```

El sistema se abrira automaticamente en el navegador en **http://localhost:4321**

## Usuarios por defecto

| Usuario    | Contrasena   | Rol      |
|------------|-------------|----------|
| admin      | admin123    | Admin    |
| operador   | operador123 | Operador |

**IMPORTANTE:** Cambie las contrasenas despues del primer inicio de sesion desde el panel de administracion (/admin/usuarios).

## Funcionalidades

- **Crear notas de salida** — Formulario digital replica del FO-SF-001 REV.3
- **Exportar PDF** — Genera PDF en formato A4 landscape identico al formulario fisico
- **Registro de notas** — Busqueda, paginacion y ordenamiento
- **Anular/Restaurar notas** — Solo administradores
- **Gestion de usuarios** — Crear, editar, activar/desactivar, resetear contrasena
- **Administrar catalogos** — Departamentos, vehiculos, personal (CRUD + importacion CSV)
- **Configuracion** — Nombre de empresa, prefijo y contador de notas
- **Recuperacion de contrasena** — Sistema offline con token de 6 digitos

## Backup de la base de datos

La base de datos se encuentra en `data/petroalianza.db`. Para hacer un backup:

### Windows

```bat
scripts\backup-db.bat
```

### Linux / macOS

```bash
./scripts/backup-db.sh
```

Los backups se guardan en la carpeta `backups/` con marca de tiempo.

## Migracion a otro servidor

Para copiar la base de datos a un servidor remoto:

```bash
./scripts/migrate-db.sh usuario@servidor:/ruta/destino/
```

## Desarrollo

```bash
npm run dev        # Servidor de desarrollo (hot reload)
npm run build      # Compilar para produccion
npm run test       # Ejecutar tests
npm run test:coverage  # Tests con reporte de cobertura
npm run db:push    # Aplicar schema a la BD
npm run db:seed    # Cargar datos iniciales
npm run db:studio  # Abrir Drizzle Studio (explorar BD)
```

## Estructura del proyecto

```
src/
  components/    # Componentes React (NotaForm, NotasList, AdminCrud, etc.)
  layouts/       # Layouts Astro (AppLayout, Layout)
  lib/           # Logica de negocio (auth, db, schema, middleware, format)
  pages/         # Paginas y API endpoints
  styles/        # CSS global (Tailwind v4)
data/            # Base de datos SQLite
scripts/         # Scripts de instalacion y mantenimiento
tests/           # Tests unitarios e integracion
```

## Stack tecnologico

| Capa         | Tecnologia                    |
|--------------|-------------------------------|
| Framework    | Astro 6.x SSR (@astrojs/node) |
| UI           | Tailwind CSS v4 + React 19    |
| Base de datos| SQLite (better-sqlite3)       |
| ORM          | Drizzle ORM                   |
| Auth         | JWT (httpOnly cookie) + bcrypt|
| PDF          | jsPDF                         |
| Tests        | Vitest                        |

## FAQ

**El puerto 4321 esta ocupado:**
Detenga el proceso que usa ese puerto o cambie el puerto en `astro.config.mjs` (`server: { port: XXXX }`).

**Como reiniciar el sistema:**
Detenga el servidor (Ctrl+C) y ejecute `scripts\start.bat` nuevamente.

**Donde esta la base de datos:**
En `data/petroalianza.db`. Es un archivo SQLite que puede copiar directamente como backup.

**Como resetear todo:**
Elimine `data/petroalianza.db` y ejecute `npm run db:push && npm run db:seed`.
