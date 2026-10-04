# DESARROLLO.md — Kancha

> **Qué es este archivo.** Es la instrucción técnica única para construir Kancha:
> stack, arquitectura, contrato de API, Docker, GitHub, pruebas y plan de demo.
>
> **Una sola fuente de verdad por tema.** Este archivo manda en todo lo técnico y es el único que lo
> describe — `CLAUDE.md` solo lo referencia. `CLAUDE.md` manda en alcance, épicas, historias y roadmap.
> `DESIGN.md` manda en todo lo visual. Jira manda en el estado real de sprints e historias.
> Si encuentras una contradicción entre dos de ellos, no la resuelvas por tu cuenta: repórtala.
>
> Versión 1.3 — 4 de octubre de 2026 · Lukas Guerrero · Portafolio de Título, Ingeniería en Informática

---

## 0. Decisiones cerradas

Estas cuatro decisiones ya están tomadas. No se revisan durante el desarrollo salvo bloqueo técnico documentado.

| # | Decisión | Elección | Por qué |
|---|---|---|---|
| D1 | Plataforma | **Expo (React Native) — un código para Android, iOS y Web** | Una sola base de código produce la app móvil real y la versión web que se proyecta ante la comisión |
| D2 | Pagos | **Transbank Webpay Plus, ambiente de Integración** | Credenciales públicas gratuitas, tarjetas de prueba, es el estándar chileno que la comisión reconoce |
| D3 | Ejecución | **Docker local + demo pública en la nube** | El profesor levanta todo con un comando, y además tiene una URL para revisar sin instalar nada |
| D4 | Costo total | **$0 CLP** | Todo el stack usa tiers gratuitos permanentes o software libre. Ningún servicio pide tarjeta de crédito |

---

## 1. Stack tecnológico definitivo

### 1.1 Frontend — App móvil y web

| Componente | Tecnología | Versión | Costo |
|---|---|---|---|
| Framework | Expo SDK | 52 (React Native 0.76, React 18.3) | Libre |
| Lenguaje | TypeScript | 5.x — `strict: true` | Libre |
| Navegación | Expo Router (file-based) | v4 | Libre |
| Estado global | Zustand | 5.x | Libre |
| Data fetching / caché | TanStack Query | 5.x | Libre |
| Formularios + validación | React Hook Form + Zod | — | Libre |
| Estilos | StyleSheet de RN + tokens de `DESIGN.md` | — | Libre |
| Mapa (móvil) | `react-native-maps` | incluido en Expo Go | Libre |
| Mapa (web) | `maplibre-gl` + tiles oscuros de OpenFreeMap / CARTO | 5.x | Libre, sin API key |
| Geolocalización | `expo-location` | — | Libre |
| Notificaciones push | `expo-notifications` + Expo Push API | — | Libre |
| Tipografías | Anton + Roboto vía `@expo-google-fonts` | — | Libre |
| Testing | Jest (`jest-expo`) + React Native Testing Library | — | Libre |

> **Versiones reales del scaffolding (Sprint 4).** Estas son las versiones instaladas y verificadas en
> `package.json`. La v1.1 de este documento declaraba Expo SDK 57, React 19.2 y Zod 4, pero el código
> se generó con SDK 52 y Zod 3. Subir a SDK 57 es una tarea aparte, con su propio issue en Jira.

**Por qué Expo y no Flutter ni web pura:** Expo entrega las tres cosas que el proyecto necesita al mismo tiempo
— app nativa instalable, versión web proyectable y demo instantánea por QR sin publicar en Google Play.

### 1.2 Backend — API REST

| Componente | Tecnología | Versión | Costo |
|---|---|---|---|
| Runtime | Node.js LTS | 22.x | Libre |
| Lenguaje | TypeScript | 5.x — `strict: true` | Libre |
| Framework HTTP | Express | 5.x | Libre |
| ORM / migraciones | Prisma | 6.x | Libre |
| Base de datos | PostgreSQL + PostGIS | 16 / 3.4 | Libre |
| Autenticación | JWT (`jsonwebtoken`) + `bcrypt` | — | Libre |
| Validación de entrada | Zod | 3.x | Libre |
| Documentación de API | OpenAPI 3 + Swagger UI (`swagger-ui-express`) | — | Libre |
| Pagos | `transbank-sdk` (oficial) | 6.x | Libre (ambiente Integración) |
| Logging | Pino | 9.x | Libre |
| Testing | Vitest + Supertest | — | Libre |
| Lint / formato | ESLint + Prettier | — | Libre |

### 1.3 Infraestructura

