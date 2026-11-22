# Modelo de Datos — Kancha

> Entregable del Sprint 3 (01–14 sep 2026) · Issue **KAN-22** · Evidencia de la competencia **C3**
> Fuente de verdad del esquema: `backend/prisma/schema.prisma`. Este documento y el schema van juntos:
> si cambia uno, cambia el otro en el mismo commit.

---

## 1. Decisiones de diseño

| Decisión | Justificación |
|---|---|
| **PostgreSQL 16 + PostGIS**, no NoSQL | El dominio es fuertemente relacional (un partido tiene participaciones, cada una tiene un pago) y requiere integridad transaccional en el cobro. NoSQL obligaría a resolver a mano lo que el motor ya garantiza. |
| **`geography(Point, 4326)`** para la ubicación | Permite resolver la búsqueda por radio en la base de datos con `ST_DWithin` sobre un índice GIST. La alternativa —traer todos los partidos a memoria y calcular haversine en Node— es O(n) por consulta y no escala a más comunas. |
| **Montos en CLP como `Int`**, nunca `Float` | El punto flotante introduce errores de redondeo inaceptables en dinero. El peso chileno no tiene decimales, así que el entero es exacto por naturaleza. |
| **`honorScore` nullable** | Distingue "sin calificaciones aún" de "calificado con 0". Un jugador nuevo no es un mal jugador. |
| **Un solo número de reputación** | El mockup de Fase 1 mostraba un honor de 8.6 y un rating de 4.8 a la vez: dos escalas para lo mismo. Se conserva `honorScore` en 0–10 y se elimina el rating 1–5 para evitar ambigüedad en la interfaz y en los datos. |
| **`matchesPlayed` desnormalizado** | La carta de jugador lo muestra en cada render. Un contador evita un `COUNT` sobre participaciones en cada consulta de perfil. |
| **Restricciones únicas en BD**, no solo en el servicio | `(matchId, userId)` impide postulación duplicada y `(matchId, raterId, ratedId)` impide doble calificación aunque falle la validación de aplicación o haya concurrencia. |
| **`onDelete: Cascade`** en participaciones y reseñas | Eliminar un partido no debe dejar filas huérfanas que rompan el cálculo de honor. |

---

## 2. Diagrama Entidad-Relación

