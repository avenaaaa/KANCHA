# Diagramas UML — Kancha

> Entregable del Sprint 3 (01–14 sep 2026) · Issue **KAN-22** · Evidencia de las competencias **C3** y **C4**
> Los diagramas están en Mermaid: GitHub los renderiza directamente en el navegador, así que el
> profesor los ve sin descargar nada ni abrir herramientas externas.

---

## 1. Diagrama de Casos de Uso

```mermaid
flowchart LR
    AL(["👤 Agente Libre"])
    OR(["👤 Organizador"])
    AD(["👤 Administrador"])
    TBK(["⚙️ Transbank Webpay"])
    PUSH(["⚙️ Expo Push API"])
    MAP(["⚙️ Tiles OSM / MapLibre"])

    subgraph KANCHA["Sistema Kancha"]
        UC1["UC1 · Registrarse y autenticarse<br/>HU-01"]
        UC2["UC2 · Consultar carta de jugador<br/>HU-02"]
        UC3["UC3 · Publicar partido con cupos<br/>HU-03"]
        UC4["UC4 · Buscar partidos por radio<br/>HU-04"]
        UC5["UC5 · Postularse a un partido<br/>HU-05"]
        UC6["UC6 · Aprobar postulación<br/>HU-05"]
        UC7["UC7 · Pagar cupo fraccionado<br/>HU-08"]
        UC8["UC8 · Cancelar con retención<br/>HU-09"]
        UC9["UC9 · Calificar compañeros<br/>HU-06"]
        UC10["UC10 · Recalcular puntaje de honor<br/>HU-07"]
        UC11["UC11 · Recibir notificación de cupo<br/>HU-10"]
        UC12["UC12 · Moderar reportes<br/>HU-11 · fuera del MVP"]
    end

    AL --> UC1 & UC2 & UC4 & UC5 & UC7 & UC8 & UC9 & UC11
    OR --> UC1 & UC3 & UC6 & UC9
    AD --> UC12

    UC7 -.-> TBK
    UC8 -.-> TBK
    UC9 -.->|"include"| UC10
    UC4 -.-> MAP
    UC11 -.-> PUSH
    UC3 -.->|"trigger"| UC11

    style UC12 stroke-dasharray: 5 5
    style KANCHA fill:#1A1A1A,color:#FFFFFF
```

**Lectura:** los casos de uso con línea continua forman el MVP comprometido (HU-01 a HU-10).
UC12 aparece punteado porque HU-11 está marcada `Won't have this phase` y vive en el backlog.
Las flechas punteadas hacia la derecha marcan la dependencia de sistemas externos.

---

## 2. Secuencia — Búsqueda geolocalizada (HU-04)

Es la consulta central del producto y la evidencia principal de la competencia C3.

```mermaid
sequenceDiagram
    autonumber
    actor U as Agente Libre
    participant APP as App Expo
    participant API as API Express
    participant SVC as matching.service
    participant DB as PostgreSQL + PostGIS

    U->>APP: Abre la pestaña Mapa
    APP->>APP: expo-location solicita permiso
    APP-->>U: Permiso concedido
    APP->>API: GET /matches/nearby?lat&lng&radius=5000&sport
    API->>API: middleware auth valida JWT
    API->>API: middleware validate (Zod) valida query
    API->>SVC: findNearby(coords, radio, filtros)
    SVC->>DB: $queryRaw con ST_DWithin sobre índice GIST
    DB-->>SVC: partidos ordenados por distancia
    SVC->>SVC: calcula cupos restantes por partido
    SVC-->>API: lista de partidos + distanceM
    API-->>APP: 200 OK · JSON
    APP->>APP: pinta pines en el mapa oscuro

    alt No hay partidos en el radio
        APP-->>U: "No hay partidos cerca. Amplía el radio o cambia de deporte"
    else Hay resultados
        APP-->>U: pines por deporte + carta emergente al tocar
    end
```

---

## 3. Secuencia — Pago fraccionado (HU-08)

Flujo crítico del modelo de negocio. Involucra un sistema externo y debe ser transaccional.