| Componente | Tecnología | Costo |
|---|---|---|
| Contenedores | Docker + Docker Compose | Libre |
| Imagen de BD | `postgis/postgis:16-3.4` | Libre |
| Repositorio | GitHub (público) | Libre |
| CI | GitHub Actions | 2.000 min/mes gratis, ilimitado en repos públicos |
| Registro de imágenes | GitHub Container Registry (ghcr.io) | Libre en repos públicos |
| Gestión ágil | GitHub Projects + Jira (ya conectado por MCP) | Libre |
| Hosting API (demo) | Render — Web Service free tier (Docker) | Libre |
| Hosting BD (demo) | Supabase o Neon — Postgres con PostGIS | Libre |
| Hosting web (demo) | Render Static Site o Vercel Hobby | Libre |

> **Advertencia de tier gratuito:** el servicio web gratuito de Render se duerme tras ~15 min sin tráfico
> y la primera petición tarda ~50 s en despertar. **Antes de la defensa, abre la URL 5 minutos antes
> de entrar a la sala.** Esta es también la razón por la que Docker local es el plan principal y la nube el respaldo.

---

## 2. Arquitectura del sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENTES (Expo SDK 52)                   │
│                                                                 │
│   📱 Android / iOS              🖥️  Web (react-native-web)      │
│   (Expo Go · QR)                (build estático · demo comisión) │
│   react-native-maps             maplibre-gl                     │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS · JSON · Bearer JWT
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                   API REST — Node 22 + Express 5                │
│  ┌───────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  routes/  │→│controllers│→│ services/│→│repositories│         │
│  └───────────┘ └──────────┘ └──────────┘ └─────┬────┘           │
│  middlewares: auth · validate(Zod) · errorHandler · rateLimit    │
└──────────┬───────────────────────────────────────┬──────────────┘
           │ Prisma + $queryRaw (PostGIS)          │ SDK / HTTP
           ▼                                       ▼
┌────────────────────────┐        ┌───────────────────────────────┐
│ PostgreSQL 16 + PostGIS│        │ SERVICIOS EXTERNOS            │
│ users · matches ·      │        │ • Transbank Webpay (Integr.)  │
│ participations ·       │        │ • Expo Push API               │
│ ratings · payments     │        │ • Tiles OSM / OpenFreeMap     │
└────────────────────────┘        └───────────────────────────────┘

        ── Todo lo de la izquierda corre dentro de Docker Compose ──
```

**Regla de capas (no se rompe):** una ruta nunca toca la base de datos. El flujo siempre es
`route → controller → service → repository → Prisma`. Toda la lógica de negocio (honor, fraccionamiento,
retención) vive en `services/` y por lo tanto es testeable sin levantar HTTP.

---

## 3. Estructura del repositorio

Monorepo único. Un solo repo en GitHub, un solo `docker compose up`.

```
kancha/
├── README.md                    ← portada: qué es + cómo levantarlo en 3 comandos
├── CLAUDE.md                    ← contexto de negocio (ya existe)
├── DESIGN.md                    ← identidad visual (ya existe)
├── DESARROLLO.md                ← este archivo
├── GUIA-ARRANQUE.md             ← setup inicial paso a paso
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
├── .gitattributes
│
├── fase-1-definicion/
│   ├── entrega/                 ← lo que se presenta en la evaluación
│   │   ├── 1-documentacion-grupal/     guía de la asignatura
│   │   ├── 2-documentos-individuales/  autoevaluaciones y diario de reflexión
│   │   └── 3-presentacion/
│   └── docs/                    ← documentos de la fase
│       ├── Kancha_Documentacion_Fase1.docx   documento consolidado
│       ├── word/                los diez documentos ágiles
│       ├── excel/               versiones editables
│       └── diagramas/           mapa mental, actores, visión, impact mapping, story mapping
│
├── fase-2-desarrollo/
│   ├── docs/
│   │   ├── 01-modelo-datos.md
│   │   ├── 02-diagramas-uml.md
│   │   ├── api/openapi.yaml
│   │   ├── diagramas/           ← ER, casos de uso, secuencia, despliegue (.mmd + .png)
│   │   └── evidencias/          ← capturas de tests, CI en verde, cobertura
│   │
│   ├── backend/
│   │   ├── src/
│   │   │   ├── routes/          auth.routes.ts · matches.routes.ts · ...
│   │   │   ├── controllers/
│   │   │   ├── services/        honor.service.ts · payment.service.ts · matching.service.ts
│   │   │   ├── repositories/
│   │   │   ├── middlewares/     auth.ts · validate.ts · errorHandler.ts
│   │   │   ├── schemas/         Zod: request/response por endpoint
│   │   │   ├── config/          env.ts (validado con Zod) · prisma.ts
│   │   │   ├── utils/
│   │   │   ├── app.ts
│   │   │   └── server.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts          ← datos de demo de La Florida
│   │   ├── tests/
│   │   │   ├── unit/
│   │   │   └── integration/
│   │   ├── Dockerfile
│   │   ├── .dockerignore
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── mobile/
│       ├── app/                 ← Expo Router
│       │   ├── (auth)/login.tsx · register.tsx
│       │   ├── (tabs)/index.tsx (mapa) · matches.tsx · profile.tsx
│       │   ├── match/[id].tsx
│       │   └── _layout.tsx
│       ├── src/
│       │   ├── components/
│       │   │   ├── KanchaMap/   ← index.native.tsx + index.web.tsx + types.ts
│       │   │   ├── MatchCard/
│       │   │   ├── PlayerCard/
│       │   │   ├── HonorBadge/
│       │   │   ├── SportFilter/
│       │   │   └── ui/          Button · Chip · ProgressBar · Skeleton
│       │   ├── theme/           colors.ts · typography.ts · spacing.ts  ← desde DESIGN.md
│       │   ├── api/             client.ts + hooks de TanStack Query
│       │   ├── store/           authStore.ts · filterStore.ts
│       │   └── utils/
│       ├── assets/              logo, fuentes, íconos de los 3 deportes
│       ├── Dockerfile           ← build web + nginx
│       ├── .dockerignore
│       ├── app.json
│       └── package.json
│
├── fase-3-implementacion/       ← despliegue, pruebas finales y cierre
│
└── .github/
    └── workflows/
        ├── ci.yml               ← lint + test + build en cada PR
        └── docker-publish.yml   ← publica imágenes en ghcr.io al mergear a main
