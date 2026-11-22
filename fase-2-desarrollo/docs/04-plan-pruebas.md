# Plan de Pruebas — Kancha

> Fase 2 · Evidencia de la competencia **C1** (pruebas de certificación)
> Cubre los cinco tipos que pide la pauta: unitarias, caja negra, integración, rendimiento y seguridad.
> Corte del documento: 22 de noviembre de 2026 (Sprint 8).

Este plan distingue siempre entre lo **ejecutado** (ya corre y pasa) y lo **diseñado** (caso definido,
se automatiza cuando exista el código que prueba). Al 22 de noviembre están ejecutados los casos de
las once historias del MVP (HU-01 a HU-11) y de las tareas KAN-30, KAN-32, KAN-37, KAN-38, KAN-41 y KAN-44. Las cinco pruebas de
rendimiento se ejecutaron el 20 de noviembre. Siguen sin ejecutar las unitarias pendientes de la sección 4.4.

---

## 1. Objetivo y alcance

**Objetivo.** Demostrar que las reglas de negocio del MVP (HU-01 a HU-10; HU-10 volvió al alcance el 20 de noviembre) se cumplen, que los
componentes se integran sin errores y que la aplicación resiste los abusos y la carga que puede
recibir en una demo y en un piloto en La Florida.

| Dentro del alcance | Fuera del alcance |
|---|---|
| API REST (`fase-2-desarrollo/backend`) | Pruebas con dinero real (Transbank solo en ambiente de Integración) |
| Reglas de honor, pago fraccionado y retención | Moderación de reportes (HU-11, fuera del MVP) |
| Búsqueda geoespacial con PostGIS | Pruebas en tiendas de aplicaciones |
| Componentes críticos de la app Expo | Pruebas de carga a escala de producción |
| Arranque completo con `docker compose up` | |

---

## 2. Estrategia por tipo de prueba

| Tipo | Qué responde | Herramienta | Dónde vive | Estado al 22-nov |
|---|---|---|---|---|
| **Unitarias** | ¿Cada regla de negocio calcula bien, aislada? | Vitest 2 en el backend · Jest 30 en la app | `backend/tests/unit/` y `mobile/src/__tests__/` | **114 del backend y 43 de la app, todas pasan** |
| **Caja negra** | ¿El sistema responde lo que promete el criterio de aceptación, sin mirar el código? | Vitest + Supertest, Swagger UI | `backend/tests/integration/` | 53 casos (CN-01 a CN-53), todos cubiertos |
| **Integración** | ¿API, base de datos y Transbank funcionan juntos? | Vitest + Supertest + PostGIS real | `backend/tests/integration/` | **104 ejecutadas contra PostGIS real, todas pasan** |
| **Rendimiento** | ¿La búsqueda por radio responde rápido con datos reales? | k6, `EXPLAIN ANALYZE` | `backend/tests/performance/` | **5 de 5 ejecutadas el 20-nov, todas cumplen** |
| **Seguridad** | ¿Se puede entrar, leer o cobrar lo que no corresponde? | Supertest, `npm audit`, revisión OWASP | `backend/tests/integration/` | 23 controles: 22 verificados y S-11 parcial (22-nov) |

Todas las herramientas son gratuitas, coherente con la decisión de costo $0 del proyecto.

---

## 3. Ambiente de pruebas

| Elemento | Configuración |
|---|---|
| Runtime | Node.js 22, TypeScript estricto |
| Base de datos | `postgis/postgis:16-3.4`, base `kancha_test`, creada con las mismas migraciones que producción |
| Datos | `prisma/seed.ts`: usuarios y partidos de los tres deportes en un radio de 5 km de La Florida |
| Pagos | Transbank Webpay Plus, ambiente de Integración, tarjetas de prueba |
| Integración continua | GitHub Actions (`.github/workflows/ci.yml`): lint, build y `npm test` en cada push y Pull Request a `main` y `develop` |
| Variables | Las pruebas unitarias reciben el entorno desde `vitest.config.ts`; no necesitan `.env` |

---

## 4. Pruebas unitarias

Prueban las funciones puras de `services/`, sin base de datos ni HTTP. Se ejecutan con
`npm test` dentro de `fase-2-desarrollo/backend` y en cada push por el CI.

### 4.1 Resultado de la ejecución

| Dato | Valor |
|---|---|
| Fecha | 22 de noviembre de 2026 |
| Archivos de prueba del backend | 23 (10 unitarios y 13 de integración) |
| Casos del backend | 218 ejecutados · 218 pasan · 0 fallan (114 unitarias, 104 de integración) |
| Cobertura de `services/` y `utils/` | 98,25 % de líneas · 91,14 % de ramas · 98,37 % de funciones · el CI la mide en cada push y falla bajo el 80 % |
| Casos de la app (Jest + React Native Testing Library) | 43 ejecutados · 43 pasan · el CI los corre en cada push desde el 15-nov |
| Comando | `npm test` en `fase-2-desarrollo/backend` (con la base `kancha_test` levantada) y en `fase-2-desarrollo/mobile` |

### 4.2 Casos ejecutados

| ID | Función | Caso | HU | Resultado |
|---|---|---|---|---|
| U-01 | `calculateHonor` | Sin reseñas ni asistencias devuelve `null`, no `0` | HU-01, HU-02 | Pasa |
| U-02 | `calculateHonor` | Jugador perfecto llega a 10.0 | HU-07 | Pasa |
| U-03 | `calculateHonor` | Mínimo de la escala llega a 0.0, distinto de `null` | HU-07 | Pasa |
| U-04 | `calculateHonor` | Asistencia = asistidos / cerrados (9 de 10 → 90 %) | HU-07 | Pasa |
| U-05 | `calculateHonor` | Promedia solo las últimas 20 reseñas | HU-07 | Pasa |
| U-06 | `calculateHonor` | Redondea el puntaje a un decimal | HU-07 | Pasa |
| U-07 | `isRatingWindowOpen` | Cerrada mientras el partido no termina | HU-06 | Pasa |
| U-08 | `isRatingWindowOpen` | Se abre apenas termina el partido | HU-06 | Pasa |
| U-09 | `isRatingWindowOpen` | Sigue abierta a las 47 h 59 min | HU-06 | Pasa |
| U-10 | `isRatingWindowOpen` | Se cierra pasadas las 48 h | HU-06 | Pasa |
| U-11 | `calculateAmountDue` | Divide el arriendo entre los cupos (40.000 / 8 = 5.000) | HU-08 | Pasa |
| U-12 | `calculateAmountDue` | Redondea hacia arriba (30.000 / 7 = 4.286) | HU-08 | Pasa |
| U-13 | `calculateAmountDue` | Partido gratuito no cobra | HU-08 | Pasa |
| U-14 | `calculateAmountDue` | Rechaza cupos en 0 y costo negativo | HU-08 | Pasa |
| U-15 | `calculateCommission` | Aplica el 10 % por defecto (5.000 → 500) | HU-08 | Pasa |
| U-16 | `calculateCommission` | Devuelve siempre un entero | HU-08 | Pasa |
| U-17 | `calculateRefund` | Más de 12 h antes: reembolso del 100 % | HU-09 | Pasa |
| U-18 | `calculateRefund` | Exactamente 12 h antes: reembolso del 100 % | HU-09 | Pasa |
| U-19 | `calculateRefund` | 11 h 59 min antes: retiene el 50 % | HU-09 | Pasa |
| U-20 | `calculateRefund` | Retenido más reembolsado siempre suma lo pagado | HU-09 | Pasa |
| U-21 | `buildBuyOrder` | Respeta el máximo de 26 caracteres de Transbank | HU-08 | Pasa |
| U-22 | `buildBuyOrder` | Órdenes distintas para participaciones distintas | HU-08 | Pasa |

Casos agregados en el Sprint 6:

