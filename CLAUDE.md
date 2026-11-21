# CLAUDE.md — Proyecto Kancha

> Claude Code lee este archivo automáticamente al iniciar sesión en este proyecto.
> Aquí está el **contexto de negocio y las reglas de trabajo**. La especificación técnica NO vive aquí.

---

## 0. Mapa de documentos — una sola fuente de verdad por tema

Antes de responder o escribir código, abre el archivo que manda sobre el tema en cuestión.
**Nunca dupliques información entre estos archivos: si algo ya está en uno, el resto lo referencia.**

| Tema | Archivo que manda |
|---|---|
| Stack, arquitectura, API, Docker, GitHub, despliegue, pruebas | **`DESARROLLO.md`** |
| Colores, tipografía, componentes, iconografía, reglas visuales | **`DESIGN.md`** |
| Qué es Kancha, épicas, historias, alcance, roadmap, convenciones | **este archivo** |
| Estado real de sprints, historias y tareas | **Jira** — proyecto `KAN` en `lukasguerrerokancha.atlassian.net` |
| Documentos de cada fase (evidencia del trabajo) | `fase-1-definicion/docs/`, `fase-2-desarrollo/docs/`, cada una con su `README.md` de índice |
| Lo que se presenta en cada evaluación | `entrega/` dentro de cada fase: `1-documentacion-grupal/`, `2-documentos-individuales/`, `3-presentacion/` |

Si detectas una contradicción entre dos de estos archivos, **no elijas por tu cuenta**: dilo y pregunta.

---

## 1. ¿Qué es Kancha?

Plataforma móvil geolocalizada que conecta "agentes libres" (deportistas sin equipo fijo) con partidos
amateurs que necesitan completar cupos, mediante un mapa interactivo en tiempo real.

**Tagline:** *Juega. Conecta. Vive Mejor.*

### Problema
El **"falta uno"**: la cancelación de jugadores a última hora que desarticula partidos en La Florida,
Región Metropolitana. Genera pérdidas económicas en recintos privados y frustración en canchas públicas.

### Propuesta de valor
- **Mapa interactivo** con pines filtrables por deporte, horario y radio, y el botón **"Falta uno"** para los partidos urgentes
- **Sistema de Honor** gamificado: perfil tipo "carta de jugador" con calificaciones mutuas post-partido
- **Pago fraccionado** por cupo, con retención por deserción dentro de las 12 h previas
- **Modelo de negocio**: comisión del 10% por transacción + retención por no-show

### Alcance del MVP
- **Piloto:** La Florida, Región Metropolitana, Chile
- **Usuarios:** agentes libres, organizadores de partidos, recintos deportivos
- **Deportes:** fútbol, pádel y básquetbol — **los tres con peso idéntico desde el día uno**
- **Periodo:** 18 semanas académicas — 9 sprints Scrum de 2 semanas

> **Nota de trazabilidad.** Los tres deportes NO son una ampliación de alcance: ya aparecen en los
> mockups de la presentación de Fase 1 (lámina 13, chips ⚽ 🎾 🏀) que la comisión revisó, y en
> `DESIGN.md`. El único documento que decía "solo fútbol" era el Word de Fase 1, y es el que estaba
> desalineado. El Sprint 3 unificó los tres documentos alrededor de lo ya presentado.

---

## 2. Stack — resumen

**El detalle completo está en `DESARROLLO.md`. Este resumen existe solo para orientarte rápido.**

```
Móvil y web   Expo SDK 58 (React Native 0.88) + TypeScript · un código para Android, iOS y web
Backend       Node.js 22 + Express 5 + TypeScript + Prisma
Base de datos PostgreSQL 16 + PostGIS  (búsqueda por radio con ST_DWithin sobre índice GIST)
Pagos         Transbank Webpay Plus, ambiente de Integración
Infra         Docker Compose · GitHub Actions · Render + Supabase (capas gratuitas)
Costo         $0 — todo el stack es libre o de tier gratuito permanente
```