```mermaid
erDiagram
    USER ||--o{ MATCH : "organiza"
    USER ||--o{ PARTICIPATION : "postula"
    MATCH ||--o{ PARTICIPATION : "recibe"
    PARTICIPATION ||--o| PAYMENT : "genera"
    USER ||--o{ RATING : "califica como rater"
    USER ||--o{ RATING : "recibe como rated"
    MATCH ||--o{ RATING : "contextualiza"
    USER ||--o| NOTIFICATION_PREFERENCE : "elige sus avisos"
    USER ||--o{ NOTIFICATION : "recibe"
    MATCH |o--o{ NOTIFICATION : "origina"
    USER ||--o{ REPORT : "reporta"
    USER ||--o{ REPORT : "es reportado"
    USER |o--o{ REPORT : "resuelve como admin"
    MATCH ||--o{ REPORT : "contextualiza"

    USER {
        uuid     id PK
        string   email UK
        string   passwordHash
        string   name
        enum     favoriteSport
        int      matchesPlayed
        decimal  honorScore "NULL si no tiene reseñas"
        decimal  attendanceRate
        decimal  punctualityRate
        decimal  fairPlayRate
        enum     role "PLAYER o ADMIN (HU-11)"
        datetime suspendedUntil "null = sin sancion"
        datetime createdAt
    }

    MATCH {
        uuid      id PK
        uuid      organizerId FK
        string    title
        enum      sport
        string    venueName
        string    address
        enum      level "principiante medio avanzado"
        geography location "Point 4326, índice GIST"
        datetime  startsAt
        int       durationMin
        int       totalSlots
        int       filledSlots
        int       totalCost "CLP entero"
        datetime  prioritizedAt "null = no destacado (KAN-41)"
        enum      status
        datetime  createdAt
    }

    PARTICIPATION {
        uuid     id PK
        uuid     matchId FK
        uuid     userId FK
        enum     status
        int      amountDue "CLP entero"
        boolean  attended "null = sin cerrar"
        datetime joinedAt
    }

    RATING {
        uuid     id PK
        uuid     matchId FK
        uuid     raterId FK
        uuid     ratedId FK
        int      punctuality "1 a 5"
        int      conduct "1 a 5"
        datetime createdAt
    }

    PAYMENT {
        uuid     id PK
        uuid     participationId FK "UNIQUE - relacion 1 a 1"
        int      amount
        int      commission "10 por ciento de la cuota"
        int      retained
        enum     status
        string   buyOrder UK
        string   sessionId
        string   token "token_ws de Webpay"
        datetime authorizedAt
        datetime createdAt
    }

    NOTIFICATION_PREFERENCE {
        uuid     userId PK "FK a User, 1 a 1"
        boolean  faltaUno "el aviso prioritario"
        boolean  nearby
        boolean  nudges
        enum     sports "arreglo de Sport"
        int      days "arreglo, 0 domingo a 6 sabado"
        int      fromHour "CHECK 0 a 23"
        int      toHour "CHECK 1 a 24, mayor que fromHour"
        int      radiusKm "CHECK 1 a 20"
        float    lat
        float    lng
        datetime updatedAt
    }

    NOTIFICATION {
        uuid     id PK
        uuid     userId FK
        enum     kind "FALTA_UNO y otros 7"
        uuid     matchId FK "null en el animo para jugar"
        string   title
        string   body
        datetime readAt "null = sin leer"
        datetime createdAt
    }

    REPORT {
        uuid     id PK
        uuid     matchId FK
        uuid     reporterId FK
        uuid     reportedId FK "CHECK distinto de reporterId"
        enum     reason
        string   comment "CHECK hasta 280"
        enum     status "PENDING SANCTIONED DISMISSED"
        datetime createdAt
        uuid     resolvedById FK "el admin que resolvio"
        datetime resolvedAt
        string   resolutionNote
    }
```

---

## 3. Diccionario de datos

### 3.1 `User` — jugadores de la plataforma

| Campo | Tipo | Nulo | Restricción | Descripción |
|---|---|---|---|---|
| `id` | UUID | No | PK | Identificador |
| `email` | VARCHAR | No | UNIQUE | Credencial de acceso |
| `passwordHash` | VARCHAR | No | — | Hash bcrypt, coste 12. Nunca la contraseña en claro |
| `name` | VARCHAR | No | — | Nombre visible en la carta de jugador |
| `favoriteSport` | ENUM | No | FUTBOL \| PADEL \| BASQUETBOL | Define el feed y las notificaciones |
| `matchesPlayed` | INT | No | default 0, ≥ 0 | Partidos asistidos. Se muestra en la carta de jugador |
| `honorScore` | DECIMAL(3,1) | **Sí** | 0.0–10.0 | NULL = "Sin calificaciones aún". Único número de reputación |
| `attendanceRate` | DECIMAL(5,2) | Sí | 0–100 | Calculado: asistidos / (asistidos + no presentados), según `Participation.attended` |
| `punctualityRate` | DECIMAL(5,2) | Sí | 0–100 | Promedio de `Rating.punctuality` |
| `fairPlayRate` | DECIMAL(5,2) | Sí | 0–100 | Promedio de `Rating.conduct` |
| `role` | ENUM | No | PLAYER | ADMIN, default PLAYER | ADMIN modera los reportes (HU-11). Se asigna en la base: no hay pantalla para nombrar administradores |
| `suspendedUntil` | TIMESTAMP | Sí | — | Hasta entonces no publica, no postula ni destaca (HU-11). NULL = sin sanción |
| `createdAt` | TIMESTAMP | No | default now() | Alta de la cuenta |