| IDs | Módulo | Qué prueban | HU |
|---|---|---|---|
| U-23 a U-25 | `match.service` · `assertFutureStart` | Fecha futura aceptada; pasada y "ahora exacto" rechazadas con 422 `MATCH_IN_PAST` | HU-03 |
| U-26 a U-30 | `createMatchSchema` | Valores por defecto, `totalSlots = 0`, partido sin cupo libre, campos extra y montos con decimales | HU-03 |
| U-31 a U-34 | `nearbyQuerySchema` | Radio de 5 km por defecto, varios deportes, inyección en `sport`, coordenadas no numéricas | HU-04 |
| U-35, U-36 | `toMatchSummary` | Cupos libres, cuota por jugador y honor `null` del organizador | HU-04 |
| U-37 a U-41 | `matching.service` · `checkCanJoin` | Organizador, partido lleno, iniciado y cancelado | HU-05 |
| U-42 a U-46 | `matching.service` · `decideApproval` | Suma de cupo, paso a `FULL`, último cupo ya tomado, aprobación ajena (403), doble aprobación | HU-05 |
| U-47 a U-54 | `auth.service` y `registerSchema` | El hash nunca sale, honor `null`, correo solo en el perfil propio, JWT, contraseña de 7 y de 8 caracteres | HU-01 |
| U-55, U-56 | `utils/errors.ts` | Cada constructor devuelve su código HTTP (cierra DEF-01) | — |

Casos agregados en el Sprint 7:

| IDs | Módulo | Qué prueban | HU |
|---|---|---|---|
| U-57 a U-61 | `payment.service` · `decideCheckout` | Paga la cuota más el 10 % de servicio; 403 con el cupo de otro; 409 sin aprobar, ya pagado, partido iniciado o gratis | HU-08 |
| U-62 | `payment.service` · `isApproved` | Solo `response_code` 0 con estado `AUTHORIZED` es un pago aprobado | HU-08 |
| U-63 | `payment.service` · `decideRelease` | Liberar un cupo reabre el partido lleno y nunca baja de cero | HU-08 |
| U-64 a U-68 | `payment.service` · `decideCancellation` | 403 con el cupo de otro; no se cancela dos veces ni un partido iniciado; pendiente sin cupo; con 12 h el 100 %; a menos de 12 h retiene el 50 % y el recinto recibe lo retenido menos la comisión | HU-09 |

Casos agregados el 8 de noviembre (Sprint 7, con las historias adelantadas del Sprint 8):

| IDs | Módulo | Qué prueban | HU |
|---|---|---|---|
| U-69 | `honor.service` · `ratingWindow` | `NOT_FINISHED` antes del término, `OPEN` desde el término hasta las 48 h exactas, `CLOSED` a las 48 h 01 min | HU-06 |
| U-70 | `honor.service` · `checkCanRate` | Solo califica quien jugó (organizador o cupo confirmado), nunca a sí mismo ni a quien no jugó, y solo con la ventana abierta | HU-06 |
| U-71 | `honor.service` · `checkCanCloseAttendance` | Solo el organizador cierra la asistencia, una vez por confirmado y con el partido terminado | KAN-30 |

Casos agregados el 15 de noviembre (Sprint 8, tras la auditoría de cierre):

| IDs | Módulo | Qué prueban | Origen |
|---|---|---|---|
| U-72 | `matching.service` · `canRejoin` | Vuelve a postular quien no llegó a pagar; quien canceló un cupo pagado, no | DEF-13 |
| U-73 a U-75 | `config/env` · `parseEnv` | En producción real la clave JWT de ejemplo impide arrancar y la demo local la acepta; Transbank de producción exige credenciales; valores por defecto | KAN-31 |
| U-76 a U-78 | `errorHandler` | Un error de negocio sale con su código; Zod sale como 422; un error inesperado sale como 500 genérico sin filtrar el mensaje interno | KAN-31 |
| U-79 | `matching.service` · `decideRejection` | Solo el organizador rechaza, y solo una postulación pendiente | KAN-32 |

Casos agregados el 16 de noviembre (Sprint 8, botón "Falta uno"):

| IDs | Módulo | Qué prueban | Origen |
|---|---|---|---|
| U-80 a U-82 | `matching.service` · `urgentWindow` | Sin el filtro no cambia nada; con el filtro exige exactamente 1 cupo libre y un inicio dentro de 2 h; si además viene un horario, manda el límite que termina antes | KAN-37 |

Casos agregados el 20 de noviembre (Sprint 8, "Falta uno" destacado):

| IDs | Módulo | Qué prueban | Origen |
|---|---|---|---|
| U-83 a U-87 | `match.service` · `checkCanPrioritize` | Se destaca si falta 1 y empieza en 2 h o menos (2 h justas entran); solo el organizador; no con 2 o más faltantes, antes de la ventana, dos veces, ya iniciado o cerrado | KAN-41, KAN-44 |
| U-88 | `payment.service` · `guestShare` | La cuota del invitado se reparte entre los que ya están, hacia arriba y en pesos enteros; en cancha gratis es 0 | KAN-41 |
| U-89 | `matching.service` · `decideApproval` | Con el partido destacado, el cupo que se aprueba entra gratis (amountDue 0) | KAN-41 |
| U-90 | `matching.service` · `isTrustedGuest` | Entra al tiro a un destacado con honor 7 o más y 3 calificadores; un novato (NULL) o un honor de 6,9 esperan al organizador | KAN-41 |
| U-91 | `notification.service` · `faltaUnoMessage` | Dice cuántos faltan, la hora de Chile (22:30 Z son las 19:30 en noviembre) y, si está destacado, "Entras gratis" | HU-10 |
| U-92 | `notification.service` · `nearbyMessage` | Deporte, día, hora y recinto del partido nuevo | HU-10 |
| U-93 | `notification.service` · `joinRequestMessage`, `joinApprovedMessage` | Al organizador, la postulación (urgente si es un destacado); al jugador, su aprobación, con o sin pago | HU-10 |
| U-94 | `notification.service` · `priorityOfferMessage` | "¿Lo destacas?" cuando falta 1 | HU-10, KAN-41, KAN-44 |
| U-95 | `notification.service` · `nudgeMessage` | Ánimo distinto para quien nunca jugó ("Tu primer partido te espera") y para quien lleva 16 días sin jugar | HU-10 |
| U-96 | `notification.service` · `sortInbox`, `isUrgent` | Los "Falta uno" vigentes primero y, entre ellos, los destacados; uno lleno, empezado o leído deja de destacarse | HU-10 |
| U-97 | `notification.service` · `defaultPreferences` | Sin preferencias guardadas no hay nada activado; viene marcado el deporte favorito | HU-10 |
| U-98 | `notification.schema` · `preferencesSchema` | Horario que termina después de empezar, ubicación y deporte si activa algo, días si activa "cerca", radio y días válidos, sin repetidos | HU-10 |
| U-99 | `notification.service` · `guestCoverMessage` | A los confirmados de un destacado: la cuota del invitado y cuánto pone cada uno, en pesos con punto de miles | KAN-44 |
| U-100 | `matching.service` · `decideApproval` | Destacado al que una cancelación dejó con 2 libres: quien entra paga su parte ($6.000) | KAN-44 · DEF-28 |
| U-101 | `matching.service` · `isTrustedGuest` | Con menos de 3 personas distintas que lo calificaron, ni un honor de 10 entra al tiro | KAN-41 · DEF-30 |
| U-102 | `match.service` · `isPriorityActive` | El destacado rige con 1 libre y lleno (ya entró el invitado); con 2 libres o sin destacar, no | KAN-44 · DEF-28 |
| U-103 | `moderation.service` · `checkCanReport` | Un compañero (o el organizador) reporta a otro una vez empezado el partido | HU-11 |
| U-104 | `moderation.service` · `checkCanReport` | No reporta quien no jugó, ni a sí mismo, ni a quien no jugó, ni antes de empezar | HU-11 |
| U-105 | `moderation.service` · `isSuspended` | Suspendido hasta una fecha futura; NULL o una fecha pasada, no | HU-11 |
| U-106 | `moderation.service` · `suspensionEnd` | Cada sanción suma 7 días: desde ahora, o a lo que quedaba si seguía suspendido | HU-11 |
| U-107 | `notification.service` · `sanctionMessage` | El aviso al sancionado dice el motivo, el partido y hasta cuándo, en hora de Chile | HU-11 |
| U-108 | `moderation.schema` · `createReportSchema` | Jugador válido, motivo de la lista, comentario hasta 280 y sin campos extra | HU-11 |
| U-109 | `moderation.schema` · `resolveReportSchema` | La resolución es suspender o descartar, nada más | HU-11 |