```

---

## 4. Modelo de datos

PostGIS es obligatorio: la búsqueda por radio (HU-04) debe resolverse en la base de datos, no en memoria.

### 4.1 `prisma/schema.prisma` (extracto clave)

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [postgis]
}

enum Sport       { FUTBOL PADEL BASQUETBOL }
enum SkillLevel  { PRINCIPIANTE MEDIO AVANZADO }
enum MatchStatus { OPEN FULL IN_PROGRESS FINISHED ARCHIVED CANCELLED }
enum PartStatus  { PENDING APPROVED PAID CANCELLED NO_SHOW }
enum PayStatus   { INITIATED AUTHORIZED FAILED REFUNDED RETAINED }

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  name         String
  favoriteSport Sport
  matchesPlayed Int     @default(0)        // contador mostrado en la carta de jugador
  honorScore   Decimal? @db.Decimal(3,1)   // 0.0–10.0 · null = "Sin calificaciones aún" (HU-02)
                                           // ÚNICO número de reputación. No existe un rating 1–5 aparte
  attendanceRate  Decimal? @db.Decimal(5,2)
  punctualityRate Decimal? @db.Decimal(5,2)
  fairPlayRate    Decimal? @db.Decimal(5,2)
  expoPushToken String?
  createdAt    DateTime @default(now())

  organizedMatches Match[]         @relation("organizer")
  participations   Participation[]
  ratingsGiven     Rating[]        @relation("rater")
  ratingsReceived  Rating[]        @relation("rated")
}

model Match {
  id           String      @id @default(uuid())
  organizerId  String
  organizer    User        @relation("organizer", fields: [organizerId], references: [id])
  title        String
  sport        Sport
  venueName    String
  address      String
  level        SkillLevel  @default(MEDIO)   // "Nivel medio" en la carta de partido
  /// PostGIS: Prisma no tipa geometrías → se consulta con $queryRaw
  location     Unsupported("geography(Point, 4326)")
  startsAt     DateTime
  durationMin  Int         @default(60)
  totalSlots   Int
  filledSlots  Int         @default(0)
  totalCost    Int         @default(0)   // CLP, entero. Nunca float para dinero
  status       MatchStatus @default(OPEN)
  createdAt    DateTime    @default(now())

  participations Participation[]
  ratings        Rating[]

  @@index([startsAt])
  @@index([sport, status])
}

model Participation {
  id        String     @id @default(uuid())
  matchId   String
  userId    String
  status    PartStatus @default(PENDING)
  amountDue Int        // totalCost / totalSlots, calculado al confirmar
  joinedAt  DateTime   @default(now())

  match   Match    @relation(fields: [matchId], references: [id], onDelete: Cascade)
  user    User     @relation(fields: [userId], references: [id])
  payment Payment?

  @@unique([matchId, userId])   // impide postulación duplicada (HU-05)
}

model Rating {
  id          String   @id @default(uuid())
  matchId     String
  raterId     String
  ratedId     String
  punctuality Int      // 1..5
  conduct     Int      // 1..5
  createdAt   DateTime @default(now())

  match Match @relation(fields: [matchId], references: [id], onDelete: Cascade)
  rater User  @relation("rater", fields: [raterId], references: [id])
  rated User  @relation("rated", fields: [ratedId], references: [id])

  @@unique([matchId, raterId, ratedId])  // impide doble calificación (HU-06)
}

model Payment {
  id              String    @id @default(uuid())
  participationId String    @unique
  amount          Int
  commission      Int       // 10% de amount
  retained        Int       @default(0)
  status          PayStatus @default(INITIATED)
  buyOrder        String    @unique
  sessionId       String
  token           String?   // token_ws de Webpay
  authorizedAt    DateTime?
  createdAt       DateTime  @default(now())

  participation Participation @relation(fields: [participationId], references: [id])
}
```