### 3.2 `Match` — partidos publicados

| Campo | Tipo | Nulo | Restricción | Descripción |
|---|---|---|---|---|
| `id` | UUID | No | PK | Identificador |
| `organizerId` | UUID | No | FK → User | Quien publica y aprueba postulaciones |
| `title` | VARCHAR | No | — | Nombre visible del partido |
| `sport` | ENUM | No | FUTBOL \| PADEL \| BASQUETBOL | Filtro principal del mapa |
| `venueName` | VARCHAR | No | — | Nombre del recinto |
| `address` | VARCHAR | No | — | Dirección legible |
| `level` | ENUM | No | PRINCIPIANTE \| MEDIO \| AVANZADO, default MEDIO | Nivel esperado. Se muestra en la carta de partido |
| `location` | GEOGRAPHY(Point,4326) | No | **índice GIST** | Coordenada para `ST_DWithin` |
| `startsAt` | TIMESTAMP | No | > now() al crear | Inicio del partido |
| `durationMin` | INT | No | default 60 | Duración; define el cierre y la ventana de reseña |
| `totalSlots` | INT | No | > 0 | Cupos totales |
| `filledSlots` | INT | No | 0 ≤ x ≤ totalSlots | Cupos confirmados |
| `totalCost` | INT | No | ≥ 0, CLP | Arriendo total. 0 = partido gratuito |
| `prioritizedAt` | TIMESTAMP | Sí | null = no destacado | "Falta uno" destacado (KAN-41): cuándo lo destacó el organizador. Destacado, cada cupo que se aprueba entra gratis |
| `status` | ENUM | No | OPEN \| FULL \| IN_PROGRESS \| FINISHED \| ARCHIVED \| CANCELLED | Estado del ciclo de vida |
| `createdAt` | TIMESTAMP | No | default now() | Publicación |

### 3.3 `Participation` — postulaciones a un partido

| Campo | Tipo | Nulo | Restricción | Descripción |
|---|---|---|---|---|
| `id` | UUID | No | PK | Identificador |
| `matchId` | UUID | No | FK → Match, ON DELETE CASCADE | Partido |
| `userId` | UUID | No | FK → User | Postulante |
| `status` | ENUM | No | PENDING \| APPROVED \| PAID \| CANCELLED \| NO_SHOW \| REJECTED | Estado de la postulación. `REJECTED`: el organizador no la aceptó (KAN-32) |
| `amountDue` | INT | No | ceil(totalCost/totalSlots) · CHECK ≥ 0 | Monto individual congelado al aprobar |
| `attended` | BOOLEAN | Sí | se cierra una sola vez | Asistencia que registra el organizador al terminar el partido: `null` sin cerrar, `true` asistió (suma `matchesPlayed`), `false` no se presentó (`status = NO_SHOW`). KAN-30 |
| `joinedAt` | TIMESTAMP | No | default now() | Momento de la postulación |
| — | — | — | **UNIQUE (matchId, userId)** | Impide postularse dos veces al mismo partido |

### 3.4 `Rating` — calificaciones mutuas post-partido

| Campo | Tipo | Nulo | Restricción | Descripción |
|---|---|---|---|---|
| `id` | UUID | No | PK | Identificador |
| `matchId` | UUID | No | FK → Match, ON DELETE CASCADE | Contexto de la reseña |
| `raterId` | UUID | No | FK → User | Quien califica |
| `ratedId` | UUID | No | FK → User | Quien es calificado |
| `punctuality` | INT | No | CHECK 1 ≤ x ≤ 5 | Puntualidad percibida |
| `conduct` | INT | No | CHECK 1 ≤ x ≤ 5 | Conducta / juego limpio |
| `createdAt` | TIMESTAMP | No | default now() | Debe caer dentro de las 48 h posteriores |
| — | — | — | **UNIQUE (matchId, raterId, ratedId)** | Impide la doble calificación |