### 4.3 Pruebas de la app

| ID | Componente | Caso | Resultado |
|---|---|---|---|
| M-01 a M-06 | `lib/format.ts` | Pesos chilenos, texto "Falta 1 / Faltan N", distancias, días y rangos del filtro "Cuándo" | Pasa |
| M-07, M-08 | `HonorBadge` | Sin reseñas muestra "Sin calificaciones aún" y nunca 0; con reseñas, un decimal | Pasa |
| M-09 | `SlotBar` | Anuncia "3 de 4 jugadores" a los lectores de pantalla | Pasa |
| M-10, M-11 | `SportFilter` | Los tres deportes en el orden Fútbol, Pádel, Básquet (se comprueba la posición de cada chip); tocar un chip avisa cuál cambió | Pasa |
| M-12, M-13 | `MatchCard` | Muestra cupos, cuota, lugar y distancia; tocarla abre el partido | Pasa |
| M-14 a M-16 | `useOrigin` · `resolveOrigin` | Posición precisa en la comuna se usa tal cual; posición de red con km de error y posición fuera de la comuna buscan en La Florida (DEF-05) | Pasa |
| M-17 | `RatingPicker` | Ofrece notas de 1 a 5, marca la elegida y avisa al tocar otra (HU-06) | Pasa |
| M-18, M-19 | `PlayerCard` | Sin reseñas dice "Sin calificaciones aún" y nunca muestra el correo; con reseñas muestra honor, partidos jugados y las tres métricas (HU-02) | Pasa |
| M-20, M-21 | `lib/format.ts` | La fecha límite se lee bien tras "hasta" (hoy, mañana o el día); singular y plural | Pasa |
| M-22 | `lib/status.ts` · `playerStatus` | Cada estado del cupo tiene su rótulo: un cupo cancelado o rechazado nunca "espera al organizador" (DEF-17) | Pasa |
| M-23, M-24 | `lib/status.ts` · `matchPollInterval` | El detalle se refresca solo mientras hay algo que esperar, y no en los demás casos (DEF-16) | Pasa |
| M-25 | `authStore` + `queryClient` | Al salir y al entrar con otra cuenta no queda ningún dato de la anterior (DEF-15) | Pasa |
| M-26 | `filterStore` | El filtro de nivel parte vacío, se activa y se quita al tocarlo de nuevo | Pasa |
| M-27 | `filterStore` | "Falta uno" se activa y se apaga; activarlo limpia el día elegido y elegir un día lo apaga (KAN-37) | Pasa |
| M-28 a M-30 | `lib/places.ts` | El centro de La Florida cae dentro del límite real y Ñuñoa o Santiago centro, fuera; todas las canchas ofrecidas están dentro de la comuna; la dirección se arma con calle y número, y sin calle no se propone nada (KAN-38) | Pasa |
| M-31 | `lib/places.ts` · `reverseGeocode` | La dirección sale del servicio de OpenStreetMap; si el servicio responde mal o no hay conexión, no se inventa nada y el campo queda para escribirlo (KAN-38, DEF-22) | Pasa |
| M-32 | `DragSheet` · `sheetSnap` | Al soltar el panel de partidos, un gesto rápido manda (hacia arriba abre, hacia abajo cierra) y si fue lento gana la posición más cercana (KAN-39) | Pasa |
| M-33 | `UrgentButton` | "Falta uno" avisa a los lectores de pantalla si está encendido y responde al toque (KAN-37, KAN-39) | Pasa |
| M-34 | `lib/places.ts` · `venuesForSport` | Las canchas se filtran por deporte; cada una tiene tipo (pública, municipal o privada), al menos un deporte e identificador único (KAN-40) | Pasa |
| M-35 | `MatchCard` | Un partido destacado dice "Entra gratis" en vez de cuántos faltan, y lo anuncia a los lectores de pantalla (KAN-41) | Pasa |
| M-36 | `lib/notifications.ts` · `firstUrgent` | Sobre el mapa se destaca el primer "Falta uno" que la API marca como vigente; uno lleno no (HU-10) | Pasa |
| M-37 | `lib/notifications.ts` · `timeAgo` | "ahora", "hace 5 min", "hace 2 h", "ayer", "hace 3 días" (HU-10) | Pasa |
| M-38 | `lib/notifications.ts` · `toggleIn`, `hourLabel` | Elegir días y deportes, y la hora del horario (HU-10) | Pasa |
| M-39 | `lib/format.ts` · `countdown` | Cuenta atrás de la carta: días, horas y minutos, minutos:segundos en la última hora, "En juego" mientras dura y nada al terminar (KAN-43) | Pasa |
| M-40 | `data/laFlorida.json` · `venuesForSport` | Las multicanchas de pasto sintético no se ofrecen para básquetbol, y ninguna cancha pública ofrece pádel (KAN-43) | Pasa |
| M-41 | `theme/typography.ts` · `antonLine` | En iOS, Anton toma su alto natural (1,505 veces el tamaño) y los márgenes negativos le devuelven el espacio de diseño; en Android y la web no cambia nada (KAN-29) | Pasa |
| M-42 | `lib/moderation.ts` · `REPORT_REASONS` | Los cuatro motivos de reporte con su texto, en orden (HU-11) | **Pasa** |
| M-43 | `lib/moderation.ts` · `suspendedUntil`, `suspensionText` | La suspensión se muestra solo mientras dura, con su fecha de término (HU-11) | **Pasa** |

### 4.4 Unitarias pendientes

| Módulo | Qué falta probar | Sprint |
|---|---|---|
| `payment.service.ts` | Ramas de montos negativos en comisión y reembolso | 8 |
| `KanchaMap` | Pines y selección en web y en móvil | 8 |

---

## 5. Pruebas de caja negra

Se diseñan desde los criterios de aceptación de cada historia, sin mirar el código, con dos
técnicas: **partición de equivalencia** (una entrada representativa por clase) y **análisis de
valores límite** (justo antes, en y justo después de cada borde).

"Cubierto" significa que el caso ya está automatizado y pasa (se indica la prueba unitaria que lo
ejecuta). "Diseñado" significa que el caso está definido y se automatiza contra el endpoint cuando
exista.

