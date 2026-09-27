# ---------- build ----------
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ---------- runtime ----------
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache wget openssl
COPY package*.json ./
# Se copian todas las dependencias del build: el arranque necesita el CLI de
# Prisma (migrate deploy) y tsx (seed), que son devDependencies.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# El seed importa honor.service desde src/ (lo ejecuta tsx, no el build).
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./
EXPOSE 3000
CMD ["node", "dist/server.js"]
