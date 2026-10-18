# Sprint 5 — Registro y publicación de partidos

> 29 de septiembre al 12 de octubre de 2026 · Fase 2 · **Sprint cerrado**
> Documento abierto el 4 de octubre (día 6 de 14) y cerrado el 16 de octubre de 2026.

---

## 1. Sprint Planning

**Objetivo del sprint.** Primer incremento funcional del backend: un jugador se registra, inicia
sesión y publica un partido.

| Dato | Valor |
|---|---|
| Duración | 14 días (29 de septiembre – 12 de octubre) |
| Equipo | Lukas Guerrero, desarrollador único |
| Compromiso | 8 puntos de historia y una tarea de setup |

## 2. Sprint Backlog

| Issue | Tipo | Título | Prioridad | Puntos | Estado |
|---|---|---|---|---|---|
| [KAN-7](https://lukasguerrerokancha.atlassian.net/browse/KAN-7) | Historia | HU-01 — Registro de agente libre | Must | 3 | Por hacer |
| [KAN-9](https://lukasguerrerokancha.atlassian.net/browse/KAN-9) | Historia | HU-03 — Publicar partido con cupos incompletos | Must | 5 | Por hacer |
| [KAN-24](https://lukasguerrerokancha.atlassian.net/browse/KAN-24) | Tarea | Setup del ambiente: repo GitHub, Docker, CI y reorganización en fases | Must | — | Listo |

Desglose técnico de las historias:

| Historia | Tareas |
|---|---|
| HU-01 | `POST /auth/register` y `POST /auth/login` · hash bcrypt · emisión de JWT · esquemas Zod · pruebas CN-01 a CN-03 e I-02 |
| HU-03 | `POST /matches` con ubicación PostGIS · validación de fecha y cupos · pruebas CN-04 a CN-06 e I-03 |

## 3. Scrumboard

Estado del tablero al cierre (12 de octubre):

| Por hacer | En curso | Listo |
|---|---|---|
| KAN-7 · HU-01 (movida al Sprint 6) | KAN-23 · Documentación Fase 2 (movida al Sprint 6) | KAN-24 · Setup del ambiente |
| KAN-9 · HU-03 (movida al Sprint 6) | | |

## 4. Burndown Chart

![Burndown del Sprint 5](img/burndown-sprint-05.png)

El sprint cerró sin quemar puntos: las dos historias no se terminaron dentro del plazo.

## 5. Daily Meeting

Desde este sprint el registro se lleva día a día, con las tres preguntas de la daily.

| Fecha | Qué hice | Qué haré | Impedimentos |
|---|---|---|---|
| 3 oct | Sincronicé el repositorio. Apareció la rama `DiegoGarcesM-patch-1` (Pull Request #1, de un tercero) | — | — |
| 4 oct | Documentación de la Fase 2: arquitectura, diagramas de clases, normalización, plan de pruebas y documentos de sprint. Ejecución de las 22 pruebas unitarias. División de las épicas de 6 a 10 tras la observación de la Fase 1 (Word, Excel y Jira). Orden del repositorio en `entrega/` y `docs/` por fase | Commit y push de la documentación. Iniciar HU-01 | La documentación desplazó el inicio de HU-01 |

| 5–12 oct | Sin avance en el proyecto | — | Carga laboral de la práctica profesional (IMP-09) |

Entre el 29 de septiembre y el 2 de octubre no hay registro de actividad.

## 6. Registro de impedimentos

| ID | Impedimento | Efecto | Estado |
|---|---|---|---|
| IMP-06 | Trabajo concentrado en pocos días | Seis días de sprint sin avance en las historias | Abierto |
| IMP-01 | El Sprint 5 no está iniciado en Jira y el Sprint 2 sigue como activo | Sin métricas automáticas | Abierto |
| IMP-07 | La documentación de la Fase 2 (KAN-23) estaba pendiente desde el Sprint 3 | Ocupó tiempo del sprint | En resolución el 4-oct |
| IMP-08 | Con cobertura activada, el umbral global de pruebas falla (DEF-01 del plan de pruebas) | Bloquearía el CI si se activa la cobertura | Resuelto el 16-oct: cobertura de `services/` y `utils/` en 97 % |
| IMP-09 | Carga laboral de la práctica profesional entre el 5 y el 12 de octubre | Ocho días sin trabajo en el proyecto; las historias no se iniciaron | Registrado. Se arrastra al Sprint 6 |

## 7. Release

Sin release: no hubo incremento de producto. La documentación de la Fase 2 quedó en el repositorio
como parte del trabajo de KAN-23.

## 8. Sprint Review

| Comprometido | Resultado |
|---|---|
| HU-01 — Registro de agente libre (3 pts) | No terminada, pasa al Sprint 6 |
| HU-03 — Publicar partido (5 pts) | No terminada, pasa al Sprint 6 |
| KAN-24 — Setup del ambiente | Entregada |
| KAN-23 — Documentación de la Fase 2 | Avanzada (arquitectura, UML, modelo de datos, plan de pruebas y documentos de sprint); sigue en el Sprint 6 |

**Velocidad del sprint: 0 de 8 puntos.**

## 9. Sprint Retrospective

| Qué funcionó | Qué no funcionó | Acción |
|---|---|---|
| La documentación de la Fase 2 quedó ordenada y alineada con Jira | Por tercer sprint seguido no se terminó ninguna historia | Entregar historias completas (API, pantalla y pruebas) en vez de capas sueltas |
| El impedimento laboral se registró en vez de ocultarse | Ocho días sin avance por la práctica profesional | Concentrar el desarrollo en bloques de fin de semana y dejar la documentación para días cortos |
| — | El tablero de Jira siguió sin iniciar ni cerrar sprints (IMP-01) | Cerrar los sprints 2 a 5 en Jira e iniciar el 6 con su meta |

**Decisión.** HU-01 y HU-03 pasan al Sprint 6 junto con HU-04 y HU-05. Para recuperar el atraso, el
Sprint 6 apunta a las cuatro historias del recorrido central de la demo: registrarse, publicar,
buscar en el mapa y postular.

---

*Kancha · Portafolio de Título · Lukas Guerrero*
