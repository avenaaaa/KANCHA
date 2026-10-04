# Kancha

[![CI](https://github.com/avenaaaa/KANCHA/actions/workflows/ci.yml/badge.svg)](https://github.com/avenaaaa/KANCHA/actions/workflows/ci.yml)

**Juega. Conecta. Vive Mejor.**

Plataforma web y móvil geolocalizada que conecta a jugadores sin equipo ("agentes libres") con partidos amateur a los que les falta gente, en la comuna de La Florida. Incluye un Sistema de Honor con reputación entre jugadores y pago fraccionado del arriendo con Transbank.

Proyecto de Título · Ingeniería en Informática · Duoc UC Sede Plaza Vespucio · Lukas Guerrero · 2026

## Cómo levantarlo

Requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/avenaaaa/KANCHA.git
cd KANCHA
docker compose up --build
```

| Dirección | Qué hay |
|---|---|
| http://localhost:8080 | La app Kancha (versión web) |
| http://localhost:3000/api/docs | Documentación de la API (Swagger) — disponible al cierre del Sprint 5 |
| http://localhost:3000/api/v1/health | Estado de la API y la base de datos |

## Estructura del repositorio

Una carpeta por cada fase del Portafolio de Título.

| Carpeta | Contenido | Estado |
|---|---|---|
| [`fase-1-definicion/`](fase-1-definicion/) | Definición del proyecto: documento consolidado, los diez documentos ágiles, Excel y diagramas | ✅ Entregada · agosto 2026 |
| [`fase-2-desarrollo/`](fase-2-desarrollo/) | La aplicación: `backend/` (API), `mobile/` (app Expo) y [`docs/`](fase-2-desarrollo/docs/) (arquitectura, modelo de datos, UML, plan de pruebas y documentos de cada sprint) | 🔄 En curso · Sprints 3 a 7 |
| [`fase-3-implementacion/`](fase-3-implementacion/) | Últimas historias, despliegue, pruebas finales y cierre | ⏳ Sprints 8 y 9 · nov–dic 2026 |

Cada fase se ordena igual: `entrega/` reúne lo que se presenta en la evaluación (guía de la asignatura,
documentos individuales y presentación) y `docs/` reúne los documentos de la fase.

## Stack

Expo (React Native) · Node.js + Express · PostgreSQL + PostGIS · Prisma · Docker · GitHub Actions · Transbank Webpay (integración)

Metodología: Scrum en sprints de 2 semanas, gestionado en Jira.
