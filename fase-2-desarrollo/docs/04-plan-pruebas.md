# Plan de Pruebas — Kancha

> Fase 2 · Evidencia de la competencia **C1** (pruebas de certificación)
> Cubre los cinco tipos que pide la pauta: unitarias, caja negra, integración, rendimiento y seguridad.
> Corte del documento: 4 de octubre de 2026 (Sprint 5).

Este plan distingue siempre entre lo **ejecutado** (ya corre y pasa) y lo **diseñado** (caso definido,
se automatiza cuando exista el código que prueba). Hoy el backend tiene la lógica de honor y de pagos
como funciones puras y el endpoint `/health`; los endpoints de negocio se construyen desde el Sprint 5.

---

## 1. Objetivo y alcance

**Objetivo.** Demostrar que las reglas de negocio del MVP (HU-01 a HU-10) se cumplen, que los
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

| Tipo | Qué responde | Herramienta | Dónde vive | Estado al 4-oct |
|---|---|---|---|---|
| **Unitarias** | ¿Cada regla de negocio calcula bien, aislada? | Vitest 2 | `backend/tests/unit/` | **22 ejecutadas, 22 pasan** |
| **Caja negra** | ¿El sistema responde lo que promete el criterio de aceptación, sin mirar el código? | Vitest + Supertest, Swagger UI | `backend/tests/blackbox/` | 14 casos cubiertos, 15 diseñados |
| **Integración** | ¿API, base de datos y Transbank funcionan juntos? | Vitest + Supertest + PostGIS real | `backend/tests/integration/` | Diseñadas |
| **Rendimiento** | ¿La búsqueda por radio responde rápido con datos reales? | k6, `EXPLAIN ANALYZE` | `backend/tests/performance/` | Diseñadas |
| **Seguridad** | ¿Se puede entrar, leer o cobrar lo que no corresponde? | Supertest, `npm audit`, revisión OWASP | `backend/tests/security/` | 3 controles implementados, 1 verificado, resto diseñado |

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
| Fecha | 4 de octubre de 2026 |
| Archivos de prueba | 2 |
| Casos | 22 ejecutados · 22 pasan · 0 fallan |
| Cobertura de `services/` | 100 % de líneas y funciones · 93,33 % de ramas |
| `honor.service.ts` | 100 % líneas · 100 % ramas |
| `payment.service.ts` | 100 % líneas · 81,81 % ramas |

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

### 4.3 Unitarias pendientes