### 4.2 Migración manual para el índice espacial

Prisma no genera el índice GIST sobre una columna `Unsupported`, así que se escribió a mano en la
migración `…_indice_gist_ubicacion`:

```sql
CREATE INDEX IF NOT EXISTS idx_match_location ON "Match" USING GIST (location);
```

Además se declara en el modelo `Match` de `schema.prisma`, para que `migrate dev` no lo trate como
sobrante y genere un `DROP INDEX` en la siguiente migración:

```prisma
@@index([location], map: "idx_match_location", type: Gist)
```

### 4.3 Búsqueda por radio (HU-04) — la consulta central del producto

```ts
const matches = await prisma.$queryRaw<MatchRow[]>`
  SELECT m.id, m.title, m.sport, m."venueName", m."startsAt",
         m."totalSlots", m."filledSlots", m."totalCost",
         ST_Y(m.location::geometry) AS lat,
         ST_X(m.location::geometry) AS lng,
         ROUND(ST_Distance(m.location,
               ST_MakePoint(${lng}, ${lat})::geography)) AS "distanceM"
  FROM "Match" m
  WHERE m.status = 'OPEN'
    AND m."startsAt" > NOW()
    AND m."filledSlots" < m."totalSlots"
    AND (${sport}::text IS NULL OR m.sport::text = ${sport})
    AND ST_DWithin(m.location, ST_MakePoint(${lng}, ${lat})::geography, ${radiusM})
  ORDER BY "distanceM" ASC
  LIMIT 100;
`;
```

> **Argumento para la defensa (C3):** `ST_DWithin` sobre un índice GIST resuelve la búsqueda
> en tiempo logarítmico; calcular haversine en Node exigiría traer todos los partidos a memoria.
> La decisión de usar PostGIS es lo que hace que el producto escale a más comunas sin rediseño.

---

## 5. Contrato de API REST

Base: `/api/v1`. Autenticación: `Authorization: Bearer <jwt>`. Todo en JSON. Montos en CLP enteros.

| Método | Ruta | HU | Auth | Descripción |
|---|---|---|---|---|
| POST | `/auth/register` | HU-01 | — | Crea cuenta con `honorScore = null` |
| POST | `/auth/login` | HU-01 | — | Devuelve access + refresh token |
| GET | `/users/me` | HU-02 | ✔ | Perfil propio completo |
| GET | `/users/:id` | HU-02 | ✔ | Carta de jugador pública |
| PATCH | `/users/me/push-token` | HU-10 | ✔ | Registra token de Expo Push |
| POST | `/matches` | HU-03 | ✔ | Publica partido (incluye `level`). Rechaza `startsAt` pasado |
| GET | `/matches/nearby` | HU-04 | ✔ | `?lat=&lng=&radius=5000&sport=&level=&from=&to=` |
| GET | `/matches/:id` | HU-04 | ✔ | Detalle + lista de participantes |
| POST | `/matches/:id/join` | HU-05 | ✔ | Crea `Participation` en `PENDING` |
| PATCH | `/participations/:id/approve` | HU-05 | ✔ org | Organizador aprueba → `APPROVED` |
| DELETE | `/participations/:id` | HU-09 | ✔ | Cancela; aplica retención si faltan < 12 h |
| POST | `/payments/:participationId/init` | HU-08 | ✔ | Crea transacción Webpay, devuelve `url` + `token` |
| PUT | `/payments/commit` | HU-08 | — | Callback de Transbank con `token_ws` |
| POST | `/matches/:id/ratings` | HU-06 | ✔ | Califica puntualidad y conducta (1–5). 409 si pasaron 48 h |
| GET | `/matches/:id/ratings/pending` | HU-06 | ✔ | A quién falta calificar |
| GET | `/health` | — | — | `{ status, db, version }` para Docker healthcheck |

### 5.1 Formato de error único

Todos los errores salen del `errorHandler` con la misma forma. Sin excepciones.

```json
{ "error": { "code": "MATCH_FULL", "message": "El partido ya no tiene cupos disponibles", "details": null } }
```

### 5.2 Reglas de negocio que van en `services/`, no en controladores