| ID | HU | Técnica | Entrada | Resultado esperado | Estado |
|---|---|---|---|---|---|
| CN-01 | HU-01 | Equivalencia | Registro con datos válidos | 201 · `honorScore` es `null` | Cubierto (integración) |
| CN-02 | HU-01 | Equivalencia | Correo ya registrado | 409 | Cubierto (integración) |
| CN-03 | HU-01 | Límite | Contraseña bajo el mínimo | 422 | Cubierto (integración) |
| CN-04 | HU-03 | Equivalencia | Partido con fecha futura y cupos > 0 | 201 · estado `OPEN` | Cubierto (integración) |
| CN-05 | HU-03 | Límite | `startsAt` en el pasado | 422 | Cubierto (integración) |
| CN-06 | HU-03 | Límite | `totalSlots` = 0 | 422 | Cubierto (integración) |
| CN-07 | HU-04 | Límite | Partido a 4,9 km con radio de 5 km | Aparece en el resultado | Cubierto (integración) |
| CN-08 | HU-04 | Límite | Partido a 5,1 km con radio de 5 km | No aparece | Cubierto (integración) |
| CN-09 | HU-04 | Equivalencia | Filtro por deporte = pádel | Solo partidos de pádel | Cubierto (integración) |
| CN-10 | HU-04 | Equivalencia | Partido lleno o ya iniciado | No aparece | Cubierto (integración) |
| CN-11 | HU-05 | Equivalencia | Postular dos veces al mismo partido | 409 | Cubierto (integración) |
| CN-12 | HU-05 | Límite | Dos jugadores toman el último cupo a la vez | Solo uno queda aprobado | Cubierto (integración) |
| CN-13 | HU-06 | Límite | Calificar a las 47 h 59 min | Aceptado | Cubierto (U-09, U-69 e integración) |
| CN-14 | HU-06 | Límite | Calificar a las 48 h 01 min | Rechazado y el partido queda `ARCHIVED` | Cubierto (U-10, U-69 e integración) |
| CN-15 | HU-06 | Límite | Calificar antes de que termine el partido | Rechazado | Cubierto (U-07 e integración) |
| CN-16 | HU-06 | Límite | Nota 6 (la nota 0 la rechaza la misma regla de Zod y el mismo CHECK) | 422, y la base también la rechaza (CHECK) | Cubierto (integración, con nota 6) |
| CN-17 | HU-06 | Equivalencia | Calificar dos veces al mismo jugador | 409, una sola reseña guardada | Cubierto (integración) |
| CN-18 | HU-07 | Equivalencia | Usuario sin ninguna señal | "Sin calificaciones aún" (`null`) | Cubierto (U-01) |
| CN-19 | HU-07 | Límite | Todas las notas en 5 y asistencia completa | 10.0 | Cubierto (U-02) |
| CN-20 | HU-07 | Límite | Todas las notas en 1 y solo inasistencias | 0.0 | Cubierto (U-03) |
| CN-21 | HU-07 | Límite | 50 reseñas, las 20 más recientes en 5 | Cuenta solo las 20 recientes | Cubierto (U-05) |
| CN-22 | HU-08 | Equivalencia | Arriendo 40.000 en 8 cupos | Cuota de 5.000 | Cubierto (U-11) |
| CN-23 | HU-08 | Límite | Arriendo 30.000 en 7 cupos | Cuota de 4.286 (hacia arriba) | Cubierto (U-12) |
| CN-24 | HU-08 | Límite | Arriendo 0 | Cuota de 0 | Cubierto (U-13) |
| CN-25 | HU-08 | Límite | Cupos = 0 | Error | Cubierto (U-14) |
| CN-26 | HU-09 | Límite | Cancelar a 12 h 00 min | Reembolso del 100 % | Cubierto (U-18, U-67 e integración) |
| CN-27 | HU-09 | Límite | Cancelar a 11 h 59 min | Retiene el 50 % | Cubierto (U-19, U-68 e integración) |
| CN-28 | HU-09 | Equivalencia | Monto impar (4.287) | Retenido + reembolsado = pagado | Cubierto (U-20) |
| CN-29 | HU-08 | Equivalencia | Pago rechazado en Webpay | El cupo se libera | Cubierto (integración) |
| CN-30 | KAN-30 | Equivalencia | Cerrar dos veces la asistencia del mismo jugador | 409 y un solo partido sumado | Cubierto (integración) |
| CN-31 | KAN-30 | Equivalencia | Marcar "no se presentó" | `NO_SHOW`, asistencia 0 %, fuera de las calificaciones | Cubierto (integración) |
| CN-32 | KAN-30 | Límite | Cerrar la asistencia antes de que termine el partido | 409 | Cubierto (U-71 e integración) |
| CN-33 | HU-09 | Equivalencia | Volver a postular tras cancelar un cupo ya pagado | 409, y la retención queda intacta | Cubierto (U-72 e integración) |
| CN-34 | HU-04 | Equivalencia | Filtrar por nivel; nivel inexistente | Solo partidos de ese nivel; 422 | Cubierto (integración) |
| CN-35 | HU-05 | Límite | Forzar en la base más cupos ocupados que el total, o negativos | La base lo rechaza (CHECK) | Cubierto (integración) |
| CN-36 | HU-09 | Límite | Forzar en la base una retención mayor que lo cobrado | La base lo rechaza (CHECK) | Cubierto (integración) |
| CN-37 | KAN-32 | Equivalencia | Rechazar una postulación ya aprobada, o dos veces la misma | 409 | Cubierto (U-79 e integración) |
| CN-38 | KAN-32 | Límite | Aprobar y rechazar la misma postulación a la vez | Una gana, la otra recibe 409 y los cupos calzan | Cubierto (integración) |
| CN-39 | KAN-37 | Equivalencia | Filtro "Falta uno" con tres partidos: 1 cupo libre en 1 h; 2 cupos libres en 1 h; 1 cupo libre en 3 h | Solo aparece el primero; sin el filtro aparecen los tres | Cubierto (U-80, U-81 e integración) |
| CN-40 | KAN-37 | Límite | Partido que empieza en 1 h 59 min y otro en 2 h 01 min; `urgent=quizas` | Aparece el primero y no el segundo; 422 | Cubierto (integración) |
| CN-41 | KAN-41 | Equivalencia | Destacar un partido al que le falta 1 y que empieza en 1,5 h; postula un novato y luego un jugador con honor 8 | Va primero en "Falta uno"; el novato queda `PENDING` sin ocupar el cupo; el de honor 8 queda `APPROVED` al tiro, con cuota 0, y pagar responde 409 `NOTHING_TO_PAY` | Cubierto (integración) |
| CN-42 | KAN-41 | Límite | Destacar siendo otro usuario, dos veces, con 3 h de anticipación, con 2 faltantes (KAN-44), con un id inválido | 403; 409 `ALREADY_PRIORITY`, `PRIORITY_TOO_EARLY`, `PRIORITY_NOT_AVAILABLE`; 422 | Cubierto (U-83 a U-87 e integración) |
| CN-43 | HU-10 | Equivalencia | Leer las preferencias sin haber guardado nada; guardarlas; guardar con un aviso activo y sin ubicación, o con el horario al revés; leer la bandeja sin token | Todo apagado y el deporte favorito; se guardan; 422; 422; 401 | Cubierto (integración) |
| CN-44 | HU-10 | Equivalencia | Publicar un pádel a 1 km ante seis usuarios: uno que acepta partidos cerca y cinco que no calzan (apagado, otro deporte, otro día, otra hora, a 20 km) | Solo el primero recibe "Partido de pádel cerca"; ni los otros ni el organizador | Cubierto (integración) |
| CN-45 | HU-10 | Equivalencia | Partido al que le falta 1 y empieza en 1 h; barrido dos veces; otro al que le falta 1 y empieza en 1,5 h, que el organizador destaca; el primero se llena | Un solo "Falta uno", primero en la bandeja; al organizador, "¿Lo destacas?" (leído al destacar); al destacar, el "Falta uno" del otro pasa a "Entras gratis"; lleno, deja de destacarse; marcar el aviso de otro, 404 | Cubierto (integración) |
| CN-46 | HU-10 | Equivalencia | Un jugador postula y el organizador lo aprueba | El organizador recibe "Tienes postulaciones por revisar" y el jugador "Te aceptaron", con "Paga tu parte" | Cubierto (integración) |
| CN-47 | HU-10 | Límite | Barrido dos veces con un usuario que nunca jugó y se registró hace 15 días, uno recién registrado y otro que acaba de postular, todos con partidos cerca | Al primero un solo "Tu primer partido te espera"; al recién registrado y al que postuló, nada (DEF-29) | Cubierto (integración) |
| CN-48 | KAN-44 | Equivalencia | Partido de $24.000 para 4 con un confirmado y un pendiente; el organizador lo destaca con 1 faltante | El confirmado recibe "Entra un invitado gratis": $6.000 entre los 3 que ya están, $2.000 cada uno; el organizador y el pendiente no lo reciben | Cubierto (integración) |
| CN-49 | KAN-44 | Límite | Destacar con 1 libre; un confirmado cancela y quedan 2; postula un jugador con honor 8 y 3 calificadores; el organizador lo aprueba | Sin destacar en el detalle y fuera de "Falta uno"; queda `PENDING` y paga su parte ($6.000); con 1 libre otra vez, el destacado rige (DEF-28) | Cubierto (integración) |
| CN-50 | KAN-41 | Equivalencia | Un jugador con honor 10 calificado por solo 2 personas se une a un destacado | Queda `PENDING` sin ocupar el cupo: lo aprueba el organizador (DEF-30) | Cubierto (integración) |
| CN-51 | HU-11 | Equivalencia | Un compañero reporta; reporta dos veces; se reporta a sí mismo; reporta alguien que no jugó; reporta a quien no jugó; reporta antes de empezar | 201 `PENDING`; 409 `ALREADY_REPORTED`; 422 `SELF_REPORT`; 403; 422 `REPORTED_NOT_IN_MATCH`; 409 `MATCH_NOT_STARTED` | **Pasa** (PostGIS local, 22-nov) |
| CN-52 | HU-11 | Equivalencia | El administrador abre el panel y el detalle de un jugador con un reporte anterior, lo suspende y vuelve a resolverlo | Ve el detalle y el historial; queda suspendido 7 días, con la resolución en el reporte; recibe el aviso `SANCTION`; postular y publicar responden 403 `ACCOUNT_SUSPENDED`; resolver de nuevo, 409 | **Pasa** (PostGIS local, 22-nov) |
| CN-53 | HU-11 | Equivalencia | El administrador descarta un reporte con una nota | `DISMISSED`, sin suspensión; aparece en los descartados con su nota y el jugador sigue publicando | **Pasa** (PostGIS local, 22-nov) |