### 3.5 `Payment` — transacciones Webpay

| Campo | Tipo | Nulo | Restricción | Descripción |
|---|---|---|---|---|
| `id` | UUID | No | PK | Identificador |
| `participationId` | UUID | No | FK → Participation, UNIQUE | Relación 1:1 con la participación |
| `amount` | INT | No | CLP | Monto cobrado al jugador: cuota (`amountDue`) más comisión |
| `commission` | INT | No | 10 % de `amountDue` | Ingreso de la plataforma, cobrado encima de la cuota |
| `retained` | INT | No | default 0 · CHECK entre 0 y `amount` | Monto retenido por deserción tardía |
| `status` | ENUM | No | INITIATED \| AUTHORIZED \| FAILED \| REFUNDED \| RETAINED | Estado de la transacción |
| `buyOrder` | VARCHAR | No | UNIQUE | Orden de compra enviada a Transbank |
| `sessionId` | VARCHAR | No | — | Sesión de Webpay. Aleatoria: prueba que una vuelta "tiempo agotado" viene de Transbank (DEF-12) |
| `token` | VARCHAR | Sí | — | `token_ws` devuelto por Transbank |
| `authorizedAt` | TIMESTAMP | Sí | — | Momento de la autorización |
| `createdAt` | TIMESTAMP | No | default now() | Inicio de la transacción |

### 3.6 `NotificationPreference` — qué avisos acepta cada usuario (HU-10)

| Campo | Tipo | Nulo | Restricción | Descripción |
|---|---|---|---|---|
| `userId` | UUID | No | PK, FK → User (CASCADE) | Relación 1:1. Sin fila, ningún aviso activado |
| `faltaUno` | BOOLEAN | No | default false | Partidos urgentes o destacados dentro del radio: el aviso prioritario |
| `nearby` | BOOLEAN | No | default false | Partidos nuevos en sus días y horario |
| `nudges` | BOOLEAN | No | default false | Ánimo para volver a jugar, a lo más uno por semana |
| `sports` | ENUM[] | No | Sport, sin repetidos (Zod) | Deportes de los que quiere avisos |
| `days` | INT[] | No | 0 a 6, sin repetidos (Zod) | Días aceptados para "Partidos cerca", en hora de Chile (0 = domingo) |
| `fromHour` | INT | No | default 18 · CHECK 0 a 23 y menor que `toHour` | Inicio del horario aceptado, en hora de Chile |
| `toHour` | INT | No | default 23 · CHECK 1 a 24 | Fin del horario aceptado, sin incluirlo |
| `radiusKm` | INT | No | default 5 · CHECK 1 a 20 | Qué tan lejos cuenta como "cerca" |
| `lat`, `lng` | DOUBLE | Sí | Zod: ambos o ninguno; obligatorios si activa algún aviso | Punto desde el que se mide la distancia. Se fija al guardar |
| `updatedAt` | TIMESTAMP | No | — | Último cambio |

### 3.7 `Notification` — bandeja de avisos (HU-10)

| Campo | Tipo | Nulo | Restricción | Descripción |
|---|---|---|---|---|
| `id` | UUID | No | PK | Identificador |
| `userId` | UUID | No | FK → User (CASCADE) | A quién va el aviso |
| `kind` | ENUM | No | FALTA_UNO \| NEARBY_MATCH \| JOIN_REQUEST \| JOIN_APPROVED \| PRIORITY_OFFER \| NUDGE \| GUEST_COVER | Tipo. FALTA_UNO es el prioritario |
| `matchId` | UUID | Sí | FK → Match (CASCADE) | Partido del aviso; null en el ánimo para jugar |
| `title`, `body` | VARCHAR | No | — | Texto armado por reglas, sin IA |
| `readAt` | TIMESTAMP | Sí | null = sin leer | Cuándo lo leyó |
| `createdAt` | TIMESTAMP | No | default now() | Al renovarse (destacado, nueva postulación) se actualiza y sube en la bandeja |
| — | — | — | **UNIQUE (userId, kind, matchId)** | El barrido periódico nunca repite un aviso del mismo tipo y partido. NULL no choca: el ánimo para jugar se limita a uno por semana en el servicio |

