# ============================================
# Dockerfile - Social Mimic Backend
# ============================================
# Multi-stage build para producción optimizada

# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app

# Copiar package files
COPY package*.json ./
COPY backend/package*.json ./backend/

# Instalar dependencias de producción
RUN npm ci --only=production --workspace=backend
RUN cd backend && npm ci --only=production

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app

# Copiar node_modules del stage anterior
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/backend/node_modules ./backend/node_modules

# Copiar código fuente
COPY . .

# Build si hay TypeScript
RUN cd backend && npm run build --if-present

# Stage 3: Runner (Producción)
FROM node:20-alpine AS runner
WORKDIR /app

# Crear usuario no-root para seguridad
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 social-mimic

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=8080

# Copiar archivos necesarios
COPY --from=builder /app/backend/package*.json ./backend/
COPY --from=builder /app/backend/node_modules ./backend/node_modules
COPY --from=builder /app/backend/src ./backend/src
COPY --from=builder /app/brain ./brain
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules

# Cambiar a usuario no-root
USER social-mimic

# Exponer puerto
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

# Comando de inicio
WORKDIR /app/backend
CMD ["node", "src/index.js"]