---

## 6. Pruebas de integración

Levantan la API real contra una base PostGIS real. Cada endpoint del contrato (`DESARROLLO.md` §5)
se prueba en su camino feliz y en su error principal.

| ID | Qué integra | Caso | Sprint | Estado |
|---|---|---|---|---|
| I-01 | API + PostgreSQL | `GET /health` responde `ok` con la base conectada y `503` sin ella | 5 | **Pasa** · el 503 se prueba con la base simulada caída (`health.int.test.ts`, 15-nov) |
| I-02 | API + PostgreSQL | Registro y login devuelven un JWT utilizable (HU-01) | 5 | **Pasa** |
| I-03 | API + PostGIS | `POST /matches` guarda la ubicación como un punto de PostGIS (HU-03) | 5 | **Pasa** · la prueba verifica que es un `POINT`; que la columna es `geography` lo fija la migración inicial |
| I-04 | API + PostGIS | `GET /matches/nearby` usa `ST_DWithin` y ordena por distancia (HU-04) | 6 | **Pasa** |
| I-05 | API + transacción | Aprobar el último cupo en paralelo no sobrevende (HU-05) | 6 | **Pasa** |
| I-06 | API + Transbank | `init` crea la transacción y `commit` la confirma con tarjeta de prueba (HU-08) | 7 | **Pasa** (Transbank simulado en `payments.int.test.ts`) · verificado a mano en Integración con la VISA de prueba (`evidencias/sprint-07/`) |
| I-07 | API + Transbank | Pago rechazado deja `Payment = FAILED` y libera el cupo (HU-08) | 7 | **Pasa** · también el pago anulado y el último cupo que vuelve a `OPEN` |
| I-08 | API + PostgreSQL | Cancelar dentro de la ventana registra `retained` (HU-09) | 7 | **Pasa** (`cancellations.int.test.ts`): también dos cancelaciones simultáneas reembolsan una sola vez y un fallo de Transbank no cambia nada · reembolso real verificado en Integración (`evidencias/sprint-07/`) |
| I-09 | API + PostgreSQL | Una reseña recalcula `honorScore` del calificado (HU-06, HU-07) | 7 | **Pasa** (`ratings.int.test.ts`): el honor se ve en la carta pública sin correo y dos reseñas simultáneas al mismo jugador no se pisan (fila bloqueada) · verificado a mano en `docker compose` (`evidencias/sprint-07/`) |
| I-10 | API + PostGIS | Publicar, destacar, postular y aprobar reparten avisos con un `INSERT … SELECT` filtrado por `ST_DWithin` desde el punto de cada usuario, sin repetirlos (HU-10) | 8 | **Pasa** (`notifications.int.test.ts`) · recorrido completo verificado en `docker compose` (`evidencias/sprint-08/25` a `27`) |
| I-11 | API + PostgreSQL | El organizador cierra la asistencia: "asistió" suma un partido jugado y recalcula el honor (KAN-30) | 7 | **Pasa** (`attendance.int.test.ts`) · verificado a mano en `docker compose` (`evidencias/sprint-07/08-asistencia-KAN30.jpg`) |
| I-12 | API + Transbank | Cancelar con Webpay abierto cierra el pago: terminarlo después no confirma ni cobra (DEF-08) | 8 | **Pasa** (`payments.int.test.ts`) |
| I-13 | API + Transbank | Si el cupo se cancela mientras Transbank confirma, se devuelve todo lo cobrado (DEF-08) | 8 | **Pasa** |
| I-14 | API + Transbank | Si la respuesta del commit se pierde, se consulta el estado real y el pago queda registrado (DEF-10) | 8 | **Pasa** · si Transbank tampoco responde el estado, el pago sigue iniciado y se informa 502 |
| I-15 | API + Transbank | Reintentar un pago que Transbank ya aprobó no cobra dos veces: 409 (DEF-10) | 8 | **Pasa** |
| I-15b | API + Transbank | Tocar "Pagar" dos veces seguidas reusa el cobro abierto: no pisa su token y pagar en la primera pestaña confirma (DEF-27) | 8 | **Pasa** (CI, 22-nov) |
| I-16 | API | Ruta inexistente (404), JSON mal formado (400), recurso inexistente (404) e id que no es UUID (422), todos con el formato único de error | 8 | **Pasa** (`auth.int.test.ts`) |
| I-17 | API + PostgreSQL | Rechazar deja la postulación `REJECTED`, no mueve cupos y el jugador puede volver a postular (KAN-32) | 8 | **Pasa** (`participations.int.test.ts`) · verificado a mano en `docker compose` (`evidencias/sprint-08/`) |
| I-18 | Docker Compose | `docker compose up` deja los tres contenedores sanos, con datos de demostración | 5 | **Automatizada en el CI desde el 15-nov**: levanta el stack, consulta `/health`, entra con una cuenta de demo y pide la web |

Los sprints siguen la planificación vigente del tablero Jira al 4 de octubre de 2026.

---

## 7. Pruebas de rendimiento

El punto sensible es la búsqueda por radio: es la consulta que más se repite y la que justifica
PostGIS en el modelo de datos.

| ID | Escenario | Carga | Criterio de aceptación | Herramienta |
|---|---|---|---|---|
| R-01 | `GET /matches/nearby` con el seed de demo | 20 usuarios virtuales, 1 minuto | p95 bajo 300 ms · 0 % de errores | k6 |
| R-02 | `GET /matches/nearby` con 10.000 partidos sintéticos | 20 usuarios virtuales, 1 minuto | p95 bajo 500 ms | k6 |
| R-03 | Plan de ejecución de la búsqueda | 10.000 partidos | `EXPLAIN ANALYZE` muestra uso de `idx_match_location`, sin recorrido secuencial | psql |
| R-04 | Registro y login (bcrypt costo 12) | 5 usuarios virtuales, 1 minuto | p95 bajo 800 ms | k6 |
| R-05 | Arranque en frío del stack | `docker compose up --build` | API sana en menos de 60 s desde contenedores construidos | Docker |

Los umbrales son metas del proyecto para una demo y un piloto comunal.

### 7.1 Resultado de la ejecución (20 de noviembre de 2026, KAN-35)

Entorno: `docker compose` local en el notebook de desarrollo. k6 1.0.0 corre desde su imagen oficial
(`grafana/k6`) dentro de la red del compose, así que no hay que instalar nada. Los usuarios virtuales
no hacen pausas entre peticiones: es más exigente que la misma cantidad de personas reales.