| Módulo | Qué falta probar | Sprint |
|---|---|---|
| `utils/errors.ts` | Cada constructor devuelve el código HTTP correcto | 5 |
| `payment.service.ts` | Ramas de montos negativos en comisión y reembolso | 5 |
| `matching.service.ts` | Conteo de cupos y paso a `FULL` | 6 |
| Componentes Expo | `MatchCard`, `HonorBadge`, `SportFilter` con Jest y React Native Testing Library | 6 |

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
| CN-01 | HU-01 | Equivalencia | Registro con datos válidos | 201 · `honorScore` es `null` | Diseñado |
| CN-02 | HU-01 | Equivalencia | Correo ya registrado | 409 | Diseñado |
| CN-03 | HU-01 | Límite | Contraseña bajo el mínimo | 422 | Diseñado |
| CN-04 | HU-03 | Equivalencia | Partido con fecha futura y cupos > 0 | 201 · estado `OPEN` | Diseñado |
| CN-05 | HU-03 | Límite | `startsAt` en el pasado | 422 | Diseñado |
| CN-06 | HU-03 | Límite | `totalSlots` = 0 | 422 | Diseñado |
| CN-07 | HU-04 | Límite | Partido a 4,9 km con radio de 5 km | Aparece en el resultado | Diseñado |
| CN-08 | HU-04 | Límite | Partido a 5,1 km con radio de 5 km | No aparece | Diseñado |
| CN-09 | HU-04 | Equivalencia | Filtro por deporte = pádel | Solo partidos de pádel | Diseñado |
| CN-10 | HU-04 | Equivalencia | Partido lleno o ya iniciado | No aparece | Diseñado |
| CN-11 | HU-05 | Equivalencia | Postular dos veces al mismo partido | 409 | Diseñado |
| CN-12 | HU-05 | Límite | Dos jugadores toman el último cupo a la vez | Solo uno queda aprobado | Diseñado |
| CN-13 | HU-06 | Límite | Calificar a las 47 h 59 min | Aceptado | Cubierto (U-09) |
| CN-14 | HU-06 | Límite | Calificar a las 48 h 01 min | Rechazado | Cubierto (U-10) |
| CN-15 | HU-06 | Límite | Calificar antes de que termine el partido | Rechazado | Cubierto (U-07) |
| CN-16 | HU-06 | Límite | Nota 0 o nota 6 | 422 | Diseñado |
| CN-17 | HU-06 | Equivalencia | Calificar dos veces al mismo jugador | 409 | Diseñado |
| CN-18 | HU-07 | Equivalencia | Usuario sin ninguna señal | "Sin calificaciones aún" (`null`) | Cubierto (U-01) |
| CN-19 | HU-07 | Límite | Todas las notas en 5 y asistencia completa | 10.0 | Cubierto (U-02) |
| CN-20 | HU-07 | Límite | Todas las notas en 1 y solo inasistencias | 0.0 | Cubierto (U-03) |
| CN-21 | HU-07 | Límite | 50 reseñas, las 20 más recientes en 5 | Cuenta solo las 20 recientes | Cubierto (U-05) |
| CN-22 | HU-08 | Equivalencia | Arriendo 40.000 en 8 cupos | Cuota de 5.000 | Cubierto (U-11) |
| CN-23 | HU-08 | Límite | Arriendo 30.000 en 7 cupos | Cuota de 4.286 (hacia arriba) | Cubierto (U-12) |
| CN-24 | HU-08 | Límite | Arriendo 0 | Cuota de 0 | Cubierto (U-13) |
| CN-25 | HU-08 | Límite | Cupos = 0 | Error | Cubierto (U-14) |
| CN-26 | HU-09 | Límite | Cancelar a 12 h 00 min | Reembolso del 100 % | Cubierto (U-18) |
| CN-27 | HU-09 | Límite | Cancelar a 11 h 59 min | Retiene el 50 % | Cubierto (U-19) |
| CN-28 | HU-09 | Equivalencia | Monto impar (4.287) | Retenido + reembolsado = pagado | Cubierto (U-20) |
| CN-29 | HU-08 | Equivalencia | Pago rechazado en Webpay | El cupo se libera | Diseñado |

---

## 6. Pruebas de integración

Levantan la API real contra una base PostGIS real. Cada endpoint del contrato (`DESARROLLO.md` §5)
se prueba en su camino feliz y en su error principal.

| ID | Qué integra | Caso | Sprint | Estado |
|---|---|---|---|---|
| I-01 | API + PostgreSQL | `GET /health` responde `ok` con la base conectada y `503` sin ella | 5 | Diseñado |
| I-02 | API + PostgreSQL | Registro y login devuelven un JWT utilizable (HU-01) | 5 | Diseñado |
| I-03 | API + PostGIS | `POST /matches` guarda la ubicación como `geography` (HU-03) | 5 | Diseñado |
| I-04 | API + PostGIS | `GET /matches/nearby` usa `ST_DWithin` y ordena por distancia (HU-04) | 6 | Diseñado |
| I-05 | API + transacción | Aprobar el último cupo en paralelo no sobrevende (HU-05) | 6 | Diseñado |
| I-06 | API + Transbank | `init` crea la transacción y `commit` la confirma con tarjeta de prueba (HU-08) | 7 | Diseñado |
| I-07 | API + Transbank | Pago rechazado deja `Payment = FAILED` y libera el cupo (HU-08) | 7 | Diseñado |
| I-08 | API + PostgreSQL | Cancelar dentro de la ventana registra `retained` (HU-09) | 7 | Diseñado |
| I-09 | API + PostgreSQL | Una reseña recalcula `honorScore` del calificado (HU-06, HU-07) | 8 | Diseñado |
| I-10 | API + Expo Push | Liberar un cupo dispara la notificación (HU-10) | 9 | Diseñado |
| I-11 | Docker Compose | `docker compose up --build` deja los tres contenedores sanos | 5 | Verificación manual en cada release |

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

Los umbrales son metas del proyecto para una demo y un piloto comunal. Se ejecutan en los
sprints 8 y 9, cuando existan los endpoints, y sus resultados se guardan en `docs/evidencias/`.

---

## 8. Pruebas de seguridad

Guiadas por el OWASP API Security Top 10. Cada control se prueba intentando romperlo.