Carpetas del monorepo: `fase-1-definicion/`, `fase-2-desarrollo/` (con `backend/`, `mobile/` y `docs/`),
`fase-3-implementacion/` y `.github/`.
La estructura detallada está en `DESARROLLO.md` §3.

> **El stack cambió respecto de la presentación de Fase 1, y eso está previsto.** La lámina 10 declara
> el stack como *"definición preliminar, sujeta a validación técnica en el Sprint 3"*. La validación se
> hizo en el Sprint 3 y su resultado es `DESARROLLO.md`. Si la comisión pregunta por qué ya no es
> React web con Leaflet, la respuesta es esa lámina.

---

## 3. Épicas del MVP

| ID | Jira | Épica | Prioridad | Historias |
|----|------|-------|-----------|-----------|
| E1 | KAN-1 | Cuentas de usuario | Alta | HU-01 |
| E2 | KAN-25 | Carta de jugador | Alta | HU-02 |
| E3 | KAN-2 | Publicación de partidos | Alta | HU-03 |
| E4 | KAN-26 | Búsqueda geolocalizada | Alta | HU-04 |
| E5 | KAN-27 | Postulación a partidos | Alta | HU-05 |
| E6 | KAN-3 | Sistema de Honor | Alta | HU-06, HU-07 |
| E7 | KAN-4 | Pago fraccionado | Alta | HU-08 · HU-12 en el backlog |
| E8 | KAN-28 | Retención por deserción | Alta | HU-09 |
| E9 | KAN-5 | Notificaciones | Media | HU-10 · reincorporada el 20-nov |
| E10 | KAN-6 | Moderación | Baja | HU-11 |

> **Diez épicas, una capacidad cada una.** La Fase 1 se entregó con seis épicas que agrupaban dos cosas
> cada una (por ejemplo, "Gestión de Usuarios y Perfiles"). Tras la observación de la evaluación se
> dividieron el 4 de octubre de 2026 en los documentos de `fase-1-definicion/docs/` y en Jira.

---

## 4. Historias de Usuario

**Jira es la fuente de verdad de los criterios de aceptación.** Esta tabla es el índice; antes de
implementar una historia, lee su issue en Jira para tener los Gherkin completos y actualizados.

| HU | Jira | Épica | Título | MoSCoW | Pts | Sprint |
|----|------|-------|--------|--------|-----|--------|
| HU-01 | KAN-7 | E1 | Registro de agente libre | Must | 3 | 6 |
| HU-02 | KAN-8 | E2 | Perfil tipo carta de jugador | Should | 5 | 7 |
| HU-03 | KAN-9 | E3 | Publicar partido con cupos incompletos | Must | 5 | 6 |
| HU-04 | KAN-10 | E4 | Buscar partidos cercanos en el mapa | Must | 8 | 6 |
| HU-05 | KAN-11 | E5 | Postularme a un partido | Must | 3 | 6 |
| HU-06 | KAN-12 | E6 | Calificar compañeros post-partido | Must | 5 | 7 |
| HU-07 | KAN-13 | E6 | Cálculo automático de puntaje de honor | Should | 5 | 7 |
| HU-08 | KAN-14 | E7 | Reserva con pago fraccionado | Must | 8 | 7 |
| HU-09 | KAN-15 | E8 | Retención por deserción | Should | 5 | 7 |
| HU-10 | KAN-16 | E9 | Avisos de partidos cercanos y de "Falta uno" | Should | 8 | 8 |
| HU-11 | KAN-17 | E10 | Moderar reportes de usuarios | Won't (esta fase) | 5 | Backlog |
| HU-12 | KAN-45 | E7 | Pagar con tarjeta inscrita y cubrir al invitado dentro de la app | Won't (esta fase) | 8 | Backlog |