| ID | Resultado | Meta | Cumple |
|---|---|---|---|
| R-01 | p95 de **19 ms**, 0 % de errores · 75.974 búsquedas en 1 minuto (unas 1.260 por segundo) | p95 < 300 ms · 0 % de errores | Sí |
| R-02 | p95 de **45 ms**, 0 % de errores · 34.095 búsquedas en 1 minuto, con 10.017 partidos en la base | p95 < 500 ms | Sí |
| R-03 | `Bitmap Index Scan on idx_match_location`: de 10.017 partidos, el índice deja 464 candidatos y la consulta tarda **11 ms**. La tabla de partidos no se recorre completa | Uso del índice GIST, sin recorrido secuencial | Sí |
| R-04 | Registro p95 de **324 ms** y login p95 de **311 ms**, 0 % de errores · 652 cuentas | p95 < 800 ms | Sí |
| R-05 | API, web y base sanas en **13,3 s**, con migraciones y seed | < 60 s | Sí |

Notas:

- **R-03:** el plan recorre completa la tabla de usuarios, que en la demo tiene 8 filas: con tan pocas,
  PostgreSQL elige leerla entera porque es más barato que usar su índice. El criterio se refiere a la
  tabla de partidos, que es la que crece.
- **R-04:** el límite de registros (S-12, 20 por hora) se elevó solo en el contenedor local durante la
  medición, porque lo que se mide es el costo de bcrypt. Al terminar se restauró la API y el seed borró
  las cuentas de carga.
- **Alcance:** es una medición local. En la nube (Render y Supabase en capa gratuita) los tiempos
  serán mayores por la red y por el servidor más chico.

Cómo se repiten, con `docker compose up` arriba y desde la raíz del repositorio:

```bash
docker run --rm -i --network kancha_default -e P95_MS=300 grafana/k6:1.0.0 run - < fase-2-desarrollo/backend/tests/performance/nearby.k6.js
docker compose exec -T db psql -U kancha -d kancha < fase-2-desarrollo/backend/tests/performance/datos-sinteticos.sql
docker compose exec -T db psql -U kancha -d kancha < fase-2-desarrollo/backend/tests/performance/plan-busqueda.sql
docker run --rm -i --network kancha_default -e P95_MS=500 grafana/k6:1.0.0 run - < fase-2-desarrollo/backend/tests/performance/nearby.k6.js
```

R-04 usa `auth.k6.js` y necesita `REGISTER_RATE_LIMIT` elevado en la API. Salida completa en
`evidencias/sprint-08/pruebas-rendimiento.txt`.

**Medición preliminar (14-nov-2026), reemplazada por R-01.** 100 búsquedas seguidas con un solo usuario:
mediana de 4 ms y p95 de 5 ms.

---

## 8. Pruebas de seguridad

Guiadas por el OWASP API Security Top 10. Cada control se prueba intentando romperlo.

| ID | Riesgo | Prueba | Resultado esperado | Estado |
|---|---|---|---|---|
| S-01 | Autenticación rota | Llamar un endpoint protegido sin token, con token alterado y con token vencido | 401 en los tres casos | **Verificado** (`auth.int.test.ts`) |
| S-02 | Acceso a objetos ajenos | Aprobar una postulación de un partido que organiza otro usuario | 403 | **Verificado** (`participations.int.test.ts`, U-45) |
| S-03 | Acceso a objetos ajenos | Pagar o cancelar la participación de otro jugador | 403 | **Verificado** (`payments.int.test.ts`, `cancellations.int.test.ts`, U-58, U-64) |
| S-04 | Inyección | Enviar `'; DROP TABLE "Match"; --` en `sport`, `lat` y `lng` | 422, la tabla sigue intacta | **Verificado** en `sport` (`matches.int.test.ts`, U-33) · las consultas usan parámetros de `$queryRaw` |
| S-05 | Validación de entrada | Enviar tipos erróneos y campos extra en cada `POST` | 422 con el formato único de error | **Verificado** en registro y publicación (CN-03, CN-06, U-29) |
| S-06 | Exposición de datos | Revisar que ninguna respuesta incluya `passwordHash` | El campo nunca sale | **Verificado** (U-47 y `auth.int.test.ts`) |
| S-07 | Almacenamiento de credenciales | Revisar la tabla `User` tras un registro | Solo hash bcrypt | **Verificado** (`auth.int.test.ts`): se guarda un hash bcrypt y nunca la contraseña. El costo 12 es el valor por defecto de `env.ts`; las pruebas usan 4 para ir rápido |
| S-08 | Manipulación del pago | Llamar a `commit` con un `token_ws` inventado o repetido | Rechazado, sin cambios en `Payment` | **Verificado** (`payments.int.test.ts`): el inventado da 404 y el repetido no vuelve a confirmar |
| S-09 | Configuración insegura | Revisar cabeceras HTTP de la API | Cabeceras de `helmet` presentes | **Verificado** (`auth.int.test.ts`) |
| S-10 | Secretos en el repositorio | Buscar claves en el historial de Git | Ningún secreto · `.env` ignorado | Verificado: `.gitignore` excluye `.env` |
| S-11 | Dependencias vulnerables | `npm audit --omit=dev` en backend y app | Sin vulnerabilidades altas ni críticas | **Parcial** (8-nov): `npm audit fix` bajó el backend de 11 a 6 (1 crítica, 5 altas). Las 6 exigen versiones mayores y no están en el camino de una petición: `tar` solo corre al instalar `bcrypt`, `deepmerge-ts` en la CLI de Prisma y la de Zod necesita colecciones enormes. La auditoría del 22-nov mostró que con el límite de 1 MB de entonces una sola petición sí alcanzaba (DEF-24): Express limita el cuerpo a 16 KB desde ese día (S-20). La app tiene 1 crítica (`maplibre-gl`) y 2 altas que también exigen versiones mayores. Riesgo aceptado para la Fase 2; se revisa en el Sprint 8 |
| S-12 | Abuso de recursos | Ráfaga de contraseñas erradas en el login | Límite de peticiones activo (429) | **Verificado** (`ratelimit.int.test.ts`, 15-nov): a la cuarta contraseña errada responde 429; los ingresos correctos no cuentan. También limita el registro |
| S-13 | Redirección abierta | La página que lleva a Webpay solo puede enviar el formulario a Transbank | CSP `form-action` limitada a Transbank y token sin JWT | **Verificado** (`payments.int.test.ts`) |
| S-14 | Acceso a objetos ajenos | Calificar sin haber jugado el partido, calificarse a sí mismo o calificar a quien no lo jugó | 403, 422 y 422 | **Verificado** (`ratings.int.test.ts`, U-70) |
| S-15 | Acceso a objetos ajenos | Un jugador intenta cerrar su propia asistencia o la de otro | 403 | **Verificado** (`attendance.int.test.ts`, U-71) |
| S-16 | Manipulación del pago | Anular el pago de otro jugador con su orden de compra, que es predecible | 404, sin tocar el pago | **Verificado** (`payments.int.test.ts`): la vuelta "tiempo agotado" exige el id de sesión aleatorio del pago (DEF-12) |
| S-17 | Acceso a objetos ajenos | Rechazar una postulación de un partido ajeno | 403 | **Verificado** (`participations.int.test.ts`, U-79) |
| S-18 | Sesión | Usar la sesión de un usuario que ya no existe (la demo regenera los datos en cada arranque) | 401, y la app vuelve al login | **Verificado** (`auth.int.test.ts`) · comprobado en la app el 17-nov (DEF-21) |
| S-19 | Acceso a objetos ajenos | Marcar como leído el aviso de otro usuario | 404, sin revelar que existe | **Verificado** (`notifications.int.test.ts`, CN-45) |
| S-20 | Abuso de recursos | Enviar un arreglo de 10.000 elementos en un campo que Zod limita a 7 | 413 antes de validar, sin agotar la memoria | **Verificado** el 22-nov (`health.int.test.ts`, sin base de datos) · DEF-24 |
| S-21 | Abuso de recursos | Publicar partidos en ráfaga con una misma cuenta | 429 al pasar `PUBLISH_RATE_LIMIT` por hora; otra cuenta en la misma IP sigue publicando | **Verificado** el 22-nov en CI (`ratelimit.int.test.ts`) · DEF-26 |
| S-22 | Exposición de datos | Revisar que las tablas de la app no queden abiertas a la Data API de Supabase | Toda tabla de `public` con RLS activo, también las nuevas | **Verificado** el 22-nov en CI (`rls.int.test.ts`) · DEF-25 |
| S-23 | Control de acceso | Un jugador sin rol de administrador abre el panel, un reporte y trata de resolverlo | 403 en los tres casos; el reporte sigue pendiente | **Verificado** el 22-nov (`moderation.int.test.ts`, PostGIS local) |

