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
| Documentación académica entregada | `fase-1-definicion/`, `fase-2-desarrollo/docs/`, `fase-3-implementacion/` |

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
- **Mapa interactivo** con pines filtrables por deporte, horario y radio
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
Móvil y web   Expo SDK 52 (React Native 0.76) + TypeScript · un código para Android, iOS y web
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

| ID | Jira | Épica | Prioridad |
|----|------|-------|-----------|
| E1 | KAN-1 | Gestión de Usuarios y Perfiles | Alta |
| E2 | KAN-2 | Publicación y Búsqueda Geolocalizada | Alta |
| E3 | KAN-3 | Sistema de Honor y Reputación | Alta |
| E4 | KAN-4 | Reservas y Pagos Fraccionados | Alta |
| E5 | KAN-5 | Comunicación y Notificaciones | Media |
| E6 | KAN-6 | Administración y Backoffice | Baja |

---

## 4. Historias de Usuario

**Jira es la fuente de verdad de los criterios de aceptación.** Esta tabla es el índice; antes de
implementar una historia, lee su issue en Jira para tener los Gherkin completos y actualizados.

| HU | Jira | Título | MoSCoW | Pts | Sprint |
|----|------|--------|--------|-----|--------|
| HU-01 | KAN-7 | Registro de agente libre | Must | 3 | 4 |
| HU-02 | KAN-8 | Perfil tipo carta de jugador | Should | 5 | 6 |
| HU-03 | KAN-9 | Publicar partido con cupos incompletos | Must | 5 | 4 |
| HU-04 | KAN-10 | Buscar partidos cercanos en el mapa | Must | 8 | 6 |
| HU-05 | KAN-11 | Postularme a un partido | Must | 3 | 6 |
| HU-06 | KAN-12 | Calificar compañeros post-partido | Must | 5 | 5 |
| HU-07 | KAN-13 | Cálculo automático de puntaje de honor | Should | 5 | 5 |
| HU-08 | KAN-14 | Reserva con pago fraccionado | Must | 8 | 5 |
| HU-09 | KAN-15 | Retención por deserción | Should | 5 | 5 |
| HU-10 | KAN-16 | Notificación de cupo disponible | Could | 3 | 7 |
| HU-11 | KAN-17 | Moderar reportes de usuarios | Won't (esta fase) | 5 | Backlog |

**Total comprometido MVP (HU-01 a HU-10): 50 puntos en 4 sprints de desarrollo.**

### Reglas de negocio transversales (aplican a varias HU)

```
Honor inicial     Un usuario recién registrado tiene honorScore = NULL, nunca 0.
                  La UI muestra "Sin calificaciones aún". Un novato no es un mal jugador.
                  (HU-01 + HU-02)

Cálculo de honor  Promedio ponderado de las últimas 20 calificaciones: (puntualidad + conducta) / 2,
                  redondeado a 1 decimal. Se recalcula al guardar cada reseña. (HU-07)

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

Un solo puntaje   honorScore en escala 0–10 es el ÚNICO número de reputación. El mockup de Fase 1
                  mostraba también un "rating 4.8" en escala 1–5: se elimina por redundante.

Nivel del partido Todo partido declara level (PRINCIPIANTE | MEDIO | AVANZADO). Se muestra en la
                  carta de partido y es filtrable en el mapa.

Partidos jugados  matchesPlayed se incrementa al cerrar una participación como asistida. Se muestra
                  en la carta de jugador.
```

---

## 5. Roadmap — 9 sprints

Las fechas coinciden con los sprints reales del tablero Jira (board 2).

| Sprint | Fechas | Contenido | Fase |
|--------|--------|-----------|------|
| 1 | 10–23 ago 2026 | Definición APT | Fase 1 |
| 2 | 24–31 ago 2026 | Formulación Guía 1 | Fase 1 |
| 3 | 01–14 sep 2026 | Modelo de datos, UML y scaffolding del repo (KAN-22) | Fase 2 |
| 4 | 15–28 sep 2026 | HU-01, HU-03 — auth, registro, publicación de partidos | Fase 2 |
| 5 | 29 sep–12 oct 2026 | HU-06, HU-07, HU-08, HU-09 — honor y pagos | Fase 2 |
| 6 | 13–26 oct 2026 | HU-02, HU-04, HU-05 — frontend, mapa, postulación | Fase 2 |
| 7 | 27 oct–09 nov 2026 | HU-10 + cierre de pruebas C1 + Docker final | Fase 2 |
| 8 | 10–23 nov 2026 | Despliegue, README, video de respaldo | Fase 3 |
| 9 | 24 nov–07 dic 2026 | Ensayo y defensa ante la comisión | Fase 3 |

> El Sprint 5 concentra la lógica más difícil y menos vistosa. Si se atrasa, comprime el Sprint 6 y
> la demo llega vacía. Es el sprint que hay que proteger.

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
| C1 | Pruebas de certificación | Plan y suite de pruebas del Sprint 7 · `fase-2-desarrollo/docs/evidencias/` |
| C2 | Gestión de proyectos informáticos | Jira + GitHub Projects + 9 releases fechados |
| C3 | Modelos de datos escalables | Modelo ER con PostGIS, migraciones Prisma, índice GIST |
| C4 | Desarrollo de solución de software | API REST + app Expo, empaquetado en Docker |

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

---

*Portafolio de Título — Ingeniería en Informática · Sede Plaza Vespucio · Lukas Guerrero · 2026*
*Última actualización: 27 de septiembre de 2026 (Sprint 4)*