```mermaid
sequenceDiagram
    autonumber
    actor J as Jugador confirmado
    participant APP as App Expo
    participant API as API Express
    participant PAY as payment.service
    participant DB as PostgreSQL
    participant TBK as Transbank Webpay

    J->>APP: Toca "Pagar mi parte"
    APP->>API: POST /payments/:participationId/init
    API->>PAY: initPayment(participationId)
    PAY->>DB: lee Participation (status APPROVED)
    DB-->>PAY: amountDue = ceil(totalCost / totalSlots)
    PAY->>PAY: genera buyOrder único · comisión = 10%
    PAY->>DB: crea Payment status=INITIATED
    PAY->>TBK: Webpay.create(buyOrder, sessionId, amount, returnUrl)
    TBK-->>PAY: { url, token }
    PAY-->>API: { url, token }
    API-->>APP: 201 Created
    APP->>J: abre el formulario de Transbank

    J->>TBK: ingresa tarjeta de prueba y confirma
    TBK->>API: redirige a returnUrl con token_ws
    API->>PAY: commitPayment(token_ws)
    PAY->>TBK: Webpay.commit(token)
    TBK-->>PAY: { responseCode, authorizationCode }

    alt responseCode == 0 (aprobado)
        PAY->>DB: BEGIN TRANSACTION
        PAY->>DB: Payment.status = AUTHORIZED
        PAY->>DB: Participation.status = PAID
        PAY->>DB: COMMIT
        PAY-->>APP: cupo "Confirmado y pagado"
        APP-->>J: comprobante en pantalla
    else Pago rechazado
        PAY->>DB: Payment.status = FAILED
        PAY->>DB: libera el cupo (Participation vuelve a APPROVED)
        PAY-->>APP: error con opción de reintentar
        APP-->>J: "El pago no se completó. Intenta de nuevo"
    end
```

---

## 4. Secuencia — Calificación y recálculo de honor (HU-06 + HU-07)

```mermaid
sequenceDiagram
    autonumber
    actor J as Jugador
    participant APP as App Expo
    participant API as API Express
    participant HON as honor.service
    participant DB as PostgreSQL

    Note over J,DB: El partido terminó. Se abre una ventana de 48 h

    J->>APP: Abre "Calificar compañeros"
    APP->>API: GET /matches/:id/ratings/pending
    API-->>APP: lista de asistentes aún no calificados
    J->>APP: puntúa puntualidad y conducta (1–5)
    APP->>API: POST /matches/:id/ratings

    API->>HON: submitRating(...)
    HON->>DB: verifica ventana de 48 h

    alt Pasaron más de 48 h
        HON-->>API: 409 · partido archivado
        API-->>APP: "La ventana de calificación ya cerró"
    else Dentro de la ventana
        HON->>DB: INSERT Rating (UNIQUE matchId+raterId+ratedId)
        alt Ya había calificado a ese jugador
            DB-->>HON: violación de restricción única
            HON-->>API: 409 · doble calificación
        else Primera calificación
            DB-->>HON: OK
            HON->>DB: lee las últimas 20 reseñas del calificado
            HON->>HON: punctualityRate y fairPlayRate
            HON->>DB: lee historial PAID / NO_SHOW
            HON->>HON: attendanceRate
            HON->>HON: honorScore = agregado, 1 decimal
            HON->>DB: UPDATE User
            HON-->>API: 201 · honor actualizado
            API-->>APP: badge naranja se actualiza en vivo
        end
    end
```

---

## 5. Diagrama de Despliegue