**Total del MVP: 55 puntos.** HU-01 a HU-09 (47 puntos) quedaron terminadas al 8 de noviembre de 2026
(Sprint 7); HU-10 (8 puntos) se reincorporó el 20 de noviembre y su parte dentro de la app se hizo en el
Sprint 8. El push con la app cerrada es la tarea **KAN-42**, después del despliegue.
La columna Sprint refleja la replanificación del 20 de noviembre de 2026, vigente en Jira. Además,
la tarea **KAN-30** implementó la regla "Partidos jugados" (registro de asistencia), que ninguna
historia cubría; **KAN-31** corrigió los defectos de la auditoría de cierre del 14 de noviembre
(`fase-2-desarrollo/docs/05-auditoria-cierre.md`), **KAN-32** agregó el rechazo de postulaciones y
**KAN-37** el botón "Falta uno", que deja en el mapa solo los partidos urgentes. **KAN-33** rediseñó la
interfaz y **KAN-38** dibuja el límite real de La Florida, ofrece canchas existentes al publicar y
completa la dirección; **KAN-40** reemplazó esa lista por 36 canchas investigadas que se eligen
como pines en el mapa, y **KAN-41** agregó el "Falta uno" destacado: el invitado entra gratis. **KAN-43** puso una cuenta atrás en
las cartas y verificó con foto satelital qué deportes admite de verdad cada cancha. **KAN-44** dejó
la entrada gratis solo para cuando falta 1 jugador y avisa a los confirmados cuánto pone cada uno;
cobrar esa cuota dentro de la app con tarjeta inscrita (Oneclick) es HU-12, en el backlog.

### Reglas de negocio transversales (aplican a varias HU)

```
Honor inicial     Un usuario recién registrado tiene honorScore = NULL, nunca 0.
                  La UI muestra "Sin calificaciones aún". Un novato no es un mal jugador.
                  (HU-01 + HU-02)

Cálculo de honor  Promedio de tres señales en escala 0–10, redondeado a 1 decimal: asistencia
                  (asistió / asistió + no se presentó), puntualidad y juego limpio (estas dos, de
                  las últimas 20 reseñas recibidas). Solo cuentan las señales que existen. Se
                  recalcula al guardar cada reseña y al registrar cada asistencia. (HU-07)

Ventana de reseña Tras finalizar un partido hay 48 h para calificar. Cumplido el plazo, el partido
                  se archiva sin calificación y ya no admite reseñas. (HU-06)

Doble calificación Un jugador solo puede calificar una vez a cada compañero por partido.
                  Restricción única en base de datos, no solo validación en el servicio. (HU-06)

Pago fraccionado  amountDue = ceil(totalCost / totalSlots) · comisión = 10% de amountDue.
                  Montos en CLP como enteros. Nunca punto flotante para dinero. (HU-08)

Retención         Cancela a menos de 12 h del inicio → se retiene el 50%, el resto se reembolsa.
                  Cancela con 12 h o más → reembolso del 100%. (HU-09)

Sobreventa        Aprobar una participación incrementa filledSlots dentro de una transacción con
                  bloqueo de fila. Dos jugadores nunca pueden tomar el mismo último cupo. (HU-05)

Rechazo           El organizador puede rechazar una postulación pendiente: queda REJECTED, no
                  ocupa cupo y el jugador puede volver a postular. (KAN-32)

Volver a postular Quien perdió el cupo sin pagar (pago fallido, cancelación o rechazo) puede
                  postular de nuevo. Quien canceló un cupo ya pagado no vuelve a ese partido:
                  su pago conserva el reembolso y la retención. (HU-09)

Un solo puntaje   honorScore en escala 0–10 es el ÚNICO número de reputación. El mockup de Fase 1
                  mostraba también un "rating 4.8" en escala 1–5: se elimina por redundante.

Nivel del partido Todo partido declara level (PRINCIPIANTE | MEDIO | AVANZADO). Se muestra en la
                  carta de partido y es filtrable en el mapa.

Falta uno urgente Un partido es urgente si le falta exactamente 1 jugador y empieza en 2 h o menos
                  (URGENT_WINDOW_HOURS). El botón "Falta uno" del mapa muestra solo esos. Lo decide
                  la API, no la pantalla. (KAN-37)

Comuna del piloto El mapa dibuja el límite real de La Florida (OpenStreetMap). Al publicar se elige
                  una de las 36 canchas investigadas tocando su pin (públicas, municipales y privadas;
                  un "$" marca las que se arriendan) o se marca un punto dentro de la comuna, y la
                  dirección se completa sola. Lo valida la app: la API aún acepta cualquier
                  coordenada. (KAN-38, KAN-40)

Falta uno         Si a un partido le falta 1 jugador y empieza en 2 h o menos, el organizador puede
destacado         destacarlo: va primero en "Falta uno" para los jugadores cercanos y quien se une
                  entra gratis, como invitado: al tiro si su honor es 7 o más; si es novato o tiene
                  menos, queda pendiente y lo aprueba el organizador. Si faltan 2 o más no hay entrada
                  gratis: quien entra paga su parte. La cuota del invitado la cubre el grupo fuera de
                  la app: al destacar, cada confirmado recibe cuánto pone, y Kancha no cobra comisión
                  por ese cupo. El aviso "¿Lo destacas?" llega dentro de la app. Cobrar la cuota en la
                  app con tarjeta inscrita es HU-12. (KAN-41, KAN-44)

Avisos            Cada usuario elige qué avisos acepta; sin elegir, ninguno. "Falta uno" (partido
                  urgente o destacado dentro de su radio y deportes) es el prioritario: va primero y
                  destacado sobre el mapa mientras su partido siga abierto, y lo decide la API.
                  "Partidos cerca" llega al publicarse uno de sus deportes en sus días y horario, en
                  hora de Chile. El organizador recibe quién pide entrar y el "¿Lo destacas?"; el
                  jugador, su aprobación; los confirmados de un destacado, cuánto pone cada uno por
                  el invitado (llega aunque no hayan elegido avisos: es dinero, KAN-44).
                  "Ánimo para jugar": a quien lleva 14 días sin postular ni
                  organizar y tiene partidos cerca, a lo más uno por semana. Disparadores por reglas,
                  sin IA, costo $0. UNIQUE (userId, kind, matchId) impide repetir un aviso. (HU-10)

Partidos jugados  matchesPlayed se incrementa al cerrar una participación como asistida. Se muestra
                  en la carta de jugador. Al terminar el partido, el organizador marca a cada
                  confirmado como "asistió" o "no se presentó" (NO_SHOW), una sola vez; la tasa
                  de asistencia del honor sale de ese registro. (KAN-30)
```

