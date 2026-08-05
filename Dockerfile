# Money Flow - Dockerfile multi-stage
# Bun para instalar/construir, Node para ejecutar (máxima compatibilidad con Next.js)

# =============================================================================
# Stage 1: Dependencias (con Bun)
# =============================================================================
FROM oven/bun:1-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# =============================================================================
# Stage 2: Build (con Bun)
# =============================================================================
FROM oven/bun:1-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV DATABASE_URL=file:/app/data/moneyflow.db

# Generar cliente Prisma y construir la app
RUN bunx prisma generate
RUN bun run build

# =============================================================================
# Stage 3: Producción (con Node.js para compatibilidad con standalone)
# =============================================================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV DATABASE_URL=file:/app/data/moneyflow.db

RUN apk add --no-cache wget

# Crear directorio de datos
RUN mkdir -p /app/data

# Copiar standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copiar Prisma
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Empujar schema y arrancar servidor
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && node server.js"]