```
honor.service.ts     honorScore = promedio ponderado de las últimas 20 calificaciones
                     ((punctuality + conduct) / 2), redondeado a 1 decimal.
                     Con 0 calificaciones → null (nunca 0: un novato no es un mal jugador).
                     Ventana de reseña: 48 h desde que termina el partido. Cumplido el plazo el
                     partido pasa a archivado y el endpoint de calificación responde 409. (HU-06)

                     Las TRES métricas que DESIGN.md §4.5 exige mostrar en el perfil salen de
                     dos fuentes distintas, no todas de la reseña:
                       punctualityRate  ← promedio del campo punctuality de las reseñas recibidas
                       fairPlayRate     ← promedio del campo conduct de las reseñas recibidas
                       attendanceRate   ← NO se califica: se calcula del historial de participaciones
                                          = PAID / (PAID + NO_SHOW), en las participaciones cerradas
                     honorScore es el agregado de las tres en escala 0–10, y es el ÚNICO número de
                     reputación del producto: el badge naranja de la carta. El mockup de Fase 1
                     mostraba además un "rating 4.8" en escala 1–5; se elimina por redundante.
                     matchesPlayed se incrementa al cerrar una participación como asistida.

payment.service.ts   amountDue   = ceil(totalCost / totalSlots)
                     commission  = round(amountDue * 0.10)
                     Cancela < 12 h de startsAt → retiene 50% y devuelve 50%
                     Cancela ≥ 12 h            → reembolso 100%

matching.service.ts  Al aprobar una participación: filledSlots++ y si llega a
                     totalSlots → status = FULL. Todo dentro de una transacción
                     Prisma con bloqueo de fila, para evitar sobreventa de cupos.
```

---

## 6. Docker — cómo el profesor levanta el proyecto

**Requisito crítico del proyecto: `git clone` + `docker compose up` y la aplicación funciona. Nada más.**

### 6.1 `docker-compose.yml`

```yaml
services:
  db:
    image: postgis/postgis:16-3.4
    container_name: kancha-db
    environment:
      POSTGRES_USER: kancha
      POSTGRES_PASSWORD: kancha
      POSTGRES_DB: kancha
    ports: ["5432:5432"]
    volumes: [kancha-db-data:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U kancha -d kancha"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build: ./fase-2-desarrollo/backend
    container_name: kancha-api
    environment:
      DATABASE_URL: postgresql://kancha:kancha@db:5432/kancha
      JWT_SECRET: ${JWT_SECRET:-dev-secret-cambiar-en-prod}
      TBK_ENV: integration
      PORT: 3000
    ports: ["3000:3000"]
    depends_on:
      db: { condition: service_healthy }
    command: sh -c "npx prisma migrate deploy && npx prisma db seed && node dist/server.js"
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://localhost:3000/api/v1/health"]
      interval: 10s
      retries: 5

  web:
    build: ./fase-2-desarrollo/mobile
    container_name: kancha-web
    environment:
      EXPO_PUBLIC_API_URL: http://localhost:3000/api/v1
    ports: ["8080:80"]
    depends_on:
      api: { condition: service_healthy }

volumes:
  kancha-db-data:
```

### 6.2 `fase-2-desarrollo/backend/Dockerfile` (multi-stage)

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### 6.3 `fase-2-desarrollo/mobile/Dockerfile` (build web de Expo servido por nginx)

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
RUN npx expo export --platform web

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

`nginx.conf` debe redirigir todas las rutas a `index.html` (`try_files $uri /index.html;`) porque
Expo Router usa rutas del lado del cliente.

### 6.4 Lo que el profesor ve al terminar

```
http://localhost:8080          → la app Kancha (versión web, mismo código que el móvil)
http://localhost:3000/api/docs → Swagger UI con todos los endpoints probables
http://localhost:3000/api/v1/health → { "status": "ok", "db": "connected" }
```

El `seed.ts` debe dejar la demo lista: ~8 usuarios con distintos puntajes de honor,
~12 partidos reales de La Florida (fútbol, pádel y básquet, **los tres con igual presencia**
según `DESIGN.md`) repartidos en un radio de 5 km, y calificaciones previas para que el
Sistema de Honor se vea funcionando desde el primer segundo.

---

## 7. GitHub — la evidencia que evalúa el profesor

### 7.1 Repositorio

- Nombre: `kancha` — **público**, para que la comisión entre sin invitación.
- `README.md` es la portada del proyecto y debe contener, en este orden:
  1. Logo + tagline *Juega. Conecta. Vive Mejor.*
  2. Qué problema resuelve, en 3 líneas
  3. **Cómo levantarlo en 3 comandos** (lo primero que buscará el profesor)
  4. Badge de CI de GitHub Actions
  5. Capturas: mapa, carta de partido, perfil con honor
  6. Stack + enlace al demo desplegado
  7. Estructura de carpetas y enlace a `fase-2-desarrollo/docs/`

### 7.2 Ramas

```
main       producción · protegida · solo por Pull Request · CI obligatorio en verde
develop    integración de sprints
feat/HU-04-mapa-geolocalizado      una rama por historia de usuario
fix/...    correcciones
```

### 7.3 Commits

Conventional Commits, como ya define `CLAUDE.md`. **Referencia siempre la HU:**

```
feat(matches): add PostGIS radius search endpoint (HU-04)
test(honor): add weighted average unit tests (HU-07)
chore(docker): add healthcheck to api service
```

> El historial de commits es evidencia evaluable de la competencia C2. Commits diarios y pequeños
> valen más que un commit gigante el domingo. Nunca hagas `git push` de un `main` roto.

### 7.4 `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:    { branches: [main, develop] }
  pull_request: { branches: [main, develop] }