```mermaid
flowchart TB
    subgraph DEV["💻 Máquina del profesor — git clone + docker compose up"]
        subgraph DC["Docker Compose"]
            C1["kancha-db<br/>postgis/postgis:16-3.4<br/>:5432"]
            C2["kancha-api<br/>node:22-alpine<br/>:3000"]
            C3["kancha-web<br/>nginx:alpine<br/>:8080"]
        end
        VOL[("volumen<br/>kancha-db-data")]
    end

    subgraph CLOUD["☁️ Demo pública — respaldo de la defensa"]
        R1["Render Web Service<br/>imagen Docker de la API"]
        R2["Render Static Site<br/>build web de Expo"]
        S1[("Supabase<br/>Postgres + PostGIS")]
    end

    subgraph MOBILE["📱 App nativa"]
        M1["Expo Go<br/>Android / iOS vía QR"]
    end

    subgraph EXT["Servicios externos"]
        E1["Transbank Webpay<br/>ambiente Integración"]
        E2["Expo Push API"]
        E3["Tiles OSM / OpenFreeMap"]
    end

    C3 -->|"HTTP :3000"| C2
    C2 -->|"Prisma"| C1
    C1 --- VOL
    R2 -->|"HTTPS"| R1
    R1 -->|"SSL"| S1
    M1 -->|"HTTPS"| R1
    C2 -.-> E1 & E2
    C3 -.-> E3
    M1 -.-> E3

    style DEV fill:#1A1A1A,color:#FFFFFF
    style CLOUD fill:#2A2A2A,color:#FFFFFF
```

> La versión detallada de este diagrama, junto con el **diagrama de componentes**, está en
> [`03-arquitectura.md`](03-arquitectura.md).

**Lectura:** el bloque de la izquierda es el plan A de la defensa — todo corre en la máquina del
profesor con un solo comando, sin depender de internet. El bloque de la nube es el respaldo, y la
app nativa se demuestra por QR sobre la misma API desplegada.

---

## 6. Diagrama de estados — Ciclo de vida de un partido

```mermaid
stateDiagram-v2
    [*] --> OPEN: el organizador publica (HU-03)
    OPEN --> FULL: filledSlots == totalSlots
    FULL --> OPEN: un jugador cancela y libera cupo (HU-09)
    OPEN --> CANCELLED: el organizador cancela
    FULL --> CANCELLED: el organizador cancela
    OPEN --> IN_PROGRESS: llega startsAt
    FULL --> IN_PROGRESS: llega startsAt
    IN_PROGRESS --> FINISHED: startsAt + durationMin
    FINISHED --> ARCHIVED: 48 h sin más calificaciones (HU-06)
    CANCELLED --> [*]
    ARCHIVED --> [*]

    note right of FINISHED
        Ventana abierta de 48 h
        para calificar compañeros
    end note
```

---

## 7. Diagrama de clases — Modelo de dominio

Las cinco entidades del sistema con sus atributos, tipos y multiplicidades. Corresponde uno a uno
con `backend/prisma/schema.prisma`.

```mermaid
classDiagram
    direction TB

    class User {
        +UUID id
        +String email
        -String passwordHash
        +String name
        +Sport favoriteSport
        +Int matchesPlayed
        +Decimal honorScore
        +Decimal attendanceRate
        +Decimal punctualityRate
        +Decimal fairPlayRate
        +String expoPushToken
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Match {
        +UUID id
        +UUID organizerId
        +String title
        +Sport sport
        +SkillLevel level
        +String venueName
        +String address
        +Geography location
        +DateTime startsAt
        +Int durationMin
        +Int totalSlots
        +Int filledSlots
        +Int totalCost
        +MatchStatus status
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Participation {
        +UUID id
        +UUID matchId
        +UUID userId
        +PartStatus status
        +Int amountDue
        +DateTime joinedAt
        +DateTime updatedAt
    }

    class Rating {
        +UUID id
        +UUID matchId
        +UUID raterId
        +UUID ratedId
        +Int punctuality
        +Int conduct
        +DateTime createdAt
    }

    class Payment {
        +UUID id
        +UUID participationId
        +Int amount
        +Int commission
        +Int retained
        +PayStatus status
        +String buyOrder
        +String sessionId
        +String token
        +DateTime authorizedAt
        +DateTime createdAt
        +DateTime updatedAt
    }

    class Sport {
        <<enumeration>>
        FUTBOL
        PADEL
        BASQUETBOL
    }

    class SkillLevel {
        <<enumeration>>
        PRINCIPIANTE
        MEDIO
        AVANZADO
    }

    class MatchStatus {
        <<enumeration>>
        OPEN
        FULL
        IN_PROGRESS
        FINISHED
        ARCHIVED
        CANCELLED
    }

    class PartStatus {
        <<enumeration>>
        PENDING
        APPROVED
        PAID
        CANCELLED
        NO_SHOW
    }

    class PayStatus {
        <<enumeration>>
        INITIATED
        AUTHORIZED
        FAILED
        REFUNDED
        RETAINED
    }

    User "1" --> "0..*" Match : organiza
    User "1" --> "0..*" Participation : postula
    Match "1" *-- "0..*" Participation : recibe
    Participation "1" *-- "0..1" Payment : genera
    Match "1" *-- "0..*" Rating : contextualiza
    User "1" --> "0..*" Rating : califica (rater)
    User "1" --> "0..*" Rating : es calificado (rated)

    User ..> Sport
    Match ..> Sport
    Match ..> SkillLevel
    Match ..> MatchStatus
    Participation ..> PartStatus
    Payment ..> PayStatus
```