---

## 9. Trazabilidad historia ↔ pruebas

| HU | Historia | Unitarias | Caja negra | Integración | Seguridad |
|---|---|---|---|---|---|
| HU-01 | Registro de agente libre | U-01, U-47 a U-54, U-73 a U-75 | CN-01 a CN-03 | I-02 | S-01, S-06, S-07, S-12, S-18 |
| HU-02 | Carta de jugador | U-01, U-47 a U-49, M-07, M-08, M-18, M-19 | CN-18 | I-09 | S-06 |
| HU-03 | Publicar partido | U-23 a U-30, M-34 | CN-04 a CN-06 | I-03 | S-05, S-21 |
| HU-04 | Buscar partidos cercanos | U-80 a U-82, M-14 a M-16, M-26, M-27, M-32 | CN-07 a CN-10, CN-34, CN-39, CN-40 | I-04 | S-04 |
| HU-05 | Postularme a un partido | U-37 a U-46, M-22 a M-24 | CN-11, CN-12, CN-35 | I-05 | S-02 |
| HU-06 | Calificar compañeros | U-07 a U-10, U-69, U-70, M-17 | CN-13 a CN-17 | I-09 | S-05, S-14 |
| HU-07 | Cálculo de honor | U-01 a U-06, U-71 | CN-18 a CN-21, CN-31 | I-09, I-11 | S-15 |
| HU-08 | Pago fraccionado | U-11 a U-16, U-21, U-22, U-57 a U-63 | CN-22 a CN-25, CN-29 | I-06, I-07, I-12 a I-15, I-15b | S-03, S-08, S-13, S-16 |
| HU-09 | Retención por deserción | U-17 a U-20, U-64 a U-68, U-72 | CN-26 a CN-28, CN-33, CN-36 | I-08 | S-03 |
| HU-10 | Avisos de partidos cercanos y de "Falta uno" | U-91 a U-99, M-36 a M-38 | CN-43 a CN-48 | I-10 | S-19, S-20 |
| HU-11 | Moderar reportes de usuarios | U-103 a U-109, M-42, M-43 | CN-51 a CN-53 | CN-51 a CN-53 contra PostgreSQL (`moderation.int.test.ts`) | S-23 |
| KAN-30 | Asistencia y partidos jugados | U-71 | CN-30 a CN-32 | I-11 | S-15 |
| KAN-32 | Rechazar postulación | U-79 | CN-37, CN-38 | I-17 | S-17 |
| KAN-37 | Filtro "Falta uno" (urgentes) | U-80 a U-82, M-27, M-33 | CN-39, CN-40 | I-04 | S-04 |
| KAN-38 | Límite de la comuna, canchas existentes y dirección | M-28 a M-31 | — · verificado a mano en la app (`evidencias/sprint-08/10` a `16`) | — | — |
| KAN-40 | Canchas como pines al publicar | M-29, M-34 | — · verificado a mano en la app (`evidencias/sprint-08/20` y `21`) | — | — |
| KAN-41 | "Falta uno" destacado | U-83 a U-90, U-101, M-35 | CN-41, CN-42, CN-50 | I-04, I-05 | S-02 |
| KAN-43 | Cuenta atrás y equipamiento real de las canchas | M-39, M-40 | — · verificado a mano en la app (`evidencias/sprint-08/28` y `29`) y foto satelital de cada cancha (`fuentes-canchas-KAN40.md`) | — | — |
| KAN-44 | Invitado gratis solo si falta 1 y aviso a los confirmados | U-83, U-85, U-91, U-94, U-99, U-100, U-102 | CN-41, CN-42, CN-45, CN-48, CN-49 · verificado en la app (`evidencias/sprint-08/30`) | — | — |
| KAN-29 | La app en iPhone y Android | M-41 | — · falta verlo en el iPhone del autor | — | — |

---

## 10. Criterios de entrada y de salida

**Una historia entra a pruebas** cuando compila sin errores de TypeScript ni de ESLint y su
endpoint está documentado en OpenAPI.

**Una historia sale de pruebas** cuando:

- sus pruebas unitarias y de integración pasan en el CI;
- sus casos de caja negra están ejecutados y sin defectos abiertos de severidad alta;
- la cobertura de `services/` se mantiene en 80 % o más;
- `docker compose up` sigue levantando todo sin intervención manual.

**El MVP sale de pruebas** (Fase 3) cuando además se cumplen los umbrales de rendimiento de la
sección 7 (cumplidos el 20 de noviembre) y los dieciocho controles de seguridad de la sección 8.

---

## 11. Defectos y pendientes detectados