jobs:
  backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgis/postgis:16-3.4
        env: { POSTGRES_USER: kancha, POSTGRES_PASSWORD: kancha, POSTGRES_DB: kancha_test }
        ports: ['5432:5432']
        options: >-
          --health-cmd pg_isready --health-interval 5s --health-timeout 5s --health-retries 10
    defaults: { run: { working-directory: ./fase-2-desarrollo/backend } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: fase-2-desarrollo/backend/package-lock.json }
      - run: npm ci
      - run: npx prisma migrate deploy
        env: { DATABASE_URL: postgresql://kancha:kancha@localhost:5432/kancha_test }
      - run: npm run lint
      - run: npm test -- --coverage
        env: { DATABASE_URL: postgresql://kancha:kancha@localhost:5432/kancha_test }
      - uses: actions/upload-artifact@v4
        with: { name: coverage-backend, path: fase-2-desarrollo/backend/coverage }

  mobile:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: ./fase-2-desarrollo/mobile } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: fase-2-desarrollo/mobile/package-lock.json }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm test
      - run: npx expo export --platform web

  docker:
    needs: [backend, mobile]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: docker compose build
```

### 7.5 GitHub Projects

Tablero `Kancha MVP` con columnas `Backlog → Sprint actual → En progreso → En revisión → Terminado`.
Un issue por HU, etiquetado con su épica (`E1`…`E10`) y su sprint. El tablero es la evidencia visual
de Scrum para la competencia C2; mantenlo sincronizado con Jira, no lo dejes atrasado.

### 7.6 Releases

Al cierre de cada sprint, un tag y un release con notas:
`v0.5.0 — Sprint 5: Registro y publicación de partidos (HU-01, HU-03)`.
Cada release es una prueba fechada de avance incremental. El primero es `v0.3.0` (27 de septiembre de
2026), con el esqueleto del Sprint 3 y el ambiente del Sprint 4.

---

## 8. Despliegue gratuito (respaldo de la demo)

| Pieza | Servicio | Configuración |
|---|---|---|
| Base de datos | **Supabase** (o Neon) | Proyecto free. Activar PostGIS: `CREATE EXTENSION postgis;`. Copiar la connection string a `DATABASE_URL` |
| API | **Render** — Web Service, runtime Docker | Conectar el repo, root `./fase-2-desarrollo/backend`. Variables: `DATABASE_URL`, `JWT_SECRET`, `TBK_ENV=integration` |
| Web | **Render Static Site** o Vercel | Build: `npx expo export --platform web`, publish dir: `dist`. Var: `EXPO_PUBLIC_API_URL` = URL de la API |
| App móvil | **Expo Go + QR** | `npx expo start --tunnel` → el profesor escanea y la app corre en su propio celular |

> Ninguno de estos servicios pide tarjeta de crédito en su tier gratuito.
> Supabase pausa proyectos tras ~1 semana sin uso: entra al dashboard la semana de la defensa.

---

## 9. Pagos con Transbank — implementación

Ambiente de **Integración**. Las credenciales de prueba son públicas y ya vienen dentro del SDK oficial:
**no las escribas a mano, impórtalas como constantes.** Así nunca quedan desactualizadas.

```ts
import { WebpayPlus, Options, IntegrationCommerceCodes, IntegrationApiKeys, Environment }
  from 'transbank-sdk';

const tx = new WebpayPlus.Transaction(new Options(
  IntegrationCommerceCodes.WEBPAY_PLUS,
  IntegrationApiKeys.WEBPAY,
  Environment.Integration
));
```

Las tarjetas y credenciales de prueba (VISA que siempre aprueba, RUT `11.111.111-1`, clave `123`)
están en la documentación oficial de Transbank Developers. **Confírmalas al inicio del Sprint 7**
y déjalas anotadas en `fase-2-desarrollo/docs/credenciales-prueba.md` para tenerlas a mano el día de la defensa.

### Flujo (HU-08)

```
1. POST /payments/:participationId/init
   → payment.service crea buyOrder único, llama a Webpay.create(...)
   → responde { url, token }
2. La app abre esa URL en expo-web-browser (móvil) o redirige (web)
3. El usuario paga con la tarjeta de prueba en el formulario de Transbank
4. Transbank redirige al returnUrl → PUT /payments/commit con token_ws
5. payment.service llama a Webpay.commit(token)
   → si responseCode === 0: Payment = AUTHORIZED, Participation = PAID
   → si no: Payment = FAILED, se libera el cupo
```

**Regla:** el `returnUrl` debe ser una URL alcanzable por el navegador de Transbank. En local usa
`http://localhost:3000/api/v1/payments/return`; en la nube, la URL pública de Render.
Escribe esta URL en una variable de entorno, nunca hardcodeada.

---

## 10. Plan de pruebas (competencia C1)

El plan completo, con cada caso y su estado, está en `fase-2-desarrollo/docs/04-plan-pruebas.md`.
Esta tabla es el resumen de la estrategia.