---

### 3.8 `Report` — reportes de conducta (HU-11)

| Campo | Tipo | Nulo | Restricción | Descripción |
|---|---|---|---|---|
| `id` | UUID | No | PK | Identificador |
| `matchId` | UUID | No | FK → Match, ON DELETE CASCADE | Partido en que ocurrió la conducta |
| `reporterId` | UUID | No | FK → User | Quien reporta: jugó ese partido |
| `reportedId` | UUID | No | FK → User · CHECK ≠ `reporterId` | Quien es reportado: también lo jugó |
| `reason` | ENUM | No | AGRESION | LENGUAJE | JUEGO_SUCIO | OTRO | Motivo |
| `comment` | TEXT | Sí | CHECK ≤ 280 caracteres | Detalle opcional |
| `status` | ENUM | No | PENDING | SANCTIONED | DISMISSED, default PENDING | Espera al administrador o ya está resuelto |
| `createdAt` | TIMESTAMP | No | default now() | Cuándo se reportó |
| `resolvedById` | UUID | Sí | FK → User, ON DELETE SET NULL | El administrador que lo resolvió |
| `resolvedAt` | TIMESTAMP | Sí | — | Cuándo se resolvió |
| `resolutionNote` | TEXT | Sí | — | Por qué, para el registro |
| — | — | — | **UNIQUE (matchId, reporterId, reportedId)** | Un reporte por compañero y partido |

La resolución vive en la misma fila: el reporte es el registro de la moderación (quién, cuándo y por
qué). Suspender suma 7 días a `User.suspendedUntil` en la misma transacción.

## 4. Índices

Son los índices que crean las migraciones de `backend/prisma/migrations/`, con sus nombres reales.

```sql
-- Búsqueda geoespacial (HU-04). Se crea a mano: Prisma no genera índices GIST.
CREATE INDEX idx_match_location ON "Match" USING GIST (location);

-- Filtros del mapa
CREATE INDEX "Match_startsAt_idx"      ON "Match" ("startsAt");
CREATE INDEX "Match_sport_status_idx"  ON "Match" ("sport", "status");
CREATE INDEX "Match_level_idx"         ON "Match" ("level");

-- Consultas de perfil y de honor
CREATE INDEX "User_favoriteSport_idx"          ON "User" ("favoriteSport");
CREATE INDEX "Participation_userId_status_idx" ON "Participation" ("userId", "status");
CREATE INDEX "Rating_ratedId_createdAt_idx"    ON "Rating" ("ratedId", "createdAt");
CREATE INDEX "Payment_status_idx"              ON "Payment" ("status");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification" ("userId", "createdAt");  -- bandeja (HU-10)
CREATE INDEX "Report_status_createdAt_idx"       ON "Report" ("status", "createdAt");      -- panel del admin (HU-11)
CREATE INDEX "Report_reportedId_idx"             ON "Report" ("reportedId");                -- historial (HU-11)

-- Unicidad: reglas de negocio garantizadas por la base de datos
CREATE UNIQUE INDEX "User_email_key"                     ON "User" ("email");
CREATE UNIQUE INDEX "Participation_matchId_userId_key"   ON "Participation" ("matchId", "userId");
CREATE UNIQUE INDEX "Rating_matchId_raterId_ratedId_key" ON "Rating" ("matchId", "raterId", "ratedId");
CREATE UNIQUE INDEX "Payment_participationId_key"        ON "Payment" ("participationId");
CREATE UNIQUE INDEX "Payment_buyOrder_key"               ON "Payment" ("buyOrder");
CREATE UNIQUE INDEX "Notification_userId_kind_matchId_key" ON "Notification" ("userId", "kind", "matchId");
CREATE UNIQUE INDEX "Report_matchId_reporterId_reportedId_key" ON "Report" ("matchId", "reporterId", "reportedId");
```