---

## 5. Roadmap — 9 sprints

Las fechas coinciden con los sprints reales del tablero Jira (board 2).

| Sprint | Fechas | Contenido | Fase |
|--------|--------|-----------|------|
| 1 | 10–23 ago 2026 | Definición APT | Fase 1 |
| 2 | 24–31 ago 2026 | Formulación Guía 1 | Fase 1 |
| 3 | 01–14 sep 2026 | Hecho: modelo de datos, UML y esqueleto del repo (KAN-22) | Fase 2 |
| 4 | 15–28 sep 2026 | Hecho: ambiente de desarrollo, repositorio público, Docker y CI (KAN-24). HU-01 y HU-03 no se iniciaron | Fase 2 |
| 5 | 29 sep–12 oct 2026 | Sin incremento de producto (impedimento laboral) · documentación de la Fase 2 (KAN-23) | Fase 2 |
| 6 | 13–26 oct 2026 | Hecho: HU-01, HU-03, HU-04, HU-05 — registro, publicación, búsqueda en el mapa y postulación | Fase 2 |
| 7 | 27 oct–09 nov 2026 | Hecho: HU-08, HU-09 — pago fraccionado y retención · adelantadas HU-02, HU-06, HU-07 — carta, calificación y honor · KAN-29 (Expo SDK 58) · KAN-30 (asistencia) | Fase 2 |
| 8 | 10–23 nov 2026 | Hecho: auditoría de cierre y sus correcciones (KAN-31) · rechazo de postulaciones (KAN-32) · botón "Falta uno" (KAN-37) · rediseño visual (KAN-33) · límite real de la comuna, canchas existentes y dirección automática (KAN-38) · pruebas de rendimiento (KAN-35) · `main` al día (KAN-36) · panel de partidos deslizable (KAN-39) · canchas como pines al publicar (KAN-40) · "Falta uno" destacado, con el invitado verificado por su honor (KAN-41) · avisos dentro de la app (HU-10, KAN-16) · cuenta atrás en las cartas y equipamiento real de las canchas (KAN-43) · invitado gratis solo si falta 1, con aviso a los confirmados (KAN-44) · Kancha en la nube: API y web en Render, base en Supabase (KAN-34) · pendiente: documentación (KAN-23), tags y releases (KAN-36) y prueba en iPhone y Android (KAN-29) | Fase 3 |
| 9 | 24 nov–07 dic 2026 | Push en Android con la app compilada (KAN-42) · cierre de pruebas C1 · README final, video de respaldo, ensayo y defensa ante la comisión | Fase 3 |