| Tipo | Herramienta | Qué cubre | Meta |
|---|---|---|---|
| Unitarias backend | Vitest | `honor.service`, `payment.service`, `matching.service` | ≥ 80% en `services/` |
| Integración API | Vitest + Supertest | Cada endpoint de la tabla §5, camino feliz y error | 100% de endpoints |
| Espaciales | Vitest + BD de prueba | `ST_DWithin`: dentro y fuera del radio, borde exacto | 100% |
| Componentes | Jest + RNTL | `MatchCard`, `HonorBadge`, `SportFilter` | Componentes críticos |
| Caja negra | Casos CN del plan de pruebas | Criterios de aceptación de cada historia, con valores límite | 100% de las historias |
| Rendimiento | k6 + `EXPLAIN ANALYZE` | Búsqueda por radio bajo carga y uso del índice GIST | Umbrales del plan de pruebas |
| Seguridad | Supertest + `npm audit` | Controles OWASP: autenticación, acceso a objetos ajenos, inyección | 12 controles del plan |

**Casos que no pueden faltar** (son los que la comisión preguntará):

1. Honor con 0 calificaciones devuelve `null`, no `0`
2. Dos jugadores postulan al último cupo en paralelo → solo uno queda `APPROVED`
3. Calificar dos veces al mismo jugador en el mismo partido → rechazado (409)
4. Publicar partido con fecha pasada → rechazado (422)
5. Cancelar a 11 h 59 min → retención 50%; a 12 h 01 min → reembolso 100%
6. Pago fallido en Webpay → el cupo se libera, no queda bloqueado
7. Calificar a las 47 h 59 min → aceptado; a las 48 h 01 min → rechazado y partido archivado

---

## 11. Orden de ejecución

Respeta el roadmap de `CLAUDE.md`. Este es el detalle técnico de cada sprint.

| Sprint | Fechas | Entregable técnico |
|---|---|---|
| **3** | 01–14 sep | **Hecho.** Modelo ER, diagramas UML y esqueleto local: backend con `honor.service` y `payment.service` probados, app Expo, `docker-compose.yml` y `schema.prisma` |
| **4** | 15–28 sep | **Hecho.** Ambiente de desarrollo, repositorio público en GitHub, migraciones e índice GIST, arranque en Docker corregido y CI activo (KAN-24). HU-01 y HU-03 no se iniciaron |
| **5** | 29 sep–12 oct | HU-01, HU-03. Auth JWT, registro, login, `POST /matches` con PostGIS, Swagger publicado. Documentación de la Fase 2 (KAN-23) |
| **6** | 13–26 oct | HU-04, HU-05. `matching.service`, búsqueda por radio, mapa nativo y web con filtro de 3 deportes, flujo de postulación sin sobreventa |
| **7** | 27 oct–09 nov | HU-08, HU-09. Integración con Transbank Integración sobre `payment.service`, retención por deserción |
| **8** | 10–23 nov | HU-02, HU-06, HU-07. Carta de jugador, calificación y recálculo de honor sobre `honor.service`. Despliegue en Render + Supabase |
| **9** | 24 nov–07 dic | HU-10 push. **Cierre de C1:** suite completa, cobertura, `fase-2-desarrollo/docs/evidencias/`. README final, video de respaldo, ensayo de la defensa. Congelar `main`. Tag `v1.0.0` |

> **Replanificación del 27 de septiembre de 2026.** El Sprint 4 se usó en dejar operativo el ambiente y
> las historias se corrieron un sprint. El plan quedó sin holgura: los sprints 8 y 9 combinan desarrollo,
> despliegue y defensa. Cada historia se entrega completa, con su API, su pantalla y sus pruebas, para
> que la demo crezca sprint a sprint en vez de depender de un sprint final de frontend.

---

## 12. Variables de entorno

`.env.example` se commitea. `.env` nunca. Valídalas con Zod en `config/env.ts` para que la API
falle al arrancar si falta una, en vez de fallar a mitad de la demo.

```env
# Base de datos
DATABASE_URL=postgresql://kancha:kancha@db:5432/kancha

# Autenticación
JWT_SECRET=cambiar-por-cadena-larga-aleatoria
JWT_EXPIRES_IN=7d

# Servidor
PORT=3000
NODE_ENV=development
API_BASE_URL=http://localhost:3000

# Transbank — en 'integration' el SDK usa sus propias credenciales de prueba;
# commerce code y api key solo se completan al pasar a producción.
TBK_ENV=integration
TBK_COMMERCE_CODE=
TBK_API_KEY=
TBK_RETURN_URL=http://localhost:3000/api/v1/payments/return

# Negocio
PLATFORM_COMMISSION_RATE=0.10
RETENTION_WINDOW_HOURS=12
RETENTION_RATE=0.50

# Frontend (Expo expone solo las variables con prefijo EXPO_PUBLIC_)
EXPO_PUBLIC_API_URL=http://localhost:3000/api/v1
EXPO_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/dark
```