El índice GIST es el que sostiene el argumento de escalabilidad de la competencia C3: convierte la
búsqueda geoespacial de un recorrido lineal sobre toda la tabla a una búsqueda sobre un árbol espacial.
`Rating_ratedId_createdAt_idx` sirve al cálculo de honor, que lee las últimas 20 reseñas de un jugador.

---

## 5. Escalabilidad

| Eje | Cómo lo soporta el modelo |
|---|---|
| Más comunas | `location` es geográfica, no un campo "comuna". Sumar territorio no cambia el esquema |
| Más deportes | `sport` es un ENUM: agregar uno es una migración de una línea, sin tocar tablas |
| Más niveles | `level` es un ENUM independiente del deporte: sirve igual para fútbol, pádel y básquet |
| Más historial | `Rating` es append-only; el honor se calcula sobre las últimas 20, no sobre todas |
| Más tráfico | Las consultas críticas están indexadas; `filledSlots` se mantiene desnormalizado para evitar un COUNT por cada pin del mapa |
| Auditoría de pagos | `Payment` conserva `buyOrder`, `token` y timestamps: toda transacción es reconstruible |

---

## 6. Normalización

El modelo está en **tercera forma normal (3FN)**, con cuatro desnormalizaciones deliberadas que se
justifican más abajo.

### 6.1 Verificación por forma normal

| Forma | Qué exige | Cómo la cumple el modelo |
|---|---|---|
| **1FN** | Valores atómicos, sin grupos repetidos, clave primaria en cada tabla | Cada tabla tiene clave primaria. No hay columnas multivaluadas, salvo `NotificationPreference.sports` y `days`, justificadas en la §6.3: los participantes de un partido no son una lista dentro de `Match`, son filas de `Participation`; las reseñas son filas de `Rating`. `location` es un único valor geográfico, no un par de columnas sueltas |
| **2FN** | Ningún atributo depende de solo una parte de una clave compuesta | Todas las claves primarias son simples, así que no puede haber dependencia parcial. En las claves candidatas compuestas la dependencia también es total: `status` y `amountDue` dependen del par `(matchId, userId)`; `punctuality` y `conduct` dependen del trío `(matchId, raterId, ratedId)` |
| **3FN** | Ningún atributo depende de otro atributo que no sea clave | Los datos del organizador no se copian en `Match`: se llega a ellos por `organizerId`. Los datos del jugador no se copian en `Participation` ni en `Rating`. El detalle de la transacción vive en `Payment`, separado de `Participation`. Los dominios cerrados (`sport`, `level`, estados) son tipos ENUM, no texto libre |

### 6.2 Dependencias funcionales por tabla

| Tabla | Clave primaria | Claves candidatas | Dependencias |
|---|---|---|---|
| `User` | `id` | `email` | `id` → todos los atributos |
| `Match` | `id` | — | `id` → todos los atributos |
| `Participation` | `id` | `(matchId, userId)` | `id` → todos · `(matchId, userId)` → `status`, `amountDue`, `attended`, `joinedAt` |
| `Rating` | `id` | `(matchId, raterId, ratedId)` | `id` → todos · `(matchId, raterId, ratedId)` → `punctuality`, `conduct`, `createdAt` |
| `Payment` | `id` | `participationId`, `buyOrder` | `id` → todos los atributos |
| `NotificationPreference` | `userId` | — | `userId` → todos los atributos |
| `Notification` | `id` | `(userId, kind, matchId)` cuando `matchId` no es null | `id` → todos los atributos |
| `Report` | `id` | `(matchId, reporterId, reportedId)` | `id` → todos los atributos |