| ID | Fecha | Descripción | Severidad | Estado |
|---|---|---|---|---|
| DEF-01 | 4-oct-2026 | Con `vitest run --coverage` el umbral global de 80 % falla (77,52 %): `utils/errors.ts` no tiene pruebas. El CI no lo detecta porque ejecuta `npm test` sin cobertura | Media | Cerrado el 16-oct: U-55 y U-56; cobertura en 97,39 %. La causa de fondo (el CI no medía cobertura) se cerró el 15-nov: el CI corre `npm test -- --coverage` con umbral |
| DEF-02 | 4-oct-2026 | El diccionario de datos declara notas de 1 a 5 "con CHECK en la migración", pero la migración inicial no crea esa restricción | Media | Cerrado el 8-nov: migración `20261108170000_rating_notas_check`; lo cubre CN-16 |
| DEF-03 | 4-oct-2026 | No existen pruebas de integración ni siquiera para `/health` | Baja | Cerrado el 16-oct: 29 pruebas de integración, incluida I-01 |
| DEF-04 | 16-oct-2026 | Con PostgreSQL en una zona horaria distinta de UTC, la hora de un partido se guardaba y se comparaba con un desfase de 3 horas: las fechas viajaban a la base sin zona. Se detectó al probar con una base en hora de Chile | Alta | Cerrado el 16-oct: las fechas viajan como texto ISO con `Z`; lo cubre la prueba I-03b |
| DEF-05 | 5-nov-2026 | En la demo en la sala, el mapa web no mostró partidos: el PC se ubicó por la red con kilómetros de error y, como el radio del piloto era de 25 km, la app buscó alrededor de ese punto equivocado. Hubo que fijar La Florida a mano en Chrome. Pasos: abrir `localhost:8080` en un PC sin GPS conectado por cable y permitir la ubicación (HU-04) | Alta | Cerrado el 5-nov: una posición con precisión peor que 1 km o a más de 6 km del centro usa La Florida y lo avisa en pantalla; lo cubren M-14 a M-16 |
| DEF-06 | 8-nov-2026 | Análisis de cierre: nada incrementaba `matchesPlayed` ni registraba inasistencias, aunque la regla "Partidos jugados" de `CLAUDE.md` lo exige. Además la asistencia del honor contaba cualquier cupo pagado, incluso de partidos que aún no se juegan | Media | Cerrado el 8-nov con KAN-30: el organizador cierra la asistencia y la tasa se calcula con lo registrado; lo cubren U-71, I-11 y CN-30 a CN-32 |
| DEF-07 | 8-nov-2026 | `npm run lint` en la app ejecuta `expo lint`, que intenta instalar ESLint y crear su configuración en vez de revisar el código. El CI no lo usa: la app se valida con `tsc` | Baja | Cerrado el 15-nov: se quitó el script, que no revisaba nada. La app se valida con `tsc` y sus pruebas |
| DEF-08 | 14-nov-2026 | Auditoría de cierre: un jugador iniciaba el pago, cancelaba el cupo y luego terminaba de pagar en Webpay. El cupo quedaba `PAID` aunque ya estaba liberado, con el dinero cobrado (HU-08, HU-09) | Media | Cerrado el 15-nov: cancelar cierra el pago iniciado, y un pago aprobado se registra con el partido bloqueado o se devuelve completo; I-12 e I-13 |
| DEF-09 | 14-nov-2026 | El reembolso a Transbank se pedía antes de guardar la cancelación y sin tiempo máximo: si la transacción vencía después, el dinero ya había salido y un reintento reembolsaba de nuevo (HU-09) | Media | Cerrado el 15-nov: el reembolso es el último paso y Transbank tiene 8 s por llamada |
| DEF-10 | 14-nov-2026 | Si Transbank aprobaba el pago y la respuesta se perdía, el pago quedaba iniciado y el jugador podía pagar otra vez (HU-08) | Media | Cerrado el 15-nov: se consulta el estado real en Transbank; I-14 e I-15 |
| DEF-11 | 14-nov-2026 | La cancelación leía el pago antes de bloquear el partido y podía decidir con un dato viejo (HU-09) | Baja | Cerrado el 15-nov: relee el pago después del bloqueo |
| DEF-12 | 14-nov-2026 | `/payments/return` es público y, con solo la orden de compra (predecible), se podía anular el pago iniciado de otro jugador (HU-08) | Baja | Cerrado el 15-nov: exige el id de sesión del pago, ahora aleatorio; S-16 |
| DEF-13 | 14-nov-2026 | Quien cancelaba un cupo pagado podía volver a postular y pagar de nuevo, y el pago nuevo borraba el registro de la retención (HU-09) | Media | Cerrado el 15-nov: no puede volver a postular a ese partido; CN-33 y U-72 |
| DEF-14 | 14-nov-2026 | Desde la app, el organizador no podía llegar a los botones de asistencia de KAN-30 cuando el partido terminaba: Mis partidos solo lo llevaba a calificar | Alta | Cerrado el 15-nov: el partido terminado del organizador abre el detalle. Verificado en la app real |
| DEF-15 | 14-nov-2026 | Al cambiar de cuenta sin cerrar la app se veían por un momento el perfil y los partidos de la cuenta anterior | Alta | Cerrado el 15-nov: la caché se vacía al entrar y al salir; M-25 |
| DEF-16 | 14-nov-2026 | La app no se actualizaba sola: el jugador no veía su aprobación hasta salir y volver a entrar | Media | Cerrado el 15-nov: refresco automático del detalle y al volver a cada pestaña; M-23 y M-24 |
| DEF-17 | 14-nov-2026 | Mis partidos mostraba "Esperando al organizador" en un cupo cancelado | Media | Cerrado el 15-nov: cada estado tiene su rótulo; M-22 |
| DEF-18 | 14-nov-2026 | Marcar "No vino" no pedía confirmación, aunque baja el honor del jugador y no se puede deshacer | Media | Cerrado el 15-nov: pide confirmación y "Asistió" queda marcado |
| DEF-19 | 14-nov-2026 | Al publicar, un error de la API en el costo no se mostraba y el botón parecía no hacer nada (HU-03) | Baja | Cerrado el 15-nov: el error se muestra en el campo y hay un aviso general |
| DEF-20 | 17-nov-2026 | Siete de los 15 partidos de demostración caían fuera de La Florida: el punto central del seed y de la app estaba en el borde poniente de la comuna. Quedó a la vista al dibujar el límite real (KAN-38) | Media | Cerrado el 17-nov: punto interior y desplazamientos al 70 %. Comprobado contra la API: 15 de 15 dentro del límite |
| DEF-21 | 17-nov-2026 | Tras regenerar los datos de la demo, una sesión abierta seguía entrando con un usuario que ya no existía: `/users/me` respondía 404 y la app no cerraba la sesión | Media | Cerrado el 17-nov: responde 401 y la app valida la sesión al entrar (S-18) |
| DEF-22 | 17-nov-2026 | La dirección automática usaba `AbortSignal.timeout`, que React Native no trae: en un teléfono nunca se habría completado (KAN-38) | Media | Cerrado el 17-nov, antes de integrarse: el límite de tiempo se arma con `AbortController` (M-31). Falta verlo en un teléfono real |
| DEF-23 | 20-nov-2026 | En el iPhone del autor, los títulos, el honor y los números en Anton salían cortados arriba; en un Samsung S23 se veían bien. iOS apoya la letra abajo cuando el alto de línea es menor que el de la fuente (KAN-29) | Media | Corregido el 21-nov: todo texto en Anton con alto de línea pasa por `antonLine` (M-41). Falta verlo en el iPhone |
| DEF-24 | 22-nov-2026 | Con el cuerpo limitado a 1 MB, un arreglo enorme en las preferencias de avisos hacía que Zod armara un error por elemento: una petición subía 222 MB de memoria y dos o tres botaban la API gratuita (auditoría del 22-nov) | Alta | Cerrado el 22-nov (PR #38): límite de 16 KB (S-20) |
| DEF-25 | 22-nov-2026 | Las tablas en Supabase no tenían RLS: con la URL del proyecto y la clave anon, su Data API leía y escribía correos y hashes. Era el punto pendiente 3.6 #10 de la auditoría de cierre | Media | Cerrado el 22-nov (PR #38): migración con RLS en las 7 tablas (S-22). Se aplica en Supabase al desplegar |
| DEF-26 | 22-nov-2026 | Publicar partidos no tenía límite: un script llenaba "Falta uno" de partidos falsos y disparaba avisos a todos los cercanos | Media | Cerrado el 22-nov (PR #38): 10 por cuenta cada hora (S-21) |
| DEF-27 | 22-nov-2026 | En la web, tocar "Pagar" dos veces creaba otro cobro y pisaba el token del primero: pagar en la primera pestaña volvía sin pago que confirmar (HU-08) | Media | Cerrado el 22-nov (PR #38): dentro de 2 minutos se reusa el cobro abierto (I-15b) |
| DEF-28 | 22-nov-2026 | Un destacado al que una cancelación dejaba con 2 libres seguía dando entrada gratis y aparecía en "Falta uno", contra la regla "si faltan 2 o más no hay entrada gratis" (KAN-44) | Alta | Corregido el 22-nov en `fix/KAN-44-reglas-pendientes`: el destacado rige solo mientras falte 1 (`isPriorityActive`; U-100, U-102, CN-49) |
| DEF-29 | 22-nov-2026 | "Ánimo para jugar" le llegaba a una cuenta recién creada en el primer barrido; la regla dice 14 días sin postular ni organizar (HU-10) | Baja | Corregido el 22-nov en `fix/KAN-44-reglas-pendientes`: quien nunca jugó cuenta sus 14 días desde el registro (CN-47) |
| DEF-30 | 22-nov-2026 | Con dos cuentas propias se inventaba un partido, se ponía un 10 y se entraba gratis y sin aprobación a cualquier destacado (KAN-41) | Media | Corregido el 22-nov en `fix/KAN-44-reglas-pendientes`: además del honor 7, hacen falta 3 calificadores distintos (`GUEST_MIN_RATERS`; U-101, CN-50) |

Cada defecto nuevo se registra aquí con fecha, pasos para reproducirlo y la historia afectada, y
se enlaza a su issue en Jira.

---

## 12. Evidencias

Las capturas del CI en verde, los reportes de cobertura y los resultados de k6 se guardan en
`fase-2-desarrollo/docs/evidencias/` al cierre de cada sprint.

---

*Kancha · Portafolio de Título · Lukas Guerrero · Sprint 8 · actualizado el 20 de noviembre de 2026*