| ID | Riesgo | Prueba | Resultado esperado | Estado |
|---|---|---|---|---|
| S-01 | Autenticación rota | Llamar un endpoint protegido sin token, con token alterado y con token vencido | 401 en los tres casos | Control implementado (`middlewares/auth.ts`) · prueba diseñada |
| S-02 | Acceso a objetos ajenos | Aprobar una postulación de un partido que organiza otro usuario | 403 | Diseñado |
| S-03 | Acceso a objetos ajenos | Pagar o cancelar la participación de otro jugador | 403 | Diseñado |
| S-04 | Inyección | Enviar `'; DROP TABLE "Match"; --` en `sport`, `lat` y `lng` | 422, la tabla sigue intacta | Diseñado · las consultas usan parámetros de `$queryRaw` |
| S-05 | Validación de entrada | Enviar tipos erróneos y campos extra en cada `POST` | 422 con el formato único de error | Control implementado (`middlewares/validate.ts`) · prueba diseñada |
| S-06 | Exposición de datos | Revisar que ninguna respuesta incluya `passwordHash` | El campo nunca sale | Diseñado |
| S-07 | Almacenamiento de credenciales | Revisar la tabla `User` tras un registro | Solo hash bcrypt con costo 12 | Diseñado |
| S-08 | Manipulación del pago | Llamar a `commit` con un `token_ws` inventado o repetido | Rechazado, sin cambios en `Payment` | Diseñado |
| S-09 | Configuración insegura | Revisar cabeceras HTTP de la API | Cabeceras de `helmet` presentes | Control implementado (`app.ts`) · prueba diseñada |
| S-10 | Secretos en el repositorio | Buscar claves en el historial de Git | Ningún secreto · `.env` ignorado | Verificado: `.gitignore` excluye `.env` |
| S-11 | Dependencias vulnerables | `npm audit --omit=dev` en backend y app | Sin vulnerabilidades altas ni críticas | Diseñado |
| S-12 | Abuso de recursos | Ráfaga de intentos de login | Límite de peticiones activo (429) | Diseñado · el limitador aún no está implementado |

---

## 9. Trazabilidad historia ↔ pruebas

| HU | Historia | Unitarias | Caja negra | Integración | Seguridad |
|---|---|---|---|---|---|
| HU-01 | Registro de agente libre | U-01 | CN-01 a CN-03 | I-02 | S-01, S-06, S-07, S-12 |
| HU-02 | Carta de jugador | U-01 | CN-18 | I-09 | S-06 |
| HU-03 | Publicar partido | — | CN-04 a CN-06 | I-03 | S-05 |
| HU-04 | Buscar partidos cercanos | — | CN-07 a CN-10 | I-04 | S-04 |
| HU-05 | Postularme a un partido | — | CN-11, CN-12 | I-05 | S-02 |
| HU-06 | Calificar compañeros | U-07 a U-10 | CN-13 a CN-17 | I-09 | S-05 |
| HU-07 | Cálculo de honor | U-01 a U-06 | CN-18 a CN-21 | I-09 | — |
| HU-08 | Pago fraccionado | U-11 a U-16, U-21, U-22 | CN-22 a CN-25, CN-29 | I-06, I-07 | S-03, S-08 |
| HU-09 | Retención por deserción | U-17 a U-20 | CN-26 a CN-28 | I-08 | S-03 |
| HU-10 | Notificación de cupo | — | — | I-10 | — |

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
sección 7 y los doce controles de seguridad de la sección 8.

---

## 11. Defectos y pendientes detectados

| ID | Fecha | Descripción | Severidad | Estado |
|---|---|---|---|---|
| DEF-01 | 4-oct-2026 | Con `vitest run --coverage` el umbral global de 80 % falla (77,52 %): `utils/errors.ts` no tiene pruebas. El CI no lo detecta porque ejecuta `npm test` sin cobertura | Media | Abierto |
| DEF-02 | 4-oct-2026 | El diccionario de datos declara notas de 1 a 5 "con CHECK en la migración", pero la migración inicial no crea esa restricción | Media | Abierto |
| DEF-03 | 4-oct-2026 | No existen pruebas de integración ni siquiera para `/health` | Baja | Abierto |

Cada defecto nuevo se registra aquí con fecha, pasos para reproducirlo y la historia afectada, y
se enlaza a su issue en Jira.

---

## 12. Evidencias

Las capturas del CI en verde, los reportes de cobertura y los resultados de k6 se guardan en
`fase-2-desarrollo/docs/evidencias/` al cierre de cada sprint.

---

*Kancha · Portafolio de Título · Lukas Guerrero · Sprint 5, octubre 2026*