**Lectura:** el rombo relleno es composición: una participación, una reseña o un pago no existen sin
su partido o su participación, y se borran con ellos (`ON DELETE CASCADE`). La flecha simple es
asociación: el usuario sobrevive aunque se borre el partido. `honorScore` y las tres tasas de `User`
admiten valor nulo, que la interfaz muestra como "Sin calificaciones aún".

---

## 8. Diagrama de clases — Servicios de negocio

Las operaciones del sistema viven en la capa de servicios, no en las entidades. Cada servicio es un
módulo de funciones puras: recibe datos, devuelve un resultado y no guarda estado.

```mermaid
classDiagram
    direction LR

    class HonorService {
        <<service>>
        +calculateHonor(ratings, attendance) HonorBreakdown
        +isRatingWindowOpen(startsAt, durationMin, now) Boolean
    }

    class PaymentService {
        <<service>>
        +calculateAmountDue(totalCost, totalSlots) Int
        +calculateCommission(amount, rate) Int
        +calculateRefund(amountPaid, startsAt, now) RefundBreakdown
        +buildBuyOrder(participationId, now) String
    }

    class MatchingService {
        <<service>>
        +findNearby(lat, lng, radiusM, filters) Match[]
        +approveParticipation(participationId) Participation
    }

    class HonorBreakdown {
        <<value object>>
        +Number attendanceRate
        +Number punctualityRate
        +Number fairPlayRate
        +Number honorScore
    }

    class RatingSample {
        <<value object>>
        +Int punctuality
        +Int conduct
    }

    class AttendanceSample {
        <<value object>>
        +Int attended
        +Int noShow
    }

    class RefundBreakdown {
        <<value object>>
        +Int refunded
        +Int retained
        +Boolean withinRetentionWindow
    }

    class AppError {
        +Int statusCode
        +String code
        +String message
        +Unknown details
    }

    class Env {
        <<config>>
        +Number PLATFORM_COMMISSION_RATE
        +Number RETENTION_WINDOW_HOURS
        +Number RETENTION_RATE
        +Number RATING_WINDOW_HOURS
        +Int HONOR_SAMPLE_SIZE
    }

    class User
    class Match
    class Participation
    class Rating
    class Payment

    HonorService ..> RatingSample : recibe
    HonorService ..> AttendanceSample : recibe
    HonorService ..> HonorBreakdown : devuelve
    HonorService ..> Env : lee
    PaymentService ..> RefundBreakdown : devuelve
    PaymentService ..> Env : lee

    HonorService ..> Rating : promedia
    HonorService ..> User : actualiza honorScore
    PaymentService ..> Payment : crea y confirma
    PaymentService ..> Participation : marca PAID
    MatchingService ..> Match : busca por radio
    MatchingService ..> Participation : aprueba y cuenta cupos
    MatchingService ..> AppError : lanza
```

**Lectura:** las operaciones de `HonorService` y `PaymentService` existen en el código y tienen 22
pruebas unitarias. `MatchingService` y la persistencia de los resultados (flechas hacia `User`,
`Rating`, `Payment`, `Participation` y `Match`) son diseño: se implementan junto con sus historias.
`Env` reúne los parámetros de negocio configurables, para que cambiar la comisión o la ventana de
retención no exija tocar código.

---

*Kancha · Portafolio de Título · Lukas Guerrero · Sprint 3, septiembre 2026 · actualizado el 4 de octubre de 2026*
