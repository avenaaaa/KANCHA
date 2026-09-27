# Kancha

**Juega. Conecta. Vive Mejor.**

Plataforma web y móvil geolocalizada que conecta a jugadores sin equipo ("agentes libres") con partidos amateur a los que les falta gente, en la comuna de La Florida. Incluye un Sistema de Honor con reputación entre jugadores y pago fraccionado del arriendo con Transbank.

Proyecto de Título · Ingeniería en Informática · Duoc UC Sede Plaza Vespucio · Lukas Guerrero · 2026

## Cómo levantarlo

Requisito: [Docker Desktop](https://www.docker.com/products/docker-desktop/).

```bash
git clone https://github.com/USUARIO/kancha.git
cd kancha
docker compose up --build
```

| Dirección | Qué hay |
|---|---|
| http://localhost:8080 | La app Kancha (versión web) |
| http://localhost:3000/api/docs | Documentación de la API (Swagger) |
| http://localhost:3000/api/v1/health | Estado de la API y la base de datos |

## Estructura del repositorio

| Carpeta | Contenido |
|---|---|
| [`fase-1-definicion/`](fase-1-definicion/) | Definición del proyecto: documento consolidado, Excel ágiles y diagramas |
| [`fase-2-desarrollo/`](fase-2-desarrollo/) | La aplicación: `backend/` (API), `mobile/` (app Expo) y `docs/` (modelo de datos, UML, evidencias) |
| [`fase-3-implementacion/`](fase-3-implementacion/) | Despliegue, pruebas finales y cierre |

## Stack

Expo (React Native) · Node.js + Express · PostgreSQL + PostGIS · Prisma · Docker · GitHub Actions · Transbank Webpay (integración)

Metodología: Scrum en sprints de 2 semanas, gestionado en Jira.