---

## 13. Definición de Terminado (DoD)

Una Historia de Usuario está terminada solo cuando cumple **todo** esto:

- [ ] Código en TypeScript `strict`, sin `any`, sin errores de ESLint
- [ ] Al menos una prueba unitaria y una de integración, ambas pasando
- [ ] Endpoint documentado en OpenAPI y visible en Swagger UI
- [ ] La UI respeta `DESIGN.md`: fondo oscuro, naranja solo en acción, los 3 deportes con igual peso
- [ ] Funciona en web **y** en móvil vía Expo Go
- [ ] `docker compose up` sigue levantando todo sin intervención manual
- [ ] CI en verde en el Pull Request
- [ ] Rama mergeada a `develop` y el issue cerrado en GitHub Projects y Jira
- [ ] Captura o GIF guardado en `fase-2-desarrollo/docs/evidencias/`

---

## 14. Guion de la demo ante la comisión

Prepara los tres caminos. Si uno falla, sigues con el siguiente sin perder el hilo.

| Plan | Qué muestras | Requiere |
|---|---|---|
| **A** | La web proyectada desde `http://localhost:8080`, levantada con Docker en tu notebook | Solo tu notebook |
| **B** | Tu celular con la app nativa espejeado en el proyector | Celular + Expo Go |
| **C** | Video de 3 minutos del flujo completo, ya grabado | Nada |

**Flujo de 6 minutos que demuestra el MVP completo:**

1. **Problema (30 s)** — "nos falta uno": muestra el mapa vacío de la coordinación informal
2. **Registro (30 s)** — creas un agente libre nuevo, honor "Sin calificaciones aún"
3. **Publicar (1 min)** — desde otra cuenta publicas un partido de pádel 4/4 con 1 cupo libre en La Florida
4. **Descubrir (1 min)** — el pin aparece en el mapa oscuro; filtras por deporte; el radio de 5 km funciona
5. **Unirse y pagar (1,5 min)** — postulas, el organizador aprueba, pagas tu parte con la tarjeta de prueba de Transbank, el cupo pasa a "Confirmado y pagado"
6. **Honor (1 min)** — terminado el partido, calificas puntualidad y conducta; el puntaje del perfil se recalcula en vivo
7. **Cierre técnico (30 s)** — muestras GitHub: CI en verde, los releases de cada sprint, cobertura de pruebas, y el `docker compose up` que ellos mismos pueden correr

> Haz una copia de seguridad de la base de datos con el seed cargado (`pg_dump`) y guárdala en `fase-2-desarrollo/docs/`.
> Si algo se rompe minutos antes, restauras y sigues.

---

## 15. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Render duerme el servicio y la demo tarda 50 s | Alto | Docker local es el plan A; abre la URL 5 min antes |
| PostGIS no disponible en el hosting gratis elegido | Alto | Supabase y Neon lo soportan; verifícalo en Sprint 3, no en Sprint 8 |
| El mapa nativo se comporta distinto al web | Medio | Interfaz `KanchaMap` común; probar en ambos desde el primer día del Sprint 6 |
| Sprint 7 (pagos con Transbank) se desborda | Alto | Las funciones de cálculo ya existen y están probadas: el riesgo es la integración con Webpay, que se empieza el primer día del sprint |
| Los sprints 8 y 9 combinan desarrollo, despliegue y defensa | Alto | HU-10 es *Could* y es la primera candidata a salir del alcance si el Sprint 8 no cierra |
| Trabajo en solitario, sin revisor de código | Medio | Pull Requests a ti mismo + CI obligatorio: la disciplina reemplaza al revisor |
| Deuda de documentación al final | Alto | Cada release de sprint incluye su documentación; no la dejes para el Sprint 9 |

---

## 16. Primeros 5 comandos

```bash
# 1. Crear el repo y la estructura
mkdir kancha && cd kancha && git init && gh repo create kancha --public --source=.

# 2. Backend
mkdir -p fase-2-desarrollo/backend && cd fase-2-desarrollo/backend && npm init -y
npm i express@5 @prisma/client jsonwebtoken bcrypt zod pino transbank-sdk
npm i -D typescript tsx vitest supertest prisma @types/node @types/express eslint prettier
npx prisma init --datasource-provider postgresql

# 3. App Expo
cd .. && npx create-expo-app@latest mobile --template default
cd mobile && npx expo install expo-router expo-location expo-notifications react-native-maps
npm i zustand @tanstack/react-query react-hook-form zod maplibre-gl

# 4. Levantar todo (desde la raíz del repo)
cd ../.. && cp .env.example .env && docker compose up --build

# 5. Verificar
curl http://localhost:3000/api/v1/health
```

---

*Kancha — Juega. Conecta. Vive Mejor.*
*Portafolio de Título · Ingeniería en Informática · Sede Plaza Vespucio · Lukas Guerrero · 2026*
