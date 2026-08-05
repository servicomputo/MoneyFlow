# Money Flow - Dockerfile multi-stage optimizado
# Construye la app Next.js standalone lista para producción

# =============================================================================
# Stage 1: Dependencias
# =============================================================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copiar manifests de paquetes
COPY package.json bun.lock* yarn.lock* package-lock.json* pnpm-lock.yaml* ./

# Instalar con bun si está disponible, sino npm
RUN if command -v bun >/dev/null 2>&1; then \
      bun install --frozen-lockfile; \
    elif [ -f pnpm-lock.yaml ]; then \
      corepack enable pnpm && pnpm install --frozen-lockfile; \
    elif [ -f yarn.lock ]; then \
      yarn install --frozen-lockfile; \
    else \
      npm ci; \
    fi

# =============================================================================
# Stage 2: Build
# =============================================================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Variables de entorno para build (la DB se define en runtime)
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Generar cliente Prisma y construir
RUN npx prisma generate
RUN npm run build

# =============================================================================
# Stage 3: Producción (imagen final mínima)
# =============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copiar standalone output (incluye solo lo necesario)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Copiar Prisma para migraciones en runtime
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Crear directorio de datos para SQLite
RUN mkdir -p /app/data && chown nextjs:nodejs /app/data

# Volumen persistente para la base de datos SQLite
VOLUME ["/app/data"]

USER nextjs

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Comando: empujar schema y arrancar servidor
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node server.js"]
