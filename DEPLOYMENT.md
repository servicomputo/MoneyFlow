# 💰 Money Flow — Guía de Despliegue

Aplicación web para control de gastos personales con IA. Construida con **Next.js 16**, **TypeScript**, **Prisma** y **z-ai-web-dev-sdk** (IA para OCR de tickets y asistente financiero).

---

## 📋 Tabla de contenidos

1. [Arquitectura](#-arquitectura)
2. [Despliegue rápido con Docker](#-despliegue-rápido-con-docker)
3. [Despliegue en servidor (VPS)](#-despliegue-en-servidor-vps)
4. [Uso desde el celular (PWA)](#-uso-desde-el-celular-pwa)
5. [Variables de entorno](#-variables-de-entorno)
6. [Backups y datos](#-backups-y-datos)
7. [Solución de problemas](#-solución-de-problemas)

---

## 🏗 Arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Tu celular / PC                       │
│                                                          │
│   Money Flow (PWA instalable)                           │
│   ├─ Dashboard con gráficas                             │
│   ├─ Agregar gasto manual                              │
│   ├─ Escanear ticket (cámara → IA)                     │
│   ├─ Importar Excel masivo                             │
│   └─ Asistente IA (chat)                               │
└────────────────────────┬────────────────────────────────┘
                         │ HTTPS
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Servidor (VPS / Cloud)                      │
│                                                          │
│   ┌──────────────┐    ┌──────────────────────────────┐  │
│   │   Caddy      │───▶│  Next.js (Docker)            │  │
│   │  SSL auto    │    │  - API REST                  │  │
│   │  Reverse     │    │  - SSR / PWA                 │  │
│   │   proxy      │    │  - z-ai-web-dev-sdk (IA)     │  │
│   └──────────────┘    └──────────┬───────────────────┘  │
│                                  │                       │
│                       ┌──────────▼───────────────────┐  │
│                       │  SQLite (volumen Docker)     │  │
│                       │  - Gastos, cuentas, etc.     │  │
│                       └──────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Componentes:**
- **Frontend + Backend**: Next.js 16 (App Router) en una sola app — las APIs REST viven en `/api/*`.
- **Base de datos**: SQLite (archivo único en `/app/data/moneyflow.db`). Suficiente para uso personal/familiar.
- **IA**: `z-ai-web-dev-sdk` — VLM (`glm-4.5v`) para leer tickets, LLM (`glm-4.6`) para clasificar y el asistente.
- **Reverse proxy**: Caddy (genera SSL automáticamente con Let's Encrypt).

---

## 🐳 Despliegue rápido con Docker

### Requisitos
- Docker 24+ y Docker Compose v2 instalados.

### Pasos

```bash
# 1. Clonar el repositorio en el servidor
git clone <tu-repo> money-flow
cd money-flow

# 2. Crear archivo .env con tus secretos
cp .env.example .env
nano .env  # edita NEXTAUTH_SECRET y opcionalmente ZAI_API_KEY

# 3. Construir y levantar
docker compose up -d --build

# 4. Ver logs
docker compose logs -f app

# 5. Sembrar datos de ejemplo (opcional, solo la primera vez)
docker compose exec app npx tsx scripts/seed.ts
```

La app queda disponible en `http://localhost:3000` (o la IP de tu servidor).

---

## 🖥 Despliegue en servidor (VPS)

### Opción A: VPS económico (DigitalOcean, Hetzner, OVH, etc.)

1. **Compra un VPS** con Ubuntu 22.04+ (2GB RAM mínimo, 4GB recomendado).

2. **Instala Docker** en el servidor:
   ```bash
   ssh root@TU_IP
   apt update && apt upgrade -y
   curl -fsSL https://get.docker.com | sh
   ```

3. **Apunta tu dominio** (`moneyflow.tudominio.com`) al IP del VPS en tu proveedor de DNS (registro A).

4. **Sube el código** al servidor:
   ```bash
   # En tu PC local
   scp -r . root@TU_IP:/opt/moneyflow
   ssh root@TU_IP
   cd /opt/moneyflow
   ```

5. **Configura el dominio** en docker-compose.yml: descomenta el servicio `caddy` y en `Caddyfile.prod.example` reemplaza el dominio. Renómbralo:
   ```bash
   cp Caddyfile.prod.example Caddyfile
   nano Caddyfile  # reemplaza {$DOMAIN} por tu dominio real, quita los comentarios
   ```

6. **Configura variables**:
   ```bash
   cp .env.example .env
   # Genera un secreto aleatorio:
   openssl rand -base64 32
   # Pégalo en NEXTAUTH_SECRET
   nano .env
   ```

7. **Levanta todo**:
   ```bash
   docker compose up -d --build
   ```

8. **¡Listo!** Visita `https://moneyflow.tudominio.com`. Caddy instala el certificado SSL automáticamente en la primera petición.

### Opción B: Plataformas PaaS (más simple)

- **Railway** / **Render** / **Fly.io**: conecta tu repo de Git, configura `DATABASE_URL` y despliega. Estas plataformas gestionan SSL y dominio automáticamente.
- **Vercel**: ideal para el frontend, pero necesitarás una base de datos externa (Neon, Supabase, Turso).

---

## 📱 Uso desde el celular (PWA)

Money Flow es una **PWA (Progressive Web App)**: funciona como app nativa desde el navegador, sin pasar por tiendas de apps.

### Instalación en el celular

**iPhone (Safari):**
1. Abre `https://moneyflow.tudominio.com` en Safari.
2. Toca el botón **Compartir** (cuadrado con flecha arriba).
3. Selecciona **"Añadir a pantalla de inicio"**.
4. Aparecerá un ícono de Money Flow en tu celular. Ábrelo — se ve como app nativa (sin barra del navegador).

**Android (Chrome):**
1. Abre la URL en Chrome.
2. Aparecerá un banner **"Instalar app"** — acéptalo.
3. O ve al menú ⋮ → **"Añadir a pantalla de inicio"**.

### Flujo típico de uso diario

```
📞 Estás en la calle, pagas un café en Starbucks
   │
   ▼
📱 Abres Money Flow desde tu pantalla de inicio (1 toque)
   │
   ▼
🟢 Botón grande "Agregar gasto"
   │
   ├─ Opción rápida: escribes "Starbucks" → autocompleta categoría "Café"
   │  y método de pago de la última vez. Confirmas. ✅ (<10 seg)
   │
   └─ Opción escanear: fotografiás el ticket → la IA lee fecha, total,
      IVA, productos → confirma → gasto creado automáticamente.
```

**Características móviles:**
- ✅ **Offline-first**: la interfaz carga rápido (Service Worker cachea assets).
- ✅ **Cámara integrada**: el botón "Escanear" abre directamente la cámara.
- ✅ **Bottom navigation**: navegación inferior tipo app nativa.
- ✅ **Touch-friendly**: botones grandes (44px+), gestos intuitivos.
- ✅ **Modo oscuro** automático según tu sistema.
- ✅ **Sincronización**: al estar conectado, todos tus cambios van al servidor. Si registras algo sin conexión, se envía cuando recuperes internet (la app sigue funcional).

### ¿Datos compartidos entre dispositivos?

**Sí** — como la app vive en un servidor, todos tus dispositivos ven los mismos datos:
- Registras un gasto desde el celular en la calle.
- Llegas a casa, abres Money Flow en la laptop → el gasto ya está ahí.
- Tu pareja/familia puede usar la misma instancia (gestiona usuarios con NextAuth si lo necesitas multi-usuario).

---

## 🔐 Variables de entorno

Crea un archivo `.env` en la raíz (usa `.env.example` como base):

```bash
# Base de datos (SQLite por defecto)
DATABASE_URL=file:/app/data/moneyflow.db

# NextAuth (autenticación)
NEXTAUTH_URL=https://moneyflow.tudominio.com
NEXTAUTH_SECRET=tu-secreto-aleatorio-generado-con-openssl-rand-base64-32

# Z-AI SDK (IA para OCR de tickets y asistente)
# Se usa automáticamente con credenciales del entorno
ZAI_API_KEY=tu-api-key-opcional

# Opcional: cambiar puerto
PORT=3000
```

Para generar `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

---

## 💾 Backups y datos

### Dónde se guardan tus datos

- **Base de datos SQLite**: en el volumen Docker `moneyflow-data` → `/app/data/moneyflow.db`
- **Imágenes de tickets**: se guardan en la base de datos como base64 (no hay archivos separados).

### Backup manual

```bash
# Copiar la base de datos del contenedor a tu PC
docker cp moneyflow-app:/app/data/moneyflow.db ./backup-$(date +%Y%m%d).db

# Restaurar
docker cp ./backup-20250115.db moneyflow-app:/app/data/moneyflow.db
docker compose restart app
```

### Backup automático (cron en el servidor)

Crea `/opt/moneyflow/backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR=/opt/moneyflow/backups
mkdir -p $BACKUP_DIR
docker cp moneyflow-app:/app/data/moneyflow.db $BACKUP_DIR/moneyflow-$(date +%Y%m%d-%H%M).db
# Mantener solo los últimos 30 backups
find $BACKUP_DIR -name "moneyflow-*.db" -mtime +30 -delete
```

Añádelo al cron:
```bash
crontab -e
# Backup diario a las 3 AM
0 3 * * * /opt/moneyflow/backup.sh
```

### Exportar desde la app

Dentro de Money Flow → **Estadísticas** → botones **CSV / JSON / Excel / PDF** descargan todos tus gastos. Útil para migrar a otro sistema o llevar a tu contador.

---

## 🔧 Solución de problemas

### La app no carga
```bash
docker compose ps              # ¿está corriendo?
docker compose logs app        # ver errores
docker compose restart app     # reiniciar
```

### Error de base de datos
```bash
# Verificar que el volumen existe
docker volume ls | grep moneyflow

# Recrear schema (sin perder datos)
docker compose exec app npx prisma db push --accept-data-loss
```

### Resetear todos los datos (¡cuidado!)
```bash
docker compose down -v         # borra volúmenes
docker compose up -d --build
docker compose exec app npx tsx scripts/seed.ts  # recargar datos demo
```

### Actualizar la app
```bash
git pull
docker compose up -d --build
```

### La cámara no funciona en iPhone
Asegúrate de acceder vía **HTTPS**. iOS requiere HTTPS para usar la cámara. Si usas Caddy con dominio, el SSL es automático.

---

## 📞 Soporte

- **Issues**: abre un ticket en el repositorio.
- **Email**: soporte@moneyflow.app

---

**Money Flow** · Tu contador y asesor financiero personal con IA · © 2025