> **Replanificación del 27 de septiembre de 2026.** El Sprint 4 cerró con 0 de 8 puntos: se usó en
> dejar operativo el ambiente. Las historias se corrieron un sprint y el desarrollo ahora llega hasta
> el Sprint 9. **El plan quedó sin holgura:** los sprints 8 y 9 combinan desarrollo, despliegue y
> defensa. HU-10 es *Could* y es la primera candidata a salir del alcance si un sprint se atrasa.
> El registro de cada sprint está en `fase-2-desarrollo/docs/scrum/`.
>
> **Replanificación del 16 de octubre de 2026.** El Sprint 5 cerró sin incremento por la carga laboral
> de la práctica. HU-01 y HU-03 pasaron al Sprint 6, que reúne el recorrido central de la demo.
>
> **Replanificación del 8 de noviembre de 2026.** HU-02, HU-06 y HU-07 se terminaron dentro del Sprint 7
> y se movieron a ese sprint en Jira. HU-10 salió del alcance (*Won't* en esta fase), como estaba
> previsto si el plan se atrasaba: con Expo Go las notificaciones push tienen límites y el tiempo rinde
> más en desplegar, medir rendimiento y preparar la defensa. El MVP cierra con 9 historias y 47 puntos.
>
> **Replanificación del 20 de noviembre de 2026.** El autor reincorporó HU-10: sin avisos, el "Falta uno"
> depende de que el jugador abra la app justo a tiempo. Se reescribió (avisos que el usuario elige, con
> "Falta uno" como prioritario) y se estimó en 8 puntos. Para no arriesgar el despliegue se partió en dos:
> los avisos dentro de la app y sus disparadores en el Sprint 8 (KAN-16), y el push en Android en el
> Sprint 9 (KAN-42), porque exige compilar la app con la cuenta gratuita de Expo. El push en iPhone queda
> fuera: requiere la cuenta de desarrollador de Apple, que no es gratis. El MVP suma 10 historias y 55 puntos.

---

## 6. Convenciones de trabajo

### Commits

Conventional Commits, **siempre referenciando la HU o el issue de Jira**:

```
feat(matches): add PostGIS radius search endpoint (HU-04, KAN-10)
fix(ratings): prevent double rating on same match (HU-06, KAN-12)
test(honor): add weighted average unit tests (HU-07, KAN-13)
docs(readme): add docker setup instructions
chore(ci): add postgis service to github actions
refactor(payments): extract retention logic to service
```

### Ramas

```
main              producción · protegida · solo merge vía Pull Request con CI en verde
develop           integración
feat/KAN-10-mapa  una rama por historia, nombrada con su issue de Jira
fix/...           correcciones
```

### Definición de Terminado

La DoD completa está en `DESARROLLO.md` §13. En resumen: código tipado sin `any`, pruebas unitarias
y de integración pasando, endpoint documentado en OpenAPI, UI conforme a `DESIGN.md`, funciona en web
y en móvil, `docker compose up` sigue levantando, CI en verde, issue cerrado en Jira, evidencia en `fase-2-desarrollo/docs/evidencias/`.

### Estilo

```
Backend    ESLint + Prettier · TypeScript strict · async/await · lógica de negocio solo en services/
Frontend   tokens de DESIGN.md (nunca colores hardcodeados) · componentes funcionales + hooks ·
           sin lógica de negocio en componentes
```

---

## 7. Competencias del perfil de egreso

| Código | Competencia | Dónde se evidencia |
|--------|-------------|--------------------|
| C1 | Pruebas de certificación | `fase-2-desarrollo/docs/04-plan-pruebas.md` y suite de pruebas · `fase-2-desarrollo/docs/evidencias/` |
| C2 | Gestión de proyectos informáticos | Jira · documentos por sprint en `fase-2-desarrollo/docs/scrum/` · releases fechados |
| C3 | Modelos de datos escalables | `fase-2-desarrollo/docs/01-modelo-datos.md`: modelo normalizado con PostGIS, migraciones Prisma, índice GIST |
| C4 | Desarrollo de solución de software | API REST + app Expo, empaquetado en Docker · `fase-2-desarrollo/docs/03-arquitectura.md` |

---

## 8. Reglas que ninguna herramienta puede relajar

Este proyecto usa **ponytail** para evitar sobre-ingeniería, y su criterio por defecto es escribir el
mínimo código posible. Es la política correcta salvo en los puntos siguientes, donde la estructura
**es** el entregable evaluado y no debe colapsarse aunque parezca código de más:

1. **Las capas del backend se mantienen separadas** — `routes → controllers → services → repositories`.
   Aunque un endpoint sea trivial, no se fusiona la ruta con el acceso a datos. Esta separación es la
   evidencia de la competencia C4 y el motivo por el que la lógica de negocio es testeable sin HTTP.
2. **Toda historia lleva pruebas** — al menos una unitaria y una de integración, aunque el código
   parezca demasiado simple para fallar. La suite de pruebas es la evidencia de C1; no es opcional
   ni "código innecesario".
3. **Las validaciones con Zod no se omiten** — ni siquiera en endpoints internos. Son parte del
   contrato documentado en OpenAPI.
4. **Las restricciones de la base de datos no se reemplazan por validación en el servicio.**
   `UNIQUE (matchId, userId)` y `UNIQUE (matchId, raterId, ratedId)` existen porque la validación en
   aplicación falla bajo concurrencia. Son evidencia de C3.
5. **Los tokens de `DESIGN.md` no se sustituyen por valores literales** por brevedad.
6. **La documentación de `fase-2-desarrollo/docs/` se actualiza junto al código**, no al final de la fase.

Si una herramienta o un agente propone eliminar algo de esta lista por considerarlo innecesario,
la respuesta es no, y la razón es que el proyecto se evalúa por su estructura, no solo por su
funcionamiento.

---

## 9. Cómo trabajar en este proyecto

1. **Antes de implementar:** lee el issue en Jira y el capítulo correspondiente de `DESARROLLO.md`.
2. **Antes de tocar UI:** lee `DESIGN.md`. Fondo oscuro, naranja solo para acción, los tres deportes iguales.
3. **Al terminar:** commit con referencia al issue, PR a `develop`, CI en verde, cerrar en Jira.
4. **Si algo contradice a otra cosa:** detente y pregunta. No resuelvas contradicciones por tu cuenta.
5. **Si cambias el modelo de datos:** actualiza también `fase-2-desarrollo/docs/` (modelo de datos y `diagramas/`). Van juntos.
6. **Si cambias el plan en Jira:** actualiza en el mismo commit el roadmap de este archivo, `DESARROLLO.md` §11 y el `README.md`.

---

*Portafolio de Título — Ingeniería en Informática · Sede Plaza Vespucio · Lukas Guerrero · 2026*
*Última actualización: 21 de noviembre de 2026 (Sprint 8)*
