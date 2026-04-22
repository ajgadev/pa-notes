# PetroAlianza — Sistema de Notas de Salida

Sistema web interno para digitalizar el formulario **FO-SF-001 REV.3** (Autorización de Salida de Materiales y/o Equipos).

## Requisitos

- **Windows 10/11** (o Linux/macOS para desarrollo)
- **Node.js 24 LTS** o superior — [Descargar](https://nodejs.org/)

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
- **Exportar PDF** — Genera PDF en formato A4 landscape identico al formulario fisico con firmas embebidas
- **Registro de notas** — Busqueda, paginacion y ordenamiento
- **Anular/Restaurar notas** — Solo administradores
- **Firma digital** — Firma con canvas tactil o imagen, enlaces de firma por token para externos
- **Notificaciones por email** — Solicitud de firma y confirmacion de firmas completadas (SMTP/Resend)
- **Notificaciones in-app** — Campana con badge de no leidas, polling cada 60s
- **Vista de pendientes** — Pestana "Pendientes mi firma" con badge en sidebar
- **Gestion de usuarios** — Crear, editar, activar/desactivar, resetear contrasena
- **Administrar catalogos** — Departamentos, vehiculos, personal (CRUD + importacion CSV)
- **Configuracion** — Nombre de empresa, prefijo/contador de notas, SMTP
- **Recuperacion de contrasena** — Sistema offline con token de 6 digitos

## Despliegue en servidor (Hetzner / VPS)

Para desplegar en un servidor Ubuntu con HTTPS gratuito:

### 1. Obtener dominio gratis (opcional, para HTTPS)

1. Ir a [duckdns.org](https://www.duckdns.org) e iniciar sesion con Google/GitHub
2. Crear un subdominio (ej. `petroalianza` → `petroalianza.duckdns.org`)
3. Apuntar el IP del servidor

### 2. Desplegar

```bash
# Solo HTTP (sin dominio)
./scripts/deploy.sh <ip-del-servidor>

# Con HTTPS (con dominio)
./scripts/deploy.sh <ip-del-servidor> petroalianza.duckdns.org
```

El script sube el proyecto, instala Node.js, Caddy (proxy reverso), compila la app, y la registra como servicio del sistema.

### 3. Firewall

El servidor necesita los puertos 80 y 443 abiertos:

```bash
ssh root@<ip> "ufw allow 80 && ufw allow 443 && ufw reload"
```

Si usa Hetzner Cloud Firewall, agregar reglas TCP 80 y 443 desde la consola web.

### 4. Comandos utiles en el servidor

```bash
systemctl status pa-notas      # estado de la app
systemctl restart pa-notas     # reiniciar app
journalctl -u pa-notas -f      # logs del sistema
tail -f /opt/pa-notas/data/logs/app.log  # logs de la app
```

### 5. Re-desplegar (actualizar)

Ejecutar el mismo comando de deploy. La base de datos se preserva automaticamente.

## Configuracion SMTP (email)

El sistema envia correos para solicitudes de firma y notificaciones. Se puede configurar de dos formas:

### Opcion 1: Variables de entorno (.env)

```env
SMTP_HOST=smtp.resend.com
SMTP_PORT=465
SMTP_USER=resend
SMTP_PASS=re_tu_api_key
SMTP_FROM=PetroAlianza <onboarding@resend.dev>
SMTP_ENABLED=1
```

### Opcion 2: Panel de administracion

Ir a Admin > Configuracion > Correo Electronico (SMTP) y configurar desde la interfaz.

La configuracion en base de datos tiene prioridad sobre las variables de entorno.

## Logs

La aplicacion escribe logs en `data/logs/app.log`. Se registran:

- Todas las peticiones a la API (metodo, ruta, usuario, status, tiempo)
- Inicios de sesion exitosos y fallidos
- Creacion de notas
- Cambios de estado (anular/restaurar)
- Firmas digitales (via token y autenticadas)
- Intentos de acceso no autorizado

Los archivos se rotan automaticamente al llegar a 5 MB (se mantienen hasta 5 archivos historicos).

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
  components/    # Componentes React (NotaForm, NotasList, SignaturePad, etc.)
  layouts/       # Layouts Astro (AppLayout, Layout)
  lib/           # Logica de negocio (auth, db, schema, signatures, email, etc.)
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
| Firmas       | signature_pad                 |
| Email        | nodemailer (SMTP/Resend)      |
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