### 6.3 Desnormalizaciones deliberadas

Son excepciones a la 3FN tomadas a conciencia. Cada una tiene un motivo y una regla que evita que el
dato duplicado quede inconsistente.

| Dato | Por qué rompe la forma normal | Por qué se acepta | Cómo se mantiene consistente |
|---|---|---|---|
| `User.honorScore`, `attendanceRate`, `punctualityRate`, `fairPlayRate` | Se derivan de `Rating` y `Participation` | La carta de jugador se muestra en cada pin y en cada lista: recalcular sobre 20 reseñas por cada render no escala | Solo `honor.service` los escribe, y lo hace en la misma transacción que guarda la reseña |
| `User.matchesPlayed` | Es un conteo de `Participation` | Evita un `COUNT` en cada consulta de perfil | Se incrementa al cerrar una participación como asistida |
| `Match.filledSlots` | Es un conteo de `Participation` aprobadas | Evita un `COUNT` por cada pin del mapa y permite bloquear la fila para no sobrevender cupos | Se actualiza en la misma transacción que aprueba o cancela la participación |
| `NotificationPreference.sports` y `days` | Son arreglos: un valor con varios elementos, fuera de la 1FN estricta | Son conjuntos cerrados y chicos (3 deportes, 7 días) que siempre se leen y se guardan juntos con la preferencia, y solo se consultan con `= ANY(...)` dentro del mismo `INSERT … SELECT` que reparte los avisos. Dos tablas hijas sumarían dos JOIN a cada aviso sin ganar nada | Zod valida los valores y quita repetidos; `sports` usa el mismo ENUM `Sport` que `Match`, así que la base rechaza un deporte inexistente. Si algún día se filtran por separado, se extraen a tablas hijas |
| `Match.venueName`, `address`, `location` | Si un recinto se repite, `venueName` determina `address` y `location`: dependencia transitiva | El MVP no administra recintos: cada organizador escribe el lugar de su partido, que puede ser una cancha pública sin dueño | Cada partido conserva su propia copia. Si el producto pasa a gestionar recintos, se extrae una tabla `Venue` y `Match` queda con `venueId` |

Dos atributos parecen derivados pero no lo son: **`Participation.amountDue`** y **`Payment.commission`**.
Se calculan una vez (cuota = costo / cupos, comisión = 10 %) y se **congelan**. Son hechos históricos:
si mañana cambia el costo del partido o la tasa de comisión, lo ya cobrado no debe cambiar.

### 6.4 Integridad referencial

| Relación | Al borrar el padre | Motivo |
|---|---|---|
| `Match` → `Participation`, `Rating` | `CASCADE` | Un partido eliminado no deja filas huérfanas que alteren el cálculo de honor |
| `Participation` → `Payment` | `CASCADE` | El pago no existe sin su participación |
| `User` → `NotificationPreference`, `Notification` | `CASCADE` | Las preferencias y los avisos no tienen valor sin su usuario |
| `Match` → `Notification` | `CASCADE` | Un aviso sobre un partido que ya no existe no se puede abrir |
| `Match` → `Report` | `CASCADE` | El reporte se refiere a la conducta en ese partido |
| `User` → `Report` (reportante y reportado) | `RESTRICT` | El historial de moderación no se pierde |
| `User` → `Report` (quien resolvió) | `SET NULL` | Si se borra un administrador, la resolución queda sin autor pero no desaparece |
| `User` → `Match`, `Participation`, `Rating` | `RESTRICT` | No se puede borrar un usuario con historial: se perdería la trazabilidad de pagos y reseñas |

---

## 7. Script de creación

El modelo relacional se materializa con las migraciones versionadas de Prisma. Son SQL estándar de
PostgreSQL y se aplican solas al levantar el proyecto con Docker.

