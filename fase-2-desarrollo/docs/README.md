# Documentación de la Fase 2 — Kancha

Índice de los documentos de la Fase 2, ordenado según el listado de documentos de la asignatura
(metodología ágil). Estado al 8 de noviembre de 2026.

## Evidencias técnicas

| Documento pedido | Dónde está | Estado |
|---|---|---|
| Diagrama de Arquitectura: componentes | [03-arquitectura.md](03-arquitectura.md#1-diagrama-de-componentes) | Listo · actualizado al 8-nov |
| Diagrama de Arquitectura: despliegue | [03-arquitectura.md](03-arquitectura.md#2-diagrama-de-despliegue) | Listo · la nube se despliega en el Sprint 8 |
| Modelo relacional normalizado | [01-modelo-datos.md](01-modelo-datos.md) · normalización en la [sección 6](01-modelo-datos.md#6-normalización) | Listo · cuatro migraciones |
| Diagrama de clases | [02-diagramas-uml.md](02-diagramas-uml.md#7-diagrama-de-clases--modelo-de-dominio), secciones 7 y 8 | Listo · corresponde al código del 8-nov |
| Diagramas de secuencia de las funcionalidades principales | [02-diagramas-uml.md](02-diagramas-uml.md), secciones 2, 3 y 4 | Listo · búsqueda, pago y honor como quedaron implementados |
| Plan de pruebas (unitarias, caja negra, integración, rendimiento, seguridad) | [04-plan-pruebas.md](04-plan-pruebas.md) | 138 pruebas del backend y 19 de la app, todas pasan · cobertura del 98 % · rendimiento en el Sprint 8 |

Además: diagrama de casos de uso y diagrama de estados del partido en
[02-diagramas-uml.md](02-diagramas-uml.md), y diccionario de datos en
[01-modelo-datos.md](01-modelo-datos.md).

## Documentos de cada sprint

Sprint Planning, Sprint Backlog, Scrumboard, Burndown Chart, Daily Meeting, registro de impedimentos,
Release, Review y Retrospective están reunidos en un documento por sprint.

| Sprint | Fechas | Documento | Estado |
|---|---|---|---|
| 3 | 1 – 14 sep 2026 | [scrum/sprint-03.md](scrum/sprint-03.md) | Cerrado |
| 4 | 15 – 28 sep 2026 | [scrum/sprint-04.md](scrum/sprint-04.md) | Cerrado |
| 5 | 29 sep – 12 oct 2026 | [scrum/sprint-05.md](scrum/sprint-05.md) | Cerrado |
| 6 | 13 – 26 oct 2026 | [scrum/sprint-06.md](scrum/sprint-06.md) | Cerrado |
| 7 | 27 oct – 9 nov 2026 | [scrum/sprint-07.md](scrum/sprint-07.md) | En curso · cierra el 9 de noviembre |

Resumen, velocidad y planificación de los sprints siguientes: [scrum/README.md](scrum/README.md).

## Carpetas

| Carpeta | Contenido |
|---|---|
| `diagramas/` | Fuente editable (`.mmd`) y PNG de cada diagrama. Los `.mmd` son idénticos a los bloques Mermaid de los documentos |
| `diagramas/arquitectura/` | Versiones interactivas en HTML de los diagramas de arquitectura |
| `scrum/` | Documentos por sprint y sus gráficos de burndown |
| `evidencias/` | Capturas de la app, comprobantes de Transbank y resultados de pruebas, por sprint |