| Archivo | Contenido |
|---|---|
| [`backend/prisma/schema.prisma`](../backend/prisma/schema.prisma) | Definición del modelo, fuente de verdad |
| [`migrations/20260927193802_init/migration.sql`](../backend/prisma/migrations/20260927193802_init/migration.sql) | Extensión PostGIS, tipos ENUM, las cinco tablas, índices y claves foráneas |
| [`migrations/20260927193816_indice_gist_ubicacion/migration.sql`](../backend/prisma/migrations/20260927193816_indice_gist_ubicacion/migration.sql) | Índice espacial GIST sobre `Match.location` |
| [`migrations/20261108170000_rating_notas_check/migration.sql`](../backend/prisma/migrations/20261108170000_rating_notas_check/migration.sql) | `CHECK` 1 a 5 en `Rating.punctuality` y `Rating.conduct` (cierra DEF-02) |
| [`migrations/20261108200000_participation_asistencia/migration.sql`](../backend/prisma/migrations/20261108200000_participation_asistencia/migration.sql) | Columna `Participation.attended` para registrar la asistencia (KAN-30) |
| [`migrations/20261115120000_cupos_montos_check/migration.sql`](../backend/prisma/migrations/20261115120000_cupos_montos_check/migration.sql) | `CHECK` de cupos (`filledSlots` entre 0 y `totalSlots`) y de montos (cuota, cobro, retención y comisión) |
| [`migrations/20261115130000_participation_rechazada/migration.sql`](../backend/prisma/migrations/20261115130000_participation_rechazada/migration.sql) | Valor `REJECTED` en el tipo `PartStatus` (KAN-32) |
| [`migrations/20261120180000_match_destacado/migration.sql`](../backend/prisma/migrations/20261120180000_match_destacado/migration.sql) | Columna `prioritizedAt` en `Match`: el "Falta uno" destacado (KAN-41) |
| [`migrations/20261120220000_avisos/migration.sql`](../backend/prisma/migrations/20261120220000_avisos/migration.sql) | Tablas `NotificationPreference` y `Notification`, tipo `NotificationKind`, `UNIQUE (userId, kind, matchId)` y `CHECK` de horario y radio (HU-10) |
| [`migrations/20261121150000_aviso_cubrir_invitado/migration.sql`](../backend/prisma/migrations/20261121150000_aviso_cubrir_invitado/migration.sql) | Valor `GUEST_COVER` en `NotificationKind`: a los confirmados de un destacado, cuánto pone cada uno por el invitado (KAN-44) |
| [`migrations/20261122120000_rls_supabase/migration.sql`](../backend/prisma/migrations/20261122120000_rls_supabase/migration.sql) | RLS sin políticas en las 7 tablas: la Data API de Supabase no las lee ni las escribe. La API entra como dueña y no se ve afectada (S-22, DEF-25) |
| [`migrations/20261122200000_moderacion/migration.sql`](../backend/prisma/migrations/20261122200000_moderacion/migration.sql) | Tabla `Report`, tipos `Role`, `ReportReason` y `ReportStatus`, columnas `role` y `suspendedUntil` en `User`, valor `SANCTION` en `NotificationKind`, `CHECK` de no reportarse a sí mismo y del largo del comentario, y RLS en la tabla nueva (HU-11) |
| [`migrations/20261122230000_sin_push_token/migration.sql`](../backend/prisma/migrations/20261122230000_sin_push_token/migration.sql) | Quita `User.expoPushToken`, que nunca se usó: los avisos (HU-10) llegan dentro de la app |
| [`backend/prisma/seed.ts`](../backend/prisma/seed.ts) | Datos de demo de La Florida |

`User`, `Match`, `Participation` y `Payment` llevan además un campo de auditoría `updatedAt`, que el
ORM actualiza en cada modificación.

---

*Kancha · Portafolio de Título · Lukas Guerrero · Sprint 3, septiembre 2026 · actualizado el 15 de noviembre de 2026*
